/**
 * Tipos do catálogo de peças. O catálogo é só dado (sem three.js), para o painel
 * da biblioteca ficar no pacote leve; a geometria mora em piece-geometry.ts.
 */

export type PieceKind = 'floor' | 'wall' | 'prop';

/** Material de cada camada da peça: um InstancedMesh por camada. */
export type MaterialKind = 'matte' | 'metal' | 'water' | 'glow';

/**
 * Como a peça é desenhada. "procedural" usa um construtor de geometria pela
 * chave; "model" carrega um .glb (ex: um pacote CC0 em public/assets) e entra na
 * cena sem mudar o editor.
 */
export type PieceVisual = { type: 'procedural' } | { type: 'model'; url: string };

/** Luz pontual que a peça acende (ex: tocha). A cena limita quantas viram luz real. */
export type PieceLight = {
  color: string;
  intensity: number;
  /** Alcance em casas. */
  distance: number;
  /** Altura da chama acima da base da peça. */
  offsetY: number;
};

/** Ícones disponíveis no painel enquanto a miniatura 3D não fica pronta. */
export type PieceIcon =
  | 'square'
  | 'waves'
  | 'sprout'
  | 'mountain'
  | 'brick'
  | 'fence'
  | 'grid'
  | 'cylinder'
  | 'box'
  | 'table'
  | 'armchair'
  | 'chest'
  | 'pillar'
  | 'statue'
  | 'rock'
  | 'tree'
  | 'flame';

export type CatalogEntry = {
  /** Chave salva no documento do mapa (segue o formato catalogKey do domínio). */
  key: string;
  kind: PieceKind;
  /** Nome na tela. */
  label: string;
  /** Palavras extras para a busca (sinônimos). */
  keywords: readonly string[];
  icon: PieceIcon;
  visual: PieceVisual;
  /** Cor da lateral do bloco de chão (só para kind "floor"). */
  sideColor?: string;
  light?: PieceLight;
};
