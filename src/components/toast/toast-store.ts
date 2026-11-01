import { create } from 'zustand';

export type ToastTone = 'info' | 'success' | 'warning' | 'error';

export type Toast = {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
};

export type ToastInput = Omit<Toast, 'id'>;

/** Quanto tempo cada aviso fica na tela. Erro fica mais, para dar tempo de ler. */
export const TOAST_DURATION_MS: Record<ToastTone, number> = {
  info: 4000,
  success: 3500,
  warning: 6000,
  error: 8000,
};

const MAX_TOASTS = 4;

type ToastState = {
  toasts: Toast[];
  push: (toast: ToastInput) => number;
  dismiss: (id: number) => void;
};

let nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = nextId++;
    // Mantém só os mais recentes para a pilha não cobrir a cena.
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }].slice(-MAX_TOASTS) }));
    return id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

/** Atalho para qualquer parte do app avisar o usuário, inclusive fora de componentes. */
export const notify = {
  info: (title: string, description?: string) =>
    useToastStore.getState().push({ tone: 'info', title, description }),
  success: (title: string, description?: string) =>
    useToastStore.getState().push({ tone: 'success', title, description }),
  warning: (title: string, description?: string) =>
    useToastStore.getState().push({ tone: 'warning', title, description }),
  error: (title: string, description?: string) =>
    useToastStore.getState().push({ tone: 'error', title, description }),
};
