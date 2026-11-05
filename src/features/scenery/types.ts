import type { GlidePose } from '@/domain';
import type { MapPiece, PieceSpot } from '@/domain/map-v2';

/** Uma peça do cenário que acabou de mudar de lugar, na tela de quem olha. */
export type SceneryGlide = {
  /** Número do deslize: um aviso mais novo da mesma peça cancela os relógios do anterior. */
  readonly serial: number;
  readonly mapId: string;
  /** A peça já no lugar novo (o resto dela, modelo e tamanho, não muda). */
  readonly piece: MapPiece;
  /** De onde ela saiu: é onde o mapa ainda pode estar enquanto o banco não confirma. */
  readonly origin: PieceSpot;
  readonly from: GlidePose;
  readonly to: GlidePose;
  /** Início do deslize, no relógio de performance.now(). */
  readonly startedAt: number;
  /** Ainda deslizando: a cena a desenha à parte, e o pedaço do mapa não a desenha. */
  readonly gliding: boolean;
};
