/**
 * Simulação determinística da jogada, sem React nem relógio: cria um mundo Rapier
 * próprio, solta os dados na bandeja em passos fixos de 1/60 s e devolve todos os
 * quadros. Mesma entrada, mesmos quadros: é assim que a mesa inteira vê o mesmo
 * arremesso sem precisar trocar posições pela rede.
 *
 * Nada aqui usa seno, cosseno nem o relógio; a ordem de criação dos corpos segue a
 * ordem do `spec`. O módulo do Rapier chega por parâmetro (carregado sob demanda
 * no app, importado direto nos testes).
 */
import type RAPIER from '@dimforge/rapier3d-compat';
import type { DieSides } from '@/domain';
import {
  DIE_ANGULAR_DAMPING,
  DIE_DENSITY,
  DIE_FRICTION,
  DIE_LINEAR_DAMPING,
  DIE_RESTITUTION,
  FLOATS_PER_BODY,
  FLOOR_FRICTION,
  FLOOR_RESTITUTION,
  GRAVITY,
  MAX_REST_TILT_DEGREES,
  MAX_SIMULATION_STEPS,
  REST_ANGULAR_SPEED,
  REST_LINEAR_SPEED,
  REST_STEPS,
  scaleForDiceCount,
  STEP_SECONDS,
  TRAY_CEILING_HEIGHT,
  TRAY_HALF_DEPTH,
  TRAY_HALF_WIDTH,
  TRAY_WALL_HEIGHT,
  TRAY_WALL_THICKNESS,
  WALL_FRICTION,
  WALL_RESTITUTION,
} from './constants';
import { combineHundred, readValue, tiltDegrees } from './orientation';
import { BODY_KINDS, getDieShape, type DieKind } from './shapes';
import type { BodyStart, ThrowSpec } from './spec';
import { normalizeQuat, type Quat, type Vec3 } from './vec';

export type RapierModule = typeof RAPIER;

export type SimulatedThrow = {
  /** Lados de cada dado da rolagem, na ordem do arremesso. */
  readonly sides: readonly DieSides[];
  /** Tipo de cada corpo físico (o d100 ocupa dois). */
  readonly bodies: readonly DieKind[];
  /**
   * Os quadros um depois do outro: para cada passo, para cada corpo, FLOATS_PER_BODY
   * números (x, y, z e a rotação x, y, z, w).
   */
  readonly frames: Float32Array;
  readonly frameCount: number;
  /** Falso se os dados ainda se mexiam ao atingir o tempo máximo. */
  readonly settled: boolean;
  /** Valor lido de cada dado, na ordem do arremesso. */
  readonly values: readonly number[];
  /** Pior desvio (graus) entre a face lida e o "para cima": alto = dado apoiado torto. */
  readonly maxTiltDegrees: number;
};

type PhysicalBody = RAPIER.RigidBody;

// ------------------------------------------------------------------- Bandeja
function addTrayCollider(
  rapier: RapierModule,
  world: RAPIER.World,
  half: Vec3,
  center: Vec3,
  surface: { friction: number; restitution: number },
): void {
  const desc = rapier.ColliderDesc.cuboid(half[0], half[1], half[2])
    .setTranslation(center[0], center[1], center[2])
    .setFriction(surface.friction)
    .setRestitution(surface.restitution);
  world.createCollider(desc);
}

/** Piso, quatro paredes altas e um teto: nenhum dado sai da bandeja. */
function buildTray(rapier: RapierModule, world: RAPIER.World): void {
  const width = TRAY_HALF_WIDTH;
  const depth = TRAY_HALF_DEPTH;
  const thick = TRAY_WALL_THICKNESS;
  const wallMiddle = TRAY_WALL_HEIGHT / 2;
  const floor = { friction: FLOOR_FRICTION, restitution: FLOOR_RESTITUTION };
  const wall = { friction: WALL_FRICTION, restitution: WALL_RESTITUTION };

  addTrayCollider(rapier, world, [width + thick, thick, depth + thick], [0, -thick, 0], floor);
  addTrayCollider(
    rapier,
    world,
    [width + thick, thick, depth + thick],
    [0, TRAY_CEILING_HEIGHT + thick, 0],
    wall,
  );
  addTrayCollider(
    rapier,
    world,
    [thick, wallMiddle, depth + thick],
    [width + thick, wallMiddle, 0],
    wall,
  );
  addTrayCollider(
    rapier,
    world,
    [thick, wallMiddle, depth + thick],
    [-width - thick, wallMiddle, 0],
    wall,
  );
  addTrayCollider(
    rapier,
    world,
    [width + thick, wallMiddle, thick],
    [0, wallMiddle, depth + thick],
    wall,
  );
  addTrayCollider(
    rapier,
    world,
    [width + thick, wallMiddle, thick],
    [0, wallMiddle, -depth - thick],
    wall,
  );
}

// ---------------------------------------------------------------------- Dados
function spawnBody(
  rapier: RapierModule,
  world: RAPIER.World,
  kind: DieKind,
  start: BodyStart,
  dieScale: number,
): PhysicalBody {
  const [qx, qy, qz, qw] = normalizeQuat(start.rotation);
  const [px, py, pz] = start.position;
  const [lx, ly, lz] = start.linearVelocity;
  const [ax, ay, az] = start.angularVelocity;

  const body = world.createRigidBody(
    rapier.RigidBodyDesc.dynamic()
      .setTranslation(px, py, pz)
      .setRotation({ x: qx, y: qy, z: qz, w: qw })
      .setLinvel(lx, ly, lz)
      .setAngvel({ x: ax, y: ay, z: az })
      .setLinearDamping(DIE_LINEAR_DAMPING)
      .setAngularDamping(DIE_ANGULAR_DAMPING)
      .setCcdEnabled(true),
  );

  const points = new Float32Array(
    getDieShape(kind).vertices.flatMap((vertex) => [
      vertex[0] * dieScale,
      vertex[1] * dieScale,
      vertex[2] * dieScale,
    ]),
  );
  const collider = rapier.ColliderDesc.convexHull(points);
  if (!collider) throw new Error(`Não deu para montar o colisor do ${kind}.`);
  world.createCollider(
    collider.setDensity(DIE_DENSITY).setFriction(DIE_FRICTION).setRestitution(DIE_RESTITUTION),
    body,
  );
  return body;
}

function isResting(body: PhysicalBody): boolean {
  if (body.isSleeping()) return true;
  const linear = body.linvel();
  const angular = body.angvel();
  const linearSquared = linear.x ** 2 + linear.y ** 2 + linear.z ** 2;
  const angularSquared = angular.x ** 2 + angular.y ** 2 + angular.z ** 2;
  return linearSquared < REST_LINEAR_SPEED ** 2 && angularSquared < REST_ANGULAR_SPEED ** 2;
}

function writePose(target: Float32Array, offset: number, body: PhysicalBody): void {
  const position = body.translation();
  const rotation = body.rotation();
  target[offset] = position.x;
  target[offset + 1] = position.y;
  target[offset + 2] = position.z;
  target[offset + 3] = rotation.x;
  target[offset + 4] = rotation.y;
  target[offset + 5] = rotation.z;
  target[offset + 6] = rotation.w;
}

// ------------------------------------------------------------------- Leitura
/** Posição (x, y, z) do corpo no quadro. */
export function positionAt(sim: SimulatedThrow, frame: number, body: number): Vec3 {
  const offset = (frame * sim.bodies.length + body) * FLOATS_PER_BODY;
  const { frames } = sim;
  return [frames[offset] ?? 0, frames[offset + 1] ?? 0, frames[offset + 2] ?? 0];
}

/** Rotação do corpo no quadro. */
export function rotationAt(sim: SimulatedThrow, frame: number, body: number): Quat {
  const offset = (frame * sim.bodies.length + body) * FLOATS_PER_BODY;
  const { frames } = sim;
  return [
    frames[offset + 3] ?? 0,
    frames[offset + 4] ?? 0,
    frames[offset + 5] ?? 0,
    frames[offset + 6] ?? 1,
  ];
}

function readDice(
  sides: readonly DieSides[],
  rotationOf: (body: number) => Quat,
): { values: number[]; maxTilt: number } {
  const values: number[] = [];
  let maxTilt = 0;
  let bodyIndex = 0;
  for (const die of sides) {
    const kinds = BODY_KINDS[die];
    const readings = kinds.map((kind, offset) => {
      const rotation = rotationOf(bodyIndex + offset);
      maxTilt = Math.max(maxTilt, tiltDegrees(kind, rotation));
      return readValue(kind, rotation);
    });
    bodyIndex += kinds.length;
    const [first = 0, second = 0] = readings;
    values.push(kinds.length === 1 ? first : combineHundred(first, second));
  }
  return { values, maxTilt };
}

/** O arremesso ficou limpo: tudo parou e nenhum dado ficou apoiado torto. */
export function isCleanThrow(sim: SimulatedThrow): boolean {
  return sim.settled && sim.maxTiltDegrees <= MAX_REST_TILT_DEGREES;
}

// ---------------------------------------------------------------- Simulação
export function simulateThrow(rapier: RapierModule, spec: ThrowSpec): SimulatedThrow {
  const sides = spec.dice.map((die) => die.sides);
  const kinds = spec.dice.flatMap((die) => BODY_KINDS[die.sides]);
  const starts = spec.dice.flatMap((die) => die.bodies);
  const dieScale = scaleForDiceCount(spec.dice.length);
  const stride = kinds.length * FLOATS_PER_BODY;

  const world = new rapier.World({ x: 0, y: -GRAVITY, z: 0 });
  try {
    world.timestep = STEP_SECONDS;
    buildTray(rapier, world);
    const bodies = kinds.map((kind, index) => {
      const start = starts[index];
      if (!start) throw new Error('Arremesso com menos corpos do que dados.');
      return spawnBody(rapier, world, kind, start, dieScale);
    });

    const frames = new Float32Array((MAX_SIMULATION_STEPS + 1) * stride);
    let frameCount = 0;
    const record = () => {
      bodies.forEach((body, index) =>
        writePose(frames, frameCount * stride + index * FLOATS_PER_BODY, body),
      );
      frameCount += 1;
    };

    record();
    let restStreak = 0;
    let settled = false;
    for (let step = 0; step < MAX_SIMULATION_STEPS && !settled; step++) {
      world.step();
      record();
      restStreak = bodies.every(isResting) ? restStreak + 1 : 0;
      settled = restStreak >= REST_STEPS;
    }

    const trimmed = frames.slice(0, frameCount * stride);
    const draft: SimulatedThrow = {
      sides,
      bodies: kinds,
      frames: trimmed,
      frameCount,
      settled,
      values: [],
      maxTiltDegrees: 0,
    };
    const { values, maxTilt } = readDice(sides, (body) => rotationAt(draft, frameCount - 1, body));
    return { ...draft, values, maxTiltDegrees: maxTilt };
  } finally {
    world.free();
  }
}
