/** Nomes e limites da exportação (arquivo do mapa, imagem e modelo 3D). */

export const PNG_MIME_TYPE = 'image/png';
export const JSON_MIME_TYPE = 'application/json';
export const GLB_MIME_TYPE = 'model/gltf-binary';

export const PNG_EXTENSION = '.png';
export const GLB_EXTENSION = '.glb';

/** Nome de arquivo quando o mapa não tem nome que preste (só símbolos, por exemplo). */
export const FALLBACK_FILE_NAME = 'mapa';
export const MAX_FILE_NAME_LENGTH = 60;

/**
 * Uma casa do mapa tem 1,5 m (a medida de D&D): o .glb sai em metros, como o glTF manda, e abre
 * no tamanho certo no Blender.
 */
export const CELL_METERS = 1.5;

/**
 * Estimativa do .glb, só para o aviso antes de exportar. Medido com cidades geradas (128 a
 * 1000 casas de lado): cada casa com chão custa ~92 bytes (coluna e tampa, com posição, giro,
 * escala e cor no EXT_mesh_gpu_instancing) e cada parede ou peça ~85 bytes (algumas têm várias
 * camadas). A base cobre as geometrias, que vão uma vez só; modelos enviados muito detalhados
 * podem passar dela.
 */
export const GLB_BYTES_PER_FLOOR_CELL = 92;
export const GLB_BYTES_PER_OBJECT = 85;
export const GLB_BASE_BYTES = 1_000_000;

/** Acima disto o painel avisa que o arquivo vai ser grande e pode demorar. */
export const GLB_WARNING_BYTES = 30 * 1024 * 1024;

/** Amostras por lado da tela para achar a área do chão que a câmera vê. */
export const VISIBLE_AREA_SAMPLES = 9;

/** Lado do retângulo sugerido quando não dá para medir a vista. */
export const DEFAULT_RECT_SIDE = 64;
