/**
 * Tema da interface: escuro por padrão (combina com a cena 3D sombria); o claro é
 * opcional. A escolha fica salva no navegador e é aplicada em <html data-theme>.
 */
import { create } from 'zustand';
import { logger } from './logger';

export type ThemeName = 'dark' | 'light';

const STORAGE_KEY = 'rpgmaps.theme';
const DEFAULT_THEME: ThemeName = 'dark';

function readSavedTheme(): ThemeName {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : DEFAULT_THEME;
  } catch (error) {
    // Armazenamento bloqueado (janela privada): segue com o padrão sem incomodar.
    logger.warn('Não foi possível ler o tema salvo.', undefined, error);
    return DEFAULT_THEME;
  }
}

function applyTheme(theme: ThemeName): void {
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch (error) {
    logger.warn('Não foi possível salvar o tema.', undefined, error);
  }
}

type ThemeState = {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
};

export const useTheme = create<ThemeState>((set, get) => ({
  theme: DEFAULT_THEME,
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
  toggleTheme: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
}));

/** Chamar uma vez na inicialização, antes de renderizar. */
export function initTheme(): void {
  useTheme.getState().setTheme(readSavedTheme());
}
