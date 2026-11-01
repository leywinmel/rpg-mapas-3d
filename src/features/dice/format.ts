import type { DiceRoll } from './types';

const LOCALE = 'pt-BR';
const MINUS_SIGN = '−';

function formatDate(
  iso: string,
  options: Intl.DateTimeFormatOptions,
  timeZone: string | undefined,
): string {
  const time = Date.parse(iso);
  // Uma data estragada não pode derrubar a lista inteira.
  if (Number.isNaN(time)) return '';
  return new Intl.DateTimeFormat(LOCALE, { ...options, timeZone }).format(time);
}

/** Hora da rolagem na lista, ex: "14:32". */
export function formatRollTime(iso: string, timeZone?: string): string {
  return formatDate(iso, { hour: '2-digit', minute: '2-digit' }, timeZone);
}

/** Data e hora completas, para a dica ao passar o mouse. */
export function formatRollMoment(iso: string, timeZone?: string): string {
  return formatDate(iso, { dateStyle: 'short', timeStyle: 'medium' }, timeZone);
}

/** Bônus com sinal, ex: "+3" ou "−2" (vazio quando não há bônus). */
export function signedModifier(modifier: number): string {
  if (modifier === 0) return '';
  return `${modifier > 0 ? '+' : MINUS_SIGN}${Math.abs(modifier)}`;
}

/** A frase que o leitor de tela fala quando uma rolagem termina. */
export function describeRoll(roll: DiceRoll, who: string): string {
  const dice = roll.dice
    .map((die) => (die.kept ? `${die.value}` : `${die.value} (descartado)`))
    .join(', ');
  const parts = [dice, signedModifier(roll.modifier) && `bônus ${signedModifier(roll.modifier)}`];
  const detail = parts.filter(Boolean).join(', ');
  const secret = roll.hidden ? ' Rolagem escondida: só você vê.' : '';
  return `${who} rolou ${roll.notation}${detail ? `: ${detail}` : ''}. Total ${roll.total}.${secret}`;
}
