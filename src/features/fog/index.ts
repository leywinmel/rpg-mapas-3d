// API pública da feature de névoa.
export { FogPanel } from './components/FogPanel';
export { FogSceneLayer } from './components/FogSceneLayer';
export { FogSync } from './components/FogSync';
export { useFogStore } from './hooks/fog-store';
// Para importar o mapa com a névoa (feature export).
export { getFogService, type FogService } from './services/fog-service';
