/**
 * Marca do que é interface dentro da cena 3D (cursor e fantasma do editor, anel de seleção):
 * a captura de imagem "sem interface" esconde o que tem esta marca, além das linhas da grade.
 * Sem three.js aqui: é só o userData que o objeto recebe.
 */
export const SCENE_UI_KEY = 'sceneUi';

/** Pendure em `userData` do grupo ou malha que é interface. */
export const SCENE_UI_USER_DATA: Readonly<Record<string, boolean>> = { [SCENE_UI_KEY]: true };

export function isSceneUi(userData: Readonly<Record<string, unknown>>): boolean {
  return userData[SCENE_UI_KEY] === true;
}
