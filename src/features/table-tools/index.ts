// Ferramentas da mesa: régua (RPG-19) e ping (RPG-20). Efêmeras: só broadcast, nada no banco.
//
// Dentro da sala (sob RoomSessionProvider):
//   <TableToolsSync />          abre o canal `table:<id da mesa>` e monta as ações
//   <TableToolsSceneLayer />    régua e marcadores na cena 3D (carga sob demanda)
//   <TableToolButtons />        botões da régua e do ping na barra da sala
//   <ToolHint />                faixa da ferramenta ligada (medida e "mostrar à mesa")
// Alt+clique no mapa marca um ponto a qualquer momento.
export { TableToolButtons } from './components/TableToolButtons';
export { TableToolsSceneLayer } from './components/TableToolsSceneLayer';
export { TableToolsSync } from './components/TableToolsSync';
export { ToolHint } from './components/ToolHint';
