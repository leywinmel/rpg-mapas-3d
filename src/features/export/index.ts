// Exportar e importar o mapa (RPG-14, RPG-15, RPG-16).
//
//   <ExportPanel isGameMaster onClose />   painel "Exportar" da barra da mesa
//   <ExportSceneLayer />                   camada da cena 3D (liga o painel à cena; carga sob demanda)
//   <ImportMapDialog ... />                diálogo "Importar mapa" da lista de mapas
export { ExportPanel } from './components/ExportPanel';
export { ImportMapDialog } from './components/ImportMapDialog';
export { ExportSceneLayer } from './scene/ExportSceneLayer';
export type { BatchProgress, MapImportTarget } from './services/map-importer';
