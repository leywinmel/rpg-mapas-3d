import { useState } from 'react';
import type { MapSummary } from '../types';
import type { MapActions } from './useMapActions';

export type MapSelection = {
  /** Mapa aberto no editor do mestre (pode não ser o que a mesa está vendo). */
  selectedMapId: string | null;
  onSelect: (mapId: string | null) => void;
  actions: MapActions;
};

/** Qual janela da lista de mapas está aberta (criar, importar, renomear, apagar). */
export type MapDialogs = MapSelection & {
  creating: number;
  importing: number;
  renaming: MapSummary | null;
  deleting: MapSummary | null;
  openCreate: () => void;
  openImport: () => void;
  setCreating: (value: number) => void;
  setImporting: (value: number) => void;
  setRenaming: (map: MapSummary | null) => void;
  setDeleting: (map: MapSummary | null) => void;
};

/**
 * O estado das janelas fica com quem monta a área do mapa, e não com a lista: a lista troca de
 * lugar quando um mapa abre no editor (por exemplo, o primeiro mapa da mesa, recém-criado pelo
 * gerador), e a janela de criar não pode sumir no meio da gravação com o "Tentar de novo".
 */
export function useMapDialogs(selection: MapSelection): MapDialogs {
  const [creating, setCreating] = useState(0);
  const [importing, setImporting] = useState(0);
  const [renaming, setRenaming] = useState<MapSummary | null>(null);
  const [deleting, setDeleting] = useState<MapSummary | null>(null);
  return {
    ...selection,
    creating,
    importing,
    renaming,
    deleting,
    openCreate: () => setCreating((value) => value + 1),
    openImport: () => setImporting((value) => value + 1),
    setCreating,
    setImporting,
    setRenaming,
    setDeleting,
  };
}
