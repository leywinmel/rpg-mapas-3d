/** Cores e alturas da névoa na cena (como a paleta da cena, não seguem o tema da interface). */
export const FOG_SCENE = {
  /** O jogador vê a casa coberta como escuridão, na cor do fundo da cena. */
  playerColor: '#0d0b14',
  /** O mestre vê a névoa translúcida, num tom frio que não some no chão escuro. */
  masterColor: '#4b3f7a',
  masterOpacity: 0.55,
  previewColor: '#b7a6ff',
  /** Um fio acima do chão do nível zero, para não brigar com ele na tela. */
  lift: 0.03,
  /** O plano do pincel fica acima do plano do editor e do arraste dos tokens. */
  painterLift: 0.02,
  /** Desenhada por último: a névoa do mestre fica por cima de paredes e objetos. */
  masterRenderOrder: 10,
  /** Casa com alfa abaixo disto não é desenhada (névoa opaca do jogador). */
  alphaTest: 0.5,
  /** Altura do contorno da prévia do pincel. */
  previewHeight: 0.05,
} as const;

/** Plano invisível do pincel, bem maior que o mapa: a borda ainda pega o cursor. */
export const FOG_PAINTER_MARGIN = 200;
