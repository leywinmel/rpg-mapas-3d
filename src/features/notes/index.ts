// Anotações do mestre: enviadas para a mesa toda ou para jogadores escolhidos, salvas na mesa
// e entregues ao vivo, com aviso de anotação nova.
//
// Dentro da sala (sob RoomSessionProvider), o HUD monta assim:
//   <NotesProvider panelOpen={aberto}>   carrega a lista, ouve o canal e conta as não lidas
//     <NotesButton active={aberto} onClick={alternar} />   botão da barra, com o selo de não lidas
//     {aberto && <NotesPanel onClose={fechar} />}          painel "Anotações"
//   </NotesProvider>
// O provider fica montado com o painel fechado para o aviso de anotação nova chegar do mesmo jeito.
export { NotesButton, type NotesButtonProps } from './components/NotesButton';
export { NotesPanel } from './components/NotesPanel';
export { NotesProvider, type NotesProviderProps } from './components/NotesProvider';
