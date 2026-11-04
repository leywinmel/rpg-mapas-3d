/** Textos do controle de corte de andares. */
import { storyShownByCutaway, type Cutaway } from '@/domain/map-v2';

/** Nome curto, que cabe no controle: "Tudo", "Térreo", "1º", "2º"... */
export function shortCutawayLabel(cut: Cutaway): string {
  const story = storyShownByCutaway(cut);
  if (story === null) return 'Tudo';
  return story === 0 ? 'Térreo' : `${story}º`;
}

/** Frase inteira, para o leitor de tela e a dica: "até o térreo", "até o 2º andar". */
export function cutawayPhrase(cut: Cutaway): string {
  const story = storyShownByCutaway(cut);
  if (story === null) return 'todos os andares';
  return story === 0 ? 'até o térreo' : `até o ${story}º andar`;
}
