/**
 * Onde fica a parte que mexe em cada peça com interação (RPG-44). Os modelos dos pacotes vêm
 * numa malha só, sem a porta separada; então a parte é recortada da malha por caixas (o
 * triângulo cujo centro cai na caixa vai junto) ou desenhada à parte (a folha da porta). As
 * medidas são do modelo já normalizado, em casas, com a frente para +z.
 */
export type Vec3 = readonly [number, number, number];

/** Caixa alinhada aos eixos, do canto de menor x, y, z ao de maior. */
export type ModelBox = { readonly min: Vec3; readonly max: Vec3 };

export type MovingPart = {
  /** Triângulos do modelo que mexem com a parte. */
  readonly select?: readonly ModelBox[];
  /** Folha desenhada à parte, com o material do modelo que tem este nome. */
  readonly panel?: { readonly material: string; readonly box: ModelBox };
  /** O eixo do giro (a dobradiça). */
  readonly pivot: Vec3;
  /** O giro em x, y e z (radianos) com a peça toda aberta. */
  readonly turn: Vec3;
};

export type InteractiveModel = {
  /** Triângulos que somem (o vão da porta). */
  readonly remove?: readonly ModelBox[];
  /** Miolo escuro atrás do vão: sem ele, a porta aberta mostraria o chão do outro lado. */
  readonly interior?: ModelBox;
  readonly parts: readonly MovingPart[];
};

/** Quanto a porta de trás gira: passa um pouco do ângulo reto, como porta de furgão aberta. */
const REAR_DOOR_TURN = 1.75;
/** Vão das portas de trás da van e da ambulância (as duas usam a mesma carroceria). */
const REAR_GAP = { halfWidth: 0.8, bottom: 0.45, top: 2.34, back: -2.6 } as const;
const DOOR_THICKNESS = 0.06;
/** Até onde, de trás para a frente, vai o miolo escuro (o fundo da cabine). */
const INTERIOR_FRONT = 0.45;
/** Os triângulos da traseira têm o centro atrás deste z. */
const REAR_FACE_Z = -2.45;

function rearDoors(bodyMaterial: string): InteractiveModel {
  const { halfWidth, bottom, top, back } = REAR_GAP;
  const leaf = (fromX: number, toX: number): ModelBox => ({
    // A folha fica por fora da traseira: cobre o que sobrou da porta desenhada no modelo.
    min: [Math.min(fromX, toX), bottom, back - DOOR_THICKNESS],
    max: [Math.max(fromX, toX), top, back],
  });
  return {
    remove: [{ min: [-halfWidth, bottom, back - 1], max: [halfWidth, top, REAR_FACE_Z] }],
    interior: {
      min: [-halfWidth + 0.02, bottom, back + 0.01],
      max: [halfWidth - 0.02, top, INTERIOR_FRONT],
    },
    parts: [
      {
        panel: { material: bodyMaterial, box: leaf(-halfWidth, 0) },
        pivot: [-halfWidth, 0, back],
        turn: [0, REAR_DOOR_TURN, 0],
      },
      {
        panel: { material: bodyMaterial, box: leaf(halfWidth, 0) },
        pivot: [halfWidth, 0, back],
        turn: [0, -REAR_DOOR_TURN, 0],
      },
    ],
  };
}

/** Pá do trator: a lâmina (tudo à frente do eixo) e os dois braços, girando no apoio dos braços. */
const LOADER_ARM: InteractiveModel = {
  parts: [
    {
      select: [
        { min: [-2, -1, 0.84], max: [2, 3, 2] },
        { min: [0.33, 0.42, 0.62], max: [0.7, 3, 2] },
        { min: [-0.7, 0.42, 0.62], max: [-0.33, 3, 2] },
      ],
      pivot: [0, 0.66, 0.6],
      turn: [-0.45, 0, 0],
    },
  ],
};

export const INTERACTIVE_MODELS: Readonly<Record<string, InteractiveModel>> = {
  'mod-van': rearDoors('body dark blue'),
  'mod-ambulancia': rearDoors('body white'),
  'mod-trator-pa': LOADER_ARM,
};

/** Segundos para abrir ou fechar de todo. */
export const INTERACTION_SECONDS = 0.7;
