import {
  TRAY_FRONT_RIM_HEIGHT,
  TRAY_HALF_DEPTH,
  TRAY_HALF_WIDTH,
  TRAY_RIM_HEIGHT,
  TRAY_WALL_THICKNESS,
} from '../../physics/constants';
import { TRAY_EMBER_COLOR, TRAY_FELT_COLOR, TRAY_LIGHT_COLOR, TRAY_RIM_COLOR } from './palette';

const FLOOR_MARGIN = 0.4;
const RIM_OPACITY = 0.6;
const SHADOW_MAP_SIZE = 1024;
const SHADOW_REACH = 8;
const AMBIENT_INTENSITY = 1.15;
const KEY_LIGHT_INTENSITY = 3.4;
const EMBER_LIGHT_INTENSITY = 70;
const EMBER_LIGHT_REACH = 18;

type Wall = { position: [number, number, number]; size: [number, number, number] };

const rimLong = TRAY_HALF_WIDTH * 2 + TRAY_WALL_THICKNESS * 2;
const rimDeep = TRAY_HALF_DEPTH * 2;
const rimOffset = TRAY_WALL_THICKNESS / 2;

/** As quatro bordas da bandeja, rente ao lugar onde as paredes de colisão começam. */
const WALLS: readonly Wall[] = [
  {
    position: [0, TRAY_RIM_HEIGHT / 2, -(TRAY_HALF_DEPTH + rimOffset)],
    size: [rimLong, TRAY_RIM_HEIGHT, TRAY_WALL_THICKNESS],
  },
  {
    position: [0, TRAY_FRONT_RIM_HEIGHT / 2, TRAY_HALF_DEPTH + rimOffset],
    size: [rimLong, TRAY_FRONT_RIM_HEIGHT, TRAY_WALL_THICKNESS],
  },
  {
    position: [-(TRAY_HALF_WIDTH + rimOffset), TRAY_RIM_HEIGHT / 2, 0],
    size: [TRAY_WALL_THICKNESS, TRAY_RIM_HEIGHT, rimDeep],
  },
  {
    position: [TRAY_HALF_WIDTH + rimOffset, TRAY_RIM_HEIGHT / 2, 0],
    size: [TRAY_WALL_THICKNESS, TRAY_RIM_HEIGHT, rimDeep],
  },
];

/** Feltro escuro, bordas baixas e luz de brasa: a mesa de jogo onde os dados rolam. */
export function TrayScene() {
  return (
    <>
      <ambientLight intensity={AMBIENT_INTENSITY} />
      <directionalLight
        castShadow
        position={[4, 11, 6]}
        intensity={KEY_LIGHT_INTENSITY}
        color={TRAY_LIGHT_COLOR}
        shadow-mapSize={[SHADOW_MAP_SIZE, SHADOW_MAP_SIZE]}
        shadow-camera-left={-SHADOW_REACH}
        shadow-camera-right={SHADOW_REACH}
        shadow-camera-top={SHADOW_REACH}
        shadow-camera-bottom={-SHADOW_REACH}
        shadow-bias={-0.0005}
      />
      <pointLight
        position={[-4, 4, 3]}
        intensity={EMBER_LIGHT_INTENSITY}
        distance={EMBER_LIGHT_REACH}
        color={TRAY_EMBER_COLOR}
      />

      <mesh receiveShadow rotation-x={-Math.PI / 2}>
        <planeGeometry
          args={[
            TRAY_HALF_WIDTH * 2 + FLOOR_MARGIN * 2 + TRAY_WALL_THICKNESS * 2,
            TRAY_HALF_DEPTH * 2 + FLOOR_MARGIN * 2 + TRAY_WALL_THICKNESS * 2,
          ]}
        />
        <meshStandardMaterial color={TRAY_FELT_COLOR} roughness={1} />
      </mesh>

      {WALLS.map((wall, index) => (
        <mesh key={index} position={wall.position} castShadow receiveShadow>
          <boxGeometry args={wall.size} />
          <meshStandardMaterial
            color={TRAY_RIM_COLOR}
            roughness={0.8}
            transparent
            opacity={RIM_OPACITY}
          />
        </mesh>
      ))}
    </>
  );
}
