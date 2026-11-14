/**
 * Tipos do catálogo de peças. O catálogo é só dado (sem three.js), para o painel
 * da biblioteca ficar no pacote leve; a geometria mora em piece-geometry.ts.
 */

import type { Footprint } from '@/domain/map-v2';

export type PieceKind = 'floor' | 'wall' | 'prop';

/** Estilo de mundo da peça. "generic" (terra, água, árvore...) aparece em qualquer filtro. */
export type PieceStyle = 'medieval' | 'modern' | 'futurist' | 'cyberpunk' | 'generic';

/** Grupo da peça na biblioteca. O comportamento no editor vem do `kind`, não daqui. */
export type PieceCategory =
  | 'floor'
  | 'wall'
  | 'opening'
  | 'roof'
  | 'stairs'
  | 'furniture'
  | 'vehicle'
  | 'structure'
  | 'nature';

/** Material de cada camada da peça: um InstancedMesh por camada. */
export type MaterialKind = 'matte' | 'metal' | 'water' | 'glow';

/**
 * Como a peça é desenhada. "procedural" usa um construtor de geometria pela
 * chave; "model" carrega um glTF de pacote (public/assets) JÁ normalizado na
 * preparação: origem no centro do footprint, base em y = 0 (o topo, no chão) e
 * escala em casas. Por isso a cena não estica nem centraliza esses modelos.
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
  | 'flame'
  | 'door'
  | 'window'
  | 'roof'
  | 'stairs'
  | 'car'
  | 'truck'
  | 'wagon'
  | 'road'
  | 'cone'
  | 'monitor'
  | 'fan';

export type CatalogEntry = {
  /** Chave salva no documento do mapa (segue o formato catalogKey do domínio). */
  key: string;
  kind: PieceKind;
  /** Nome na tela. */
  label: string;
  /** Palavras extras para a busca (sinônimos). */
  keywords: readonly string[];
  icon: PieceIcon;
  style: PieceStyle;
  category: PieceCategory;
  visual: PieceVisual;
  /** Casas que o objeto ocupa antes de girar (só "prop"); ausente = 1×1. */
  footprint?: Footprint;
  /** Altura do desenho em unidades do mundo (1 = lado da casa), para a dica da biblioteca. */
  height?: number;
  /** Miniatura pronta (WebP pequeno): a biblioteca não baixa o modelo só para desenhá-la. */
  thumbnail?: string;
  /**
   * Espessura da tampa de um chão de modelo: a coluna lisa sobe até a base dela. Ausente =
   * a tampa procedural (FLOOR_CAP_DEPTH).
   */
  floorDepth?: number;
  /**
   * Quantas unidades de altura um modelo de parede cobre (a parede de pacote tem um andar
   * inteiro, com porta ou janela; empilhar de 1 em 1 repetiria a porta). Ausente = 1.
   */
  wallSpan?: number;
  /** Cor da lateral do bloco de chão (só para kind "floor"). */
  sideColor?: string;
  /**
   * Cor única do desenho de longe (chão e paredes): de longe o bloco liso com essa cor
   * substitui a peça detalhada, que custa de 7 a 10 vezes mais triângulos.
   */
  farColor?: string;
  light?: PieceLight;
};
