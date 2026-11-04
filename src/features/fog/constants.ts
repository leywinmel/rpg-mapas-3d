/** Evento do canal `fog:<id da mesa>`: só avisa qual mapa mudou; quem recebe relê pelo RLS. */
export const FOG_EVENTS = { changed: 'fog-changed' } as const;

/** Pausa depois da última pincelada antes de gravar: um traço vira uma gravação só. */
export const FOG_SAVE_DELAY_MS = 500;

/** Pincel: raio em casas (0 = uma casa). */
export const FOG_BRUSH_MIN_RADIUS = 0;
export const FOG_BRUSH_MAX_RADIUS = 10;
export const FOG_BRUSH_DEFAULT_RADIUS = 1;

/** Página da leitura dos pedaços (até 1024 num mapa de 1000×1000). */
export const FOG_CHUNK_PAGE_SIZE = 256;
export const FOG_MAX_CHUNK_PAGES = 8;

export const FOG_SHAPES = ['brush', 'rect'] as const;
export type FogShape = (typeof FOG_SHAPES)[number];

export const FOG_MODES = ['cover', 'reveal'] as const;
export type FogMode = (typeof FOG_MODES)[number];
