// Cenário em movimento (RPG-27): o mestre move carros e objetos soltos durante o jogo e a mesa
// vê a peça deslizar até o lugar novo.
//
// Dentro da sala (sob RoomSessionProvider), junto dos tokens:
//   <ScenerySync />                           mestre: acha as peças movidas e avisa a mesa
//   <TokensSync onPieceMoved={receivePieceMoved} />   jogador: o aviso chega pelo canal dos tokens
//   <ScenerySceneLayer />                     camada da cena 3D (carga sob demanda)
//   table.adjustModel = useSceneryAdjuster()  tira do pedaço a peça que ainda desliza
export { ScenerySceneLayer } from './components/ScenerySceneLayer';
export { ScenerySync } from './components/ScenerySync';
export { useSceneryAdjuster } from './hooks/useSceneryAdjuster';
export { useSceneryStore } from './hooks/scenery-store';
export { receivePieceMoved } from './services/scenery-runtime';
