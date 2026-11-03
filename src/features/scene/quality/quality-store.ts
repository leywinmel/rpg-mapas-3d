/**
 * Estado da qualidade da cena: a escolha da pessoa (salva no navegador) e o nível que o modo
 * automático achou. Fica fora do Canvas para o botão da sala (pacote leve) e a cena (pacote
 * do three) lerem o mesmo valor.
 */
import { create } from 'zustand';
import {
  AUTO_START_LEVEL,
  browserQualityStorage,
  lowerQuality,
  QUALITY_SETTINGS,
  raiseQuality,
  readQualityMode,
  resolveQuality,
  writeQualityMode,
  type QualityLevel,
  type QualityMode,
  type QualitySettings,
} from './quality';

type QualityState = {
  mode: QualityMode;
  /** Nível do modo automático; guardado mesmo com a escolha manual, para a volta ao auto. */
  autoLevel: QualityLevel;
  setMode: (mode: QualityMode) => void;
  /** A medição viu quadros lentos: desce um nível (só no automático). */
  decline: () => void;
  /** A medição viu folga: sobe um nível (só no automático). */
  incline: () => void;
};

export const useQualityStore = create<QualityState>((set, get) => ({
  mode: readQualityMode(browserQualityStorage()),
  autoLevel: AUTO_START_LEVEL,
  setMode: (mode) => {
    writeQualityMode(browserQualityStorage(), mode);
    set({ mode });
  },
  decline: () => {
    if (get().mode === 'auto') set({ autoLevel: lowerQuality(get().autoLevel) });
  },
  incline: () => {
    if (get().mode === 'auto') set({ autoLevel: raiseQuality(get().autoLevel) });
  },
}));

/** O nível que vale agora. */
export function useQualityLevel(): QualityLevel {
  const mode = useQualityStore((state) => state.mode);
  const autoLevel = useQualityStore((state) => state.autoLevel);
  return resolveQuality(mode, autoLevel);
}

export function useQualitySettings(): QualitySettings {
  return QUALITY_SETTINGS[useQualityLevel()];
}
