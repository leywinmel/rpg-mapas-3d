import { useEffect, useState } from 'react';
import { Billboard } from '@react-three/drei';
import { SRGBColorSpace, TextureLoader, type Texture } from 'three';
import { DEFAULT_TOKEN_COLORS } from '../constants';
import { useTokensStore } from '../hooks/tokens-store';
import { tokenFailures } from '../services/token-errors';
import type { Token } from '../types';
import { HIDDEN_TOKEN_OPACITY, TOKEN_SCENE_COLORS, TOKEN_SHAPE } from './token-scene';

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

/** Boneco simples de primitivas, nas duas cores escolhidas: roupa e detalhe. */
function FigureLook({ token, transparent }: LookProps) {
  const primary = token.colorPrimary ?? DEFAULT_TOKEN_COLORS.primary;
  const secondary = token.colorSecondary ?? DEFAULT_TOKEN_COLORS.secondary;
  const extra = materialProps(transparent);
  const { baseHeight, figureHeight } = TOKEN_SHAPE;

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

/** Base redonda e o corpo do token (cartão ou boneco), no tamanho de um token 1×1. */
export function TokenModel({ token, transparent }: LookProps) {
  const { baseRadius, baseHeight } = TOKEN_SHAPE;
  return (
    <>
      <mesh castShadow receiveShadow position={[0, baseHeight / 2, 0]}>
        <cylinderGeometry args={[baseRadius, baseRadius, baseHeight, 24]} />
        <meshStandardMaterial color={TOKEN_SCENE_COLORS.base} {...materialProps(transparent)} />
      </mesh>
      {token.kind === 'image' ? (
        <CardLook token={token} transparent={transparent} />
      ) : (
        <FigureLook token={token} transparent={transparent} />
      )}
    </>
  );
}
