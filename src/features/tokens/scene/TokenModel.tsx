import { Component, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Billboard, useAnimations, useGLTF } from '@react-three/drei';
import {
  Box3,
  Mesh,
  type Material,
  type Object3D,
  SRGBColorSpace,
  TextureLoader,
  type Texture,
  Vector3,
} from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { DEFAULT_TOKEN_COLORS, tokenModelEntry, tokenModelUrl } from '../constants';
import { useTokensStore } from '../hooks/tokens-store';
import { tokenFailures } from '../services/token-errors';
import type { Token } from '../types';
import {
  fitUploadedModel,
  HIDDEN_TOKEN_OPACITY,
  PRIMITIVE_FIGURE_HEIGHT,
  TOKEN_SCENE_COLORS,
  TOKEN_SHAPE,
  UPLOADED_MODEL_FOOTPRINT,
  uploadedModelFacing,
} from './token-scene';

const loader = new TextureLoader();

/** Textura da imagem do token (URL assinada do bucket privado); nula enquanto carrega ou se falhar. */
function useTokenTexture(path: string | null): Texture | null {
  const getImageUrl = useTokensStore((state) => state.actions?.getImageUrl ?? null);
  const [texture, setTexture] = useState<Texture | null>(null);

  useEffect(() => {
    if (!path || !getImageUrl) return;
    let alive = true;
    let loaded: Texture | null = null;
    getImageUrl(path)
      .then((url) => loader.loadAsync(url))
      .then((result) => {
        result.colorSpace = SRGBColorSpace;
        loaded = result;
        if (alive) setTexture(result);
        else result.dispose();
      })
      .catch((error: unknown) => {
        // O cartão fica liso, mas o token continua na mesa e jogável.
        if (alive) tokenFailures.report(error, { action: 'load-image' });
      });
    return () => {
      alive = false;
      loaded?.dispose();
      setTexture(null);
    };
  }, [path, getImageUrl]);

  return texture;
}

type LookProps = { token: Token; transparent: boolean };

function materialProps(transparent: boolean) {
  return transparent ? { transparent: true, opacity: HIDDEN_TOKEN_OPACITY, depthWrite: false } : {};
}

/** "Papel-cartão": a imagem num cartão em pé, que gira para ficar de frente para a câmera. */
function CardLook({ token, transparent }: LookProps) {
  const texture = useTokenTexture(token.imagePath);
  const { cardWidth, cardHeight, cardThickness, baseHeight } = TOKEN_SHAPE;
  return (
    <Billboard lockX lockZ position={[0, baseHeight + cardHeight / 2, 0]}>
      <mesh castShadow>
        <boxGeometry args={[cardWidth, cardHeight, cardThickness]} />
        <meshStandardMaterial color={TOKEN_SCENE_COLORS.card} {...materialProps(transparent)} />
      </mesh>
      {texture && (
        <mesh position={[0, 0, cardThickness / 2 + 0.001]}>
          <planeGeometry args={[cardWidth * 0.94, cardHeight * 0.94]} />
          <meshStandardMaterial map={texture} {...materialProps(transparent)} />
        </mesh>
      )}
    </Billboard>
  );
}

/** Boneco simples de primitivas, nas duas cores escolhidas, crescido inteiro até a altura de gente. */
function FigureLook({ token, transparent }: LookProps) {
  return (
    <group scale={TOKEN_SHAPE.figureHeight / PRIMITIVE_FIGURE_HEIGHT}>
      <PrimitiveFigure token={token} transparent={transparent} />
    </group>
  );
}

/** Boneco de primitivas no tamanho em que foi desenhado (PRIMITIVE_FIGURE_HEIGHT). */
function PrimitiveFigure({ token, transparent }: LookProps) {
  const primary = token.colorPrimary ?? DEFAULT_TOKEN_COLORS.primary;
  const secondary = token.colorSecondary ?? DEFAULT_TOKEN_COLORS.secondary;
  const extra = materialProps(transparent);
  const figureHeight = PRIMITIVE_FIGURE_HEIGHT;
  // O grupo de fora escala a base junto: a altura dela volta ao normal aqui.
  const baseHeight = TOKEN_SHAPE.baseHeight / (TOKEN_SHAPE.figureHeight / PRIMITIVE_FIGURE_HEIGHT);

  if (token.modelKey === 'creature') {
    return (
      <group position={[0, baseHeight, 0]}>
        <mesh castShadow position={[0, figureHeight * 0.32, 0]} scale={[1, 0.8, 1.15]}>
          <sphereGeometry args={[0.3, 16, 12]} />
          <meshStandardMaterial color={primary} {...extra} />
        </mesh>
        <mesh castShadow position={[0, figureHeight * 0.62, 0.17]}>
          <sphereGeometry args={[0.16, 14, 10]} />
          <meshStandardMaterial color={primary} {...extra} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            castShadow
            position={[side * 0.1, figureHeight * 0.8, 0.14]}
            rotation={[0.3, 0, side * -0.4]}
          >
            <coneGeometry args={[0.04, 0.18, 8]} />
            <meshStandardMaterial color={secondary} {...extra} />
          </mesh>
        ))}
        {[-1, 1].map((side) => (
          <mesh key={`eye${side}`} position={[side * 0.06, figureHeight * 0.65, 0.31]}>
            <sphereGeometry args={[0.025, 8, 6]} />
            <meshBasicMaterial color={TOKEN_SCENE_COLORS.eyes} {...extra} />
          </mesh>
        ))}
      </group>
    );
  }

  return (
    <group position={[0, baseHeight, 0]}>
      <mesh castShadow position={[0, figureHeight * 0.3, 0]}>
        <cylinderGeometry args={[0.13, 0.22, figureHeight * 0.6, 14]} />
        <meshStandardMaterial color={primary} {...extra} />
      </mesh>
      <mesh castShadow position={[0, figureHeight * 0.58, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.06, 14]} />
        <meshStandardMaterial color={secondary} {...extra} />
      </mesh>
      <mesh castShadow position={[0, figureHeight * 0.76, 0]}>
        <sphereGeometry args={[0.14, 16, 12]} />
        <meshStandardMaterial color={TOKEN_SCENE_COLORS.skin} {...extra} />
      </mesh>
      <mesh castShadow position={[0, figureHeight * 0.88, 0]} rotation={[0, 0, 0]}>
        <coneGeometry args={[0.16, 0.14, 14]} />
        <meshStandardMaterial color={secondary} {...extra} />
      </mesh>
    </group>
  );
}

/** Nome da animação parada que o conversor deixa em cada boneco pronto. */
const IDLE_CLIP = 'Idle';
/** Boneco pronto olha para o sul do mapa (+z), de frente para a câmera padrão. */
const FACE_SOUTH_Y = Math.PI;

function fadeMaterials(object: Object3D, transparent: boolean): void {
  object.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    child.castShadow = true;
    const materials: Material[] = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) {
      material.transparent = transparent;
      material.opacity = transparent ? HIDDEN_TOKEN_OPACITY : 1;
      material.depthWrite = !transparent;
    }
  });
}

/** Boneco pronto (arquivo glTF com esqueleto), parado na animação "Idle", na altura do token. */
function ReadyLook({
  url,
  height,
  transparent,
}: {
  url: string;
  height: number;
  transparent: boolean;
}) {
  const gltf = useGLTF(url, false, true);
  // Cada token precisa do próprio esqueleto: dois tokens do mesmo boneco animam independentes.
  const object = useMemo(() => {
    const copy = cloneSkinned(gltf.scene);
    copy.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      child.material = Array.isArray(child.material)
        ? child.material.map((material: Material) => material.clone())
        : child.material.clone();
    });
    return copy;
  }, [gltf.scene]);
  const { actions } = useAnimations(gltf.animations, object);

  useEffect(() => {
    const idle = actions[IDLE_CLIP];
    if (!idle) return;
    // Começa num ponto diferente para uma fileira de tokens não respirar em uníssono.
    idle.reset().play().time = Math.random() * idle.getClip().duration;
    return () => {
      idle.stop();
    };
  }, [actions]);

  useEffect(() => fadeMaterials(object, transparent), [object, transparent]);

  const scale = TOKEN_SHAPE.figureHeight / height;
  return (
    <primitive
      object={object}
      position={[0, TOKEN_SHAPE.baseHeight, 0]}
      rotation={[0, FACE_SOUTH_Y, 0]}
      scale={scale}
    />
  );
}

function ModelLook({ token, transparent }: LookProps) {
  const entry = token.modelKey ? tokenModelEntry(token.modelKey) : null;
  const url = entry ? tokenModelUrl(entry) : null;
  if (entry && url && entry.height) {
    return <ReadyLook url={url} height={entry.height} transparent={transparent} />;
  }
  return <FigureLook token={token} transparent={transparent} />;
}

/**
 * URL do modelo enviado: undefined enquanto resolve, null quando o modelo foi apagado da
 * biblioteca ou a URL não veio.
 */
function useUploadedModelUrl(assetId: string | null): string | null | undefined {
  const getModelUrl = useTokensStore((state) => state.actions?.getModelUrl ?? null);
  const [resolved, setResolved] = useState<{ assetId: string; url: string | null } | null>(null);

  useEffect(() => {
    if (!assetId || !getModelUrl) return;
    let alive = true;
    getModelUrl(assetId)
      .then((url) => {
        if (alive) setResolved({ assetId, url });
      })
      .catch((error: unknown) => {
        if (!alive) return;
        tokenFailures.report(error, { action: 'load-model' });
        setResolved({ assetId, url: null });
      });
    return () => {
      alive = false;
    };
  }, [assetId, getModelUrl]);

  if (!assetId) return null;
  return resolved?.assetId === assetId ? resolved.url : undefined;
}

/** Caixa no lugar do modelo que sumiu ou não abriu: o token continua na mesa e jogável. */
function MissingModelLook({ transparent }: { transparent: boolean }) {
  const side = UPLOADED_MODEL_FOOTPRINT * 0.6;
  const { baseHeight, figureHeight } = TOKEN_SHAPE;
  return (
    <mesh castShadow position={[0, baseHeight + (figureHeight * 0.7) / 2, 0]}>
      <boxGeometry args={[side, figureHeight * 0.7, side]} />
      <meshStandardMaterial
        color={TOKEN_SCENE_COLORS.missingModel}
        {...materialProps(transparent)}
      />
    </mesh>
  );
}

/** Vértices do modelo no espaço dele (sem a pose da animação), para achar os pés. */
function modelPoints(object: Object3D): Vector3[] {
  object.updateMatrixWorld(true);
  const points: Vector3[] = [];
  object.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const positions = child.geometry.getAttribute('position');
    if (!positions) return;
    for (let index = 0; index < positions.count; index += 1) {
      points.push(
        new Vector3().fromBufferAttribute(positions, index).applyMatrix4(child.matrixWorld),
      );
    }
  });
  return points;
}

type ModelBoundaryProps = { fallback: ReactNode; children: ReactNode };

/** Um .glb quebrado vira a caixa; os outros tokens e a cena seguem de pé. */
class UploadedModelBoundary extends Component<ModelBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    tokenFailures.report(error, { action: 'load-model' });
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Modelo .glb enviado pelo mestre, encaixado no token (escala e origem variam por arquivo). */
function LoadedUploadedModel({ url, transparent }: { url: string; transparent: boolean }) {
  const gltf = useGLTF(url, false, true);
  const { object, fit, facing } = useMemo(() => {
    const copy = cloneSkinned(gltf.scene);
    copy.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      child.material = Array.isArray(child.material)
        ? child.material.map((material: Material) => material.clone())
        : child.material.clone();
    });
    return {
      object: copy,
      fit: fitUploadedModel(new Box3().setFromObject(copy)),
      facing: uploadedModelFacing(modelPoints(copy)),
    };
  }, [gltf.scene]);
  const { actions, names } = useAnimations(gltf.animations, object);

  useEffect(() => {
    // Modelo animado toca a primeira animação dele; o parado (o comum) fica como está.
    const first = names[0] ? actions[names[0]] : null;
    first?.reset().play();
    return () => {
      first?.stop();
    };
  }, [actions, names]);

  useEffect(() => fadeMaterials(object, transparent), [object, transparent]);

  // O encaixe já pôs o centro na origem: girar em volta dela não tira o modelo da base.
  return (
    <group rotation={[0, facing, 0]}>
      <primitive object={object} position={fit.position} scale={fit.scale} />
    </group>
  );
}

function UploadedLook({ token, transparent }: LookProps) {
  const url = useUploadedModelUrl(token.modelAssetId);
  if (url === undefined) return null;
  const fallback = <MissingModelLook transparent={transparent} />;
  if (url === null) return fallback;
  return (
    <UploadedModelBoundary key={url} fallback={fallback}>
      <Suspense fallback={null}>
        <LoadedUploadedModel url={url} transparent={transparent} />
      </Suspense>
    </UploadedModelBoundary>
  );
}

function BodyLook({ token, transparent }: LookProps) {
  if (token.kind === 'image') return <CardLook token={token} transparent={transparent} />;
  if (token.kind === 'asset') return <UploadedLook token={token} transparent={transparent} />;
  return <ModelLook token={token} transparent={transparent} />;
}

/** Base redonda e o corpo do token (cartão ou boneco), no tamanho de um token 1×1. */
export function TokenModel({ token, transparent }: LookProps) {
  const { baseRadius, baseHeight } = TOKEN_SHAPE;
  return (
    <>
      <mesh castShadow receiveShadow position={[0, baseHeight / 2, 0]}>
        <cylinderGeometry args={[baseRadius, baseRadius, baseHeight, 24]} />
        <meshStandardMaterial color={TOKEN_SCENE_COLORS.base} {...materialProps(transparent)} />
      </mesh>
      <BodyLook token={token} transparent={transparent} />
    </>
  );
}
