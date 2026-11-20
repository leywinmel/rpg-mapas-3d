/**
 * Acabamentos de parede (RPG-33): tijolo, madeira, reboco e pedra, cada um com a parede lisa,
 * a com porta e a com janela. Trocar o acabamento mantém o papel de cada parede: a porta da
 * casa continua porta, só que do acabamento novo. Parede que não é de casa (grade, cerca,
 * muralha) fica como está: virar tijolo um muro de jardim seria surpresa.
 */
import { STYLE_KITS, type WallSet } from './kits';

export type Finish = { readonly id: string; readonly name: string; readonly walls: WallSet };

export const FINISHES: readonly Finish[] = [
  {
    id: 'tijolo',
    name: 'Tijolo',
    walls: { plain: 'mod-parede-tijolo', door: 'mod-porta-madeira', window: 'mod-tijolo-janela' },
  },
  {
    id: 'madeira',
    name: 'Madeira',
    walls: { plain: 'jap-parede', door: 'jap-parede-porta', window: 'jap-parede-janela' },
  },
  {
    id: 'reboco',
    name: 'Reboco',
    walls: { plain: 'med-parede-reboco', door: 'med-reboco-porta', window: 'med-reboco-janela' },
  },
  {
    id: 'pedra',
    name: 'Pedra',
    walls: { plain: 'med-parede-rustica', door: 'med-rustica-porta', window: 'med-rustica-janela' },
  },
];

type WallRole = 'plain' | 'door' | 'window';

/** O papel de cada parede de casa conhecida: das listas dos estilos e dos acabamentos. */
const WALL_ROLES: ReadonlyMap<string, WallRole> = (() => {
  const roles = new Map<string, WallRole>();
  const learn = (set: WallSet) => {
    roles.set(set.plain, 'plain');
    roles.set(set.door, 'door');
    roles.set(set.window, 'window');
    if (set.shopfront) roles.set(set.shopfront, 'window');
  };
  for (const finish of FINISHES) learn(finish.walls);
  for (const kit of Object.values(STYLE_KITS)) {
    for (const sets of Object.values(kit.walls)) sets.forEach(learn);
  }
  return roles;
})();

export function findFinish(id: string): Finish | undefined {
  return FINISHES.find((finish) => finish.id === id);
}

/** O estilo da parede no acabamento novo; o mesmo estilo se ela não é parede de casa. */
export function finishStyle(style: string, finish: Finish): string {
  const role = WALL_ROLES.get(style);
  return role ? finish.walls[role] : style;
}
