/**
 * Exportar e importar o mapa: o arquivo próprio (.rpgmap.json), o recorte de uma área para o
 * modelo 3D. A gravação em lotes de um mapa grande é a do map-v2 (planSaveSteps). TypeScript puro,
 * como o resto do domínio; quem usa importa de '@/domain/map-export'.
 */
export * from './constants';
export * from './crop';
export * from './format';
