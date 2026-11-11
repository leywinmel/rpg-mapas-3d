// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { MapAsset } from '@/features/map-editor/types';
import { useTokensStore, type TokenActions } from '../hooks/tokens-store';
import { TokenFormDialog } from './TokenFormDialog';

vi.mock('@/features/rooms', () => ({ useRoomSession: () => ({ members: [] }) }));

const ASSET: MapAsset = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  name: 'Fera Vermelha',
  storagePath: 'u/b.glb',
  sizeBytes: 100,
  createdAt: '2026-11-11T00:00:00Z',
};
const UPLOADED: MapAsset = { ...ASSET, id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', name: 'Nova' };
/** Começo de um .glb de verdade: os bytes "glTF". */
const GLB_HEADER = new Uint8Array([0x67, 0x6c, 0x54, 0x46, 2, 0, 0, 0]);

function fakeActions(models: MapAsset[]) {
  return {
    createToken: vi.fn(async () => ({}) as never),
    listModels: vi.fn(async () => models),
    uploadModel: vi.fn(async () => UPLOADED),
  };
}

function renderDialog(actions: ReturnType<typeof fakeActions>) {
  useTokensStore.setState({ actions: actions as unknown as TokenActions });
  const onClose = vi.fn();
  render(<TokenFormDialog open onClose={onClose} />);
  fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Fera' } });
  fireEvent.click(screen.getByRole('radio', { name: 'Modelo enviado' }));
  return onClose;
}

beforeAll(() => {
  const proto = HTMLDialogElement.prototype;
  proto.showModal ??= function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  proto.close ??= function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
});

afterEach(() => useTokensStore.getState().reset());

describe('TokenFormDialog com modelo enviado', () => {
  it('shouldCreateTheTokenWithTheModelPickedFromTheLibrary', async () => {
    const actions = fakeActions([ASSET]);
    const onClose = renderDialog(actions);
    const select = await screen.findByLabelText('Modelo');
    fireEvent.change(select, { target: { value: ASSET.id } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar token' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(actions.createToken).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Fera', look: { kind: 'asset', assetId: ASSET.id } }),
    );
  });

  it('shouldAskForAModelBeforeCreating', async () => {
    const actions = fakeActions([ASSET]);
    renderDialog(actions);
    await screen.findByLabelText('Modelo');
    fireEvent.click(screen.getByRole('button', { name: 'Criar token' }));
    expect(await screen.findByText('Escolha ou envie o modelo do token.')).toBeTruthy();
    expect(actions.createToken).not.toHaveBeenCalled();
  });

  it('shouldUploadAGlbAndPickIt', async () => {
    const actions = fakeActions([]);
    renderDialog(actions);
    expect(await screen.findByText(/ainda não enviou nenhum modelo/)).toBeTruthy();
    const file = new File([GLB_HEADER], 'nova.glb');
    fireEvent.change(screen.getByLabelText('Arquivo .glb do token'), { target: { files: [file] } });
    await waitFor(() => expect(actions.uploadModel).toHaveBeenCalledWith(file));
    const select = await screen.findByLabelText<HTMLSelectElement>('Modelo');
    await waitFor(() => expect(select.value).toBe(UPLOADED.id));
  });

  it('shouldRefuseAFileThatIsNotAGlb', async () => {
    const actions = fakeActions([]);
    renderDialog(actions);
    await screen.findByText(/ainda não enviou nenhum modelo/);
    const file = new File([new Uint8Array(8)], 'foto.png');
    fireEvent.change(screen.getByLabelText('Arquivo .glb do token'), { target: { files: [file] } });
    expect(await screen.findByText(/Escolha um arquivo \.glb/)).toBeTruthy();
    expect(actions.uploadModel).not.toHaveBeenCalled();
  });
});
