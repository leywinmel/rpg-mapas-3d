// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createEmptyDocument, type MapDocument } from '@/domain';
import { setLogSink } from '@/lib/logger';
import type { AssetsService } from '../services/assets-service';
import type { MapsService } from '../services/maps-service';
import { MapEditorServicesProvider } from '../services/MapEditorServicesProvider';
import type { MapRecord, MapSummary, RoomChange } from '../types';
import { MapWorkspace } from './MapWorkspace';
import type { MapViewportProps } from './MapViewport';

// A cena 3D (WebGL) não roda no jsdom: no lugar dela, um marcador com o que ela receberia.
vi.mock('./MapViewport', () => ({
  default: ({ label, editor }: MapViewportProps) => (
    <div data-testid="viewport" data-tool={editor?.view.tool ?? 'none'}>
      {label}
    </div>
  ),
}));
// As miniaturas também usam WebGL.
vi.mock('./PieceThumbnail', () => ({ PieceThumbnail: () => <span /> }));

/** A máquina de testes é lenta e a cena entra por import dinâmico: dá mais folga à espera. */
const SLOW = { timeout: 5000 };

const ROOM_ID = 'room-1';
const SIZE = { width: 6, depth: 4 };

function record(id: string, name: string, sortOrder: number): MapRecord {
  return {
    id,
    name,
    ...SIZE,
    sortOrder,
    updatedAt: '2026-11-01T00:00:00Z',
    document: createEmptyDocument(SIZE),
  };
}

function toSummary({ id, name, width, depth, sortOrder, updatedAt }: MapRecord): MapSummary {
  return { id, name, width, depth, sortOrder, updatedAt };
}

/** Banco em memória com o mesmo contrato do serviço real. */
function createFakeServices(initial: { activeMapId: string | null; maps: MapRecord[] }) {
  const db = { activeMapId: initial.activeMapId, maps: [...initial.maps] };
  let listener: ((change: RoomChange) => void) | null = null;
  const saved: MapDocument[] = [];
  const maps: MapsService = {
    loadRoomMaps: async () => ({
      activeMapId: db.activeMapId,
      maps: db.maps.map(toSummary),
    }),
    loadMap: async (id) => {
      const found = db.maps.find((map) => map.id === id);
      if (!found) throw new Error('não achou');
      return found;
    },
    createMap: async (input) => {
      const created = {
        ...record(`map-${db.maps.length + 1}`, input.name, input.sortOrder),
        width: input.width,
        depth: input.depth,
        document: input.document,
      };
      db.maps.push(created);
      return toSummary(created);
    },
    renameMap: async () => undefined,
    deleteMap: vi.fn(async () => {
      throw new Error('falha de rede');
    }),
    setActiveMap: async (_roomId, mapId) => {
      db.activeMapId = mapId;
    },
    saveDocument: async (_id, document) => {
      saved.push(document);
    },
    reorderMaps: async () => undefined,
    subscribeRoom: (_roomId, onChange) => {
      listener = onChange;
      return () => {
        listener = null;
      };
    },
  };
  const assets: AssetsService = {
    listMyAssets: async () => [],
    uploadModel: async () => {
      throw new Error('não usado');
    },
    deleteAsset: async () => undefined,
    signModelUrls: async () => ({}),
  };
  return {
    services: { maps, assets },
    db,
    saved,
    emit: (change: RoomChange) => act(() => listener?.(change)),
  };
}

function renderWorkspace(fake: ReturnType<typeof createFakeServices>, isGameMaster: boolean) {
  return render(
    <MapEditorServicesProvider services={fake.services}>
      <MapWorkspace roomId={ROOM_ID} isGameMaster={isGameMaster} />
    </MapEditorServicesProvider>,
  );
}

beforeAll(() => {
  // O jsdom não implementa o <dialog> modal.
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
  };
  setLogSink(() => undefined);
});

describe('MapWorkspace', () => {
  it('shouldTellThePlayerToWaitWhileNoMapIsShown', async () => {
    const fake = createFakeServices({ activeMapId: null, maps: [record('a', 'Cripta', 0)] });
    renderWorkspace(fake, false);
    expect(await screen.findByText('O mestre ainda não mostrou um mapa')).toBeInTheDocument();
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
  });

  it('shouldFollowTheActiveMapForThePlayerWithoutTools', async () => {
    const fake = createFakeServices({
      activeMapId: 'a',
      maps: [record('a', 'Cripta', 0), record('b', 'Floresta', 1)],
    });
    renderWorkspace(fake, false);
    const viewport = await screen.findByTestId('viewport', {}, SLOW);
    expect(viewport).toHaveTextContent('Mapa 3D: Cripta');
    expect(viewport).toHaveAttribute('data-tool', 'none');

    fake.db.activeMapId = 'b';
    fake.emit({ type: 'room' });
    await waitFor(() => expect(screen.getByTestId('viewport')).toHaveTextContent('Floresta'));
  });

  it('shouldSwitchToolsWithTheKeyboardInTheEditor', async () => {
    const fake = createFakeServices({ activeMapId: 'a', maps: [record('a', 'Cripta', 0)] });
    renderWorkspace(fake, true);
    expect(await screen.findByTestId('viewport', {}, SLOW)).toHaveAttribute('data-tool', 'select');
    fireEvent.keyDown(window, { key: 'e' });
    expect(screen.getByTestId('viewport')).toHaveAttribute('data-tool', 'erase');
    expect(screen.getByRole('button', { name: 'Apagar (E)' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('shouldValidateAndCreateANewMap', async () => {
    const fake = createFakeServices({ activeMapId: null, maps: [] });
    renderWorkspace(fake, true);
    fireEvent.click(await screen.findByRole('button', { name: 'Novo mapa' }));
    const dialog = screen.getByRole('dialog', { name: 'Novo mapa' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar mapa' }));
    expect(await within(dialog).findByText('Dê um nome ao mapa.')).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText('Nome'), { target: { value: 'Torre' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar mapa' }));
    expect(await screen.findByTestId('viewport', {}, SLOW)).toHaveTextContent('Mapa 3D: Torre');
    expect(fake.db.maps).toHaveLength(1);
  });

  it('shouldShowADeleteFailureInsideTheDialog', async () => {
    const fake = createFakeServices({ activeMapId: 'a', maps: [record('a', 'Cripta', 0)] });
    renderWorkspace(fake, true);
    fireEvent.click(await screen.findByRole('tab', { name: 'Mapas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apagar Cripta' }));
    const dialog = screen.getByRole('dialog', { name: 'Apagar mapa?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Apagar mapa' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Não conseguimos apagar o mapa',
    );
    expect(fake.services.maps.deleteMap).toHaveBeenCalledWith('a');
  });
});
