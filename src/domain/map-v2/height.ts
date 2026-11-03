/**
 * Medidas verticais do v2. Tudo que é altura no documento é um número inteiro de degraus
 * (HEIGHT_STEP unidades do mundo cada): inteiros não acumulam erro de arredondamento ao
 * somar base mais altura, e o corte de andares compara degraus sem tolerância nenhuma.
 * Só a cena converte para unidades do mundo (eixo y), na hora de desenhar.
 */
import { HEIGHT_STEP, MAX_LEVEL, STORY_HEIGHT_STEPS } from './constants';
import type { MapWall } from './schema';

/** Degraus para unidades do mundo (a altura em y de um ponto do mapa). */
export function stepsToWorld(steps: number): number {
  return steps * HEIGHT_STEP;
}

/**
 * Unidades do mundo para o degrau mais perto. Só o arquivo editado à mão traz uma altura que
 * não é múltipla do degrau; os valores que o editor grava sempre são.
 */
export function worldToSteps(units: number): number {
  return Math.round(units / HEIGHT_STEP);
}

/** Degrau em que o andar começa: o andar 0 (térreo) começa no degrau 0, o 1 no degrau 4... */
export function storyToSteps(story: number): number {
  return story * STORY_HEIGHT_STEPS;
}

/** Andar que contém o degrau: os degraus 0 a 3 são o andar 0, os 4 a 7 o andar 1... */
export function stepsToStory(steps: number): number {
  return Math.floor(steps / STORY_HEIGHT_STEPS);
}

/** O degrau serve de base para uma parede ou uma peça? */
export function isValidLevel(level: number): boolean {
  return Number.isInteger(level) && level >= 0 && level <= MAX_LEVEL;
}

/** Degrau do topo de uma parede: a base mais a altura. */
export function wallTopLevel(wall: Pick<MapWall, 'level' | 'height'>): number {
  return wall.level + wall.height;
}
