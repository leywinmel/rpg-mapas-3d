import { useEffect } from 'react';
import { create } from 'zustand';
import { isSceneKey } from '@/features/map-editor';

type HudState = {
  /** O mestre escondeu barras, painéis e ferramentas para ver a cena limpa. */
  hidden: boolean;
  toggle: () => void;
  show: () => void;
};

/** Fica fora do React porque a página da sala marca o `<main>` e o HUD tem o botão. */
export const useHudStore = create<HudState>((set) => ({
  hidden: false,
  toggle: () => set((state) => ({ hidden: !state.hidden })),
  show: () => set({ hidden: false }),
}));

/** Tecla que liga e desliga o HUD (H já é a casa pronta do editor). */
export const HUD_TOGGLE_KEY = 'u';

/**
 * Só o mestre esconde o HUD (U ou o botão do olho), para ver a cena limpa; ao sair da mesa ele
 * volta. Fica um botão pequeno no canto para trazer tudo de volta.
 */
export function useHudToggle(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== HUD_TOGGLE_KEY || !isSceneKey(event)) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault();
      useHudStore.getState().toggle();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      useHudStore.getState().show();
    };
  }, [enabled]);
}
