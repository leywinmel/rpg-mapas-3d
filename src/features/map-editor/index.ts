// Área do mapa da sala (editor do mestre e visão do jogador). A cena 3D é
// carregada sob demanda por dentro: importar daqui não puxa o three.js.
export { MapWorkspace, type MapWorkspaceProps } from './components/MapWorkspace';
export { isSceneKey } from './editor/shortcuts';
export { HUD_CHROME_CLASS } from './components/EditorSidebar';
export type { MapView, TableBinding } from './components/table-binding';
