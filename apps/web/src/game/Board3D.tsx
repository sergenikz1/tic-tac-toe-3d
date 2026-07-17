import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { deindex, GameState, type Move } from '@ttt3d/game-core';
import { Bead } from './Bead.js';
import { EdgeMarkers } from './EdgeMarkers.js';

const SPACING = 1.18;
const LEVEL = 0.86; // vertical distance between stacked beads

interface Board3DProps {
  state: GameState;
  lastCell: number | null;
  canPlay: boolean;
  onPlay: (move: Move) => void;
}

export function Board3D({ state, lastCell, canPlay, onPlay }: Board3DProps) {
  const n = state.size;
  const mid = (n - 1) / 2;
  const stackH = n * LEVEL;
  const worldPos = (x: number, y: number, h: number): [number, number, number] => [
    (x - mid) * SPACING,
    h * LEVEL + LEVEL / 2,
    (y - mid) * SPACING,
  ];
  const winning = new Set(state.winningLine ?? []);
  const plate = n * SPACING + 0.9;
  const camScale = 0.75 + n * 0.28; // pull the camera back on bigger boards

  const pegs = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const [wx, , wz] = worldPos(x, y, 0);
      pegs.push(
        <group key={`peg-${x}-${y}`}>
          <mesh position={[wx, stackH / 2 - LEVEL / 2, wz]}>
            <cylinderGeometry args={[0.07, 0.09, stackH, 16]} />
            <meshStandardMaterial color="#f7e9c9" metalness={0.05} roughness={0.55} />
          </mesh>
          {/* Invisible tall hit-target for tapping a column directly in 3D. */}
          <mesh
            position={[wx, stackH / 2, wz]}
            visible={false}
            onClick={(e) => {
              e.stopPropagation();
              if (canPlay) onPlay({ x, y });
            }}
          >
            <cylinderGeometry args={[0.5, 0.5, stackH + 1, 8]} />
          </mesh>
        </group>,
      );
    }
  }

  const beads = [];
  for (let i = 0; i < state.board.length; i++) {
    const color = state.board[i];
    if (!color) continue;
    const { x, y, h } = deindex(i, n);
    beads.push(
      <Bead
        key={i}
        position={worldPos(x, y, h)}
        color={color}
        animate={i === lastCell}
        highlight={winning.has(i)}
        seed={i}
      />,
    );
  }

  return (
    <Canvas
      shadows
      camera={{ position: [2.9 * camScale, 2.9 * camScale, 3.4 * camScale], fov: 42 }}
      dpr={[1, 2]}
    >
      {/* Bright cartoon sky */}
      <color attach="background" args={['#59a7ff']} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[6, 10, 4]} intensity={1.3} castShadow />
      <directionalLight position={[-6, 4, -4]} intensity={0.45} />

      {/* Chunky grass-green base plate with a darker rim */}
      <mesh position={[0, -0.5, 0]} receiveShadow>
        <boxGeometry args={[plate, 0.34, plate]} />
        <meshStandardMaterial color="#41b653" roughness={0.85} />
      </mesh>
      <mesh position={[0, -0.72, 0]}>
        <boxGeometry args={[plate + 0.25, 0.16, plate + 0.25]} />
        <meshStandardMaterial color="#2c7d39" roughness={0.9} />
      </mesh>

      <EdgeMarkers size={n} spacing={SPACING} />
      {pegs}
      {beads}

      <OrbitControls
        enablePan={false}
        minDistance={3.2 * camScale}
        maxDistance={7 * camScale}
        target={[0, stackH * 0.35, 0]}
      />
    </Canvas>
  );
}
