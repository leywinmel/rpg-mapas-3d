// Parte leve da cena (dados e regras puras, sem three.js): pode entrar no pacote inicial.
// Os componentes 3D ficam em ./components e devem ser importados sob demanda (React.lazy),
// para o three.js não pesar na tela inicial.
export * from './ambience';
export * from './catalog/catalog';
export type * from './catalog/catalog-types';
export { SCENE_PALETTE } from './catalog/palette';
export * from './layout';
export { useCameraFocus, type FocusRequest, type GroundPoint } from './camera/camera-focus';
export * from './quality/quality';
export { QualityButton } from './quality/QualityButton';
export { useQualityLevel, useQualitySettings, useQualityStore } from './quality/quality-store';
