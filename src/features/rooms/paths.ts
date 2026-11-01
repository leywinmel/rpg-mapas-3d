/** Endereços das telas de mesa. O código do convite (slug) é o fim do link. */
export const LOBBY_PATH = '/';
export const ROOM_PATH_PREFIX = '/sala/';
/** Molde da rota no roteador; a RoomPage lê o parâmetro `slug`. */
export const ROOM_ROUTE = `${ROOM_PATH_PREFIX}:slug`;

export function roomPath(slug: string): string {
  return `${ROOM_PATH_PREFIX}${encodeURIComponent(slug)}`;
}
