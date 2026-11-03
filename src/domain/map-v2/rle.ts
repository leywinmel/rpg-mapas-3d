/**
 * Corridas de valores iguais (RLE) no formato [valor, quantidade, valor, quantidade, ...].
 * Um pedaço liso de 1024 casas vira dois números, e é isso que mantém o JSON de um
 * mapa de 1000×1000 em algumas centenas de KB em vez de dezenas de MB.
 */
import type { MapResult } from '../map-document';
import { RUN_STRIDE } from './constants';
import { fail, ok } from './validation';

/** Junta valores vizinhos iguais; é a forma canônica (duas corridas seguidas nunca têm o mesmo valor). */
export function encodeRuns(values: ArrayLike<number>): number[] {
  const runs: number[] = [];
  let start = 0;
  while (start < values.length) {
    const value = values[start]!;
    let end = start + 1;
    while (end < values.length && values[end] === value) end += 1;
    runs.push(value, end - start);
    start = end;
  }
  return runs;
}

export type RunsSpec = {
  /** Quantos valores as corridas precisam somar, nem um a mais nem a menos. */
  readonly length: number;
  /** Maior valor aceito; o menor é sempre 0. */
  readonly maxValue: number;
  /** O que está sendo lido, para a mensagem dizer onde está o erro. */
  readonly label: string;
};

/**
 * Desfaz as corridas conferindo tudo: pares completos, valores dentro do limite, quantidades
 * positivas e soma exata. Aceita corridas vizinhas com o mesmo valor (só não são canônicas).
 * Para de somar assim que passa do total, para um arquivo malicioso não gastar memória.
 */
export function decodeRuns(runs: readonly number[], spec: RunsSpec): MapResult<number[]> {
  const { length, maxValue, label } = spec;
  if (runs.length % RUN_STRIDE !== 0) {
    return fail([`${label}: as corridas precisam vir em pares de valor e quantidade.`]);
  }
  const values: number[] = [];
  for (let index = 0; index < runs.length; index += RUN_STRIDE) {
    const value = runs[index]!;
    const count = runs[index + 1]!;
    if (!Number.isInteger(value) || value < 0 || value > maxValue) {
      return fail([`${label}: o valor ${value} está fora do limite de 0 a ${maxValue}.`]);
    }
    if (!Number.isInteger(count) || count < 1) {
      return fail([
        `${label}: a quantidade ${count} é inválida, cada corrida precisa de pelo menos 1.`,
      ]);
    }
    if (values.length + count > length) {
      return fail([`${label}: as corridas passam das ${length} casas do pedaço.`]);
    }
    for (let repeat = 0; repeat < count; repeat += 1) values.push(value);
  }
  if (values.length !== length) {
    return fail([
      `${label}: as corridas somam ${values.length} casas, mas o pedaço tem ${length}.`,
    ]);
  }
  return ok(values);
}
