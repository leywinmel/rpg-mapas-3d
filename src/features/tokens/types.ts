import type { TokenKind, TokenModelKey } from './constants';

/** Token num mapa, como o app usa (o banco guarda em snake_case, ver services/token-row.ts). */
export type Token = {
  id: string;
  mapId: string;
  /** Jogador que controla o token; nulo = do mestre (NPC, monstro). */
  ownerId: string | null;
  kind: TokenKind;
  name: string;
  imagePath: string | null;
  modelKey: TokenModelKey | null;
  /** Modelo .glb da biblioteca do mestre (token "asset"); nulo se o modelo foi apagado. */
  modelAssetId: string | null;
  colorPrimary: string | null;
  colorSecondary: string | null;
  x: number;
  z: number;
  /** Lado em casas. */
  size: number;
  /** Degrau absoluto da base: o corte de andares compara com ele. */
  level: number;
  hpCurrent: number | null;
  hpMax: number | null;
  notes: string;
  /** Escondido dos jogadores pelo mestre (emboscada). */
  hidden: boolean;
};

export type TokenLook =
  | { kind: 'image'; image: File }
  | { kind: 'model'; modelKey: TokenModelKey; colorPrimary: string; colorSecondary: string }
  | { kind: 'asset'; assetId: string };

export type NewTokenInput = {
  mapId: string;
  ownerId: string | null;
  name: string;
  size: number;
  x: number;
  z: number;
  level: number;
  hpMax: number | null;
  hidden: boolean;
  look: TokenLook;
};

/** O que dá para mudar num token já criado (o jogador dono só posição, andar, vida atual e notas). */
export type TokenPatch = Partial<
  Pick<
    Token,
    | 'name'
    | 'ownerId'
    | 'size'
    | 'x'
    | 'z'
    | 'level'
    | 'hpCurrent'
    | 'hpMax'
    | 'notes'
    | 'hidden'
    | 'modelKey'
    | 'colorPrimary'
    | 'colorSecondary'
  >
>;
