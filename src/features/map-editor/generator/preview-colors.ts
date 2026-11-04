/**
 * Cores da prévia do gerador: as mesmas cores de longe que a cena usa para as peças do
 * estilo, então a prévia já parece o mapa visto do alto.
 */
import {
  STYLE_KITS,
  TERRAIN_CLASS,
  type SettlementStyle,
  type TerrainClass,
} from '@/domain/map-gen';
import { pieceCatalog } from '@/features/scene';

export type PreviewPalette = Readonly<Record<TerrainClass, string | null>>;

function farColor(key: string): string | null {
  return pieceCatalog.get(key)?.farColor ?? null;
}

export function previewPalette(style: SettlementStyle): PreviewPalette {
  const kit = STYLE_KITS[style];
  const { tiles } = kit;
  // Telhado plano é laje do piso interno; o de duas águas não tem cor de longe, vale a parede.
  const roof =
    kit.roof === 'flat'
      ? farColor(tiles.indoor[0] ?? '')
      : farColor(kit.walls.house[0]?.plain ?? '');
  return {
    [TERRAIN_CLASS.ground]: farColor(tiles.ground),
    [TERRAIN_CLASS.road]: farColor(tiles.road),
    [TERRAIN_CLASS.sidewalk]: farColor(tiles.sidewalk ?? tiles.road),
    [TERRAIN_CLASS.plaza]: farColor(tiles.plaza),
    [TERRAIN_CLASS.yard]: farColor(tiles.yard),
    [TERRAIN_CLASS.building]: roof,
  };
}
