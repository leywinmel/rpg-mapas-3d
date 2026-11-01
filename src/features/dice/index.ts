// Dados 3D com física, rolagem escondida do mestre e histórico da mesa.
//
// Dentro da sala (sob RoomSessionProvider):
//   <DiceTray />   botão no canto + painel flutuante "Dados" (sem props)
// A bandeja 3D, o three.js e o motor de física descem em pedaços separados, só quando
// alguém abre o painel ou recebe uma rolagem; importe este módulo com `lazy` na sala.
export { DiceTray } from './components/DiceTray';
