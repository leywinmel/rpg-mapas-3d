import { Canvas } from '@react-three/fiber';
import { Grid, OrbitControls } from '@react-three/drei';

const FOG_COLOR = '#0d0b14';
const FLOOR_SIZE = 12;

/** Cena de teste do scaffold: chão em grade, um bloco e luz baixa com neblina (visual sombrio). */
export function DioramaPreview() {
  return (
    <Canvas className="scene" shadows camera={{ position: [8, 9, 8], fov: 45 }}>
      <color attach="background" args={[FOG_COLOR]} />
      <fog attach="fog" args={[FOG_COLOR, 12, 30]} />
      <ambientLight intensity={0.25} />
      <directionalLight castShadow position={[5, 10, 3]} intensity={1.4} color="#c9b8ff" />
      <mesh receiveShadow rotation-x={-Math.PI / 2}>
        <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
        <meshStandardMaterial color="#2a2533" />
      </mesh>
      <Grid
        args={[FLOOR_SIZE, FLOOR_SIZE]}
        position-y={0.01}
        cellColor="#3d3650"
        sectionColor="#5a4f78"
      />
      <mesh castShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#7c5cff" flatShading />
      </mesh>
      <OrbitControls makeDefault maxPolarAngle={Math.PI / 2.2} />
    </Canvas>
  );
}
