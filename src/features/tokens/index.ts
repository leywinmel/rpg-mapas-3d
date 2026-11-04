// Tokens: imagem em pé numa base ou boneco 3D com cores, vida, notas e movimento ao vivo.
//
// Dentro da sala (sob RoomSessionProvider):
//   <TokensSync />                  carrega os tokens do mapa aberto e ouve o canal da mesa
//   <TokensSceneLayer />            camada da cena 3D (carga sob demanda)
//   <TokensPanel onClose={...} />   painel "Tokens" da barra
// O mapa aberto chega por useTokensStore.getState().setView (MapWorkspace → table.onView).
export { TokensPanel } from './components/TokensPanel';
export { TokensSceneLayer } from './components/TokensSceneLayer';
export { TokensSync } from './components/TokensSync';
export { useTokensStore, type TableView } from './hooks/tokens-store';
