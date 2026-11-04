/**
 * Miniaturas das peças e dos modelos enviados, renderizadas no navegador. Um
 * único renderizador fora da tela atende todas (cada <canvas> 3D próprio
 * gastaria um contexto WebGL, e o navegador só permite uns 16). O resultado vira
 * imagem (data URL) guardada em memória: cada peça é desenhada uma vez.
 */
import {
  Box3,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  Sphere,
  Vector3,
  WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { FLOOR_CAP_DEPTH, pieceCatalog, SCENE_PALETTE } from '@/features/scene';
import { bakeModel } from '@/features/scene/catalog/model-layers';
import {
  getColumnGeometry,
  getPieceLayers,
  type PieceLayer,
} from '@/features/scene/catalog/piece-geometry';

const THUMBNAIL_PX = 128;
const CAMERA_FOV = 35;
const FRAME_PADDING = 1.25;
const FLOOR_THUMB_COLUMN = 0.3;
const WALL_THUMB_LEVELS = 2;

type Stage = { renderer: WebGLRenderer; scene: Scene; camera: PerspectiveCamera };

let stage: Stage | null = null;

function getStage(): Stage {
  if (stage) return stage;
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(THUMBNAIL_PX, THUMBNAIL_PX, false);
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  scene.add(new HemisphereLight('#8a7fb8', '#1a1420', 1.4));
  const key = new DirectionalLight('#ffc89a', 2.2);
  key.position.set(-2, 4, 3);
  scene.add(key);
  const camera = new PerspectiveCamera(CAMERA_FOV, 1, 0.01, 100);
  stage = { renderer, scene, camera };
  return stage;
}

/** Enquadra o objeto numa vista diagonal de maquete, igual à da mesa. */
function frameCamera(camera: PerspectiveCamera, object: Group): void {
  const sphere = new Box3().setFromObject(object).getBoundingSphere(new Sphere());
  const radius = Math.max(sphere.radius, 0.1) * FRAME_PADDING;
  const distance = radius / Math.sin((CAMERA_FOV * Math.PI) / 360);
  const direction = new Vector3(1, 0.9, 1.2).normalize();
  camera.position.copy(sphere.center).addScaledVector(direction, distance);
  camera.near = distance / 100;
  camera.far = distance * 10;
  camera.updateProjectionMatrix();
  camera.lookAt(sphere.center);
}

function snapshot(group: Group): string {
  const { renderer, scene, camera } = getStage();
  scene.add(group);
  frameCamera(camera, group);
  renderer.render(scene, camera);
  scene.remove(group);
  return renderer.domElement.toDataURL('image/png');
}

function groupOf(layers: readonly PieceLayer[]): Group {
  const group = new Group();
  for (const layer of layers) group.add(new Mesh(layer.geometry, layer.material));
  return group;
}

const cache = new Map<string, Promise<string>>();

function cached(key: string, render: () => Promise<string>): Promise<string> {
  const existing = cache.get(key);
  if (existing) return existing;
  const pending = render();
  // Falhou uma vez? Permite tentar de novo depois (ex: rede voltou).
  pending.catch(() => cache.delete(key));
  cache.set(key, pending);
  return pending;
}

function pieceGroup(key: string): Group {
  const entry = pieceCatalog.get(key);
  const layers = getPieceLayers(key);
  if (entry?.kind === 'wall') {
    const group = new Group();
    for (let level = 0; level < WALL_THUMB_LEVELS; level += 1) {
      const segment = groupOf(layers);
      segment.position.y = level;
      group.add(segment);
    }
    return group;
  }
  const group = groupOf(layers);
  if (entry?.kind === 'floor') {
    const column = new Mesh(
      getColumnGeometry(),
      new MeshStandardMaterial({
        color: entry.sideColor ?? SCENE_PALETTE.stoneSide,
        flatShading: true,
      }),
    );
    column.scale.y = FLOOR_THUMB_COLUMN;
    column.position.y = -FLOOR_CAP_DEPTH;
    group.add(column);
  }
  return group;
}

/** Miniatura de uma peça do catálogo. */
export function renderPieceThumbnail(key: string): Promise<string> {
  return cached(`piece:${key}`, async () => {
    const entry = pieceCatalog.get(key);
    if (entry?.thumbnail) return entry.thumbnail;
    if (entry?.visual.type === 'model') return renderModelThumbnail(entry.visual.url);
    return snapshot(pieceGroup(key));
  });
}

// O meshopt vem embutido no three (sem download): os modelos dos pacotes usam essa compressão.
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

/** Miniatura de um .glb (enviado pelo mestre ou de um pacote), já encaixado numa casa. */
export function renderModelThumbnail(url: string): Promise<string> {
  return cached(`model:${url}`, async () => {
    const gltf = await loader.loadAsync(url);
    return snapshot(groupOf(bakeModel(gltf.scene, { fitToCell: true })));
  });
}
