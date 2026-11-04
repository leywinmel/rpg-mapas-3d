/** Cores e alturas da névoa na cena (como a paleta da cena, não seguem o tema da interface). */
export const FOG_SCENE = {
  /** O jogador vê a casa coberta como escuridão, na cor do fundo da cena. */
  playerColor: '#0d0b14',
  /** O mestre vê a névoa translúcida, num tom frio que não some no chão escuro. */
  masterColor: '#4b3f7a',
  masterOpacity: 0.55,
  previewColor: '#b7a6ff',
  /** Acima do relevo das peças de chão (lajes e tábuas sobem até ~0,05), para não brigar com ele. */
  lift: 0.08,
  /** O plano do pincel fica acima do plano do editor e do arraste dos tokens. */
  painterLift: 0.02,
  /** Desenhada por último: a névoa do mestre fica por cima de paredes e objetos. */
  masterRenderOrder: 10,
  /** Casa com alfa abaixo disto não é desenhada (névoa opaca do jogador). */
  alphaTest: 0.5,
  /** Altura extra por unidade de altura da câmera (a precisão da profundidade cai com a distância). */
  liftPerCameraHeight: 0.002,
  /** Puxa a névoa do jogador para a câmera na disputa de profundidade com o chão. */
  polygonOffset: -4,
  /** Altura do contorno da prévia do pincel. */
  previewHeight: 0.05,
} as const;

/** Plano invisível do pincel, bem maior que o mapa: a borda ainda pega o cursor. */
export const FOG_PAINTER_MARGIN = 200;

/**
 * Altura da névoa para a câmera nesta altura. De perto fica rente ao chão; na visão geral de um
 * mapa de 1000×1000 sobe um pouco, senão o chão "vaza" em listras pela névoa do jogador.
 */
export function fogLiftFor(cameraHeight: number): number {
  return Math.max(FOG_SCENE.lift, Math.abs(cameraHeight) * FOG_SCENE.liftPerCameraHeight);
}
