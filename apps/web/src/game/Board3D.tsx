import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { deindex, GameState, SIZE, type Move } from '@ttt3d/game-core';
import { Bead } from './Bead.js';
import { EdgeMarkers } from './EdgeMarkers.js';

const SPACING = 1.18;
const LEVEL = 0.86; // vertical distance between stacked beads
const STACK_H = SIZE * LEVEL;

function worldPos(x: number, y: number, h: number): [number, number, number] {
  return [(x - 1.5) * SPACING, h * LEVEL + LEVEL / 2, (y - 1.5) * SPACING];
}

interface Board3DProps {
  state: GameState;
  lastCell: number | null;
  canPlay: boolean;
  onPlay: (move: Move) => void;
}

export function Board3D({ state, lastCell, canPlay, onPlay }: Board3DProps) {
  const winning = new Set(state.winningLine ?? []);

  const pegs = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const [wx, , wz] = worldPos(x, y, 0);
      pegs.push(
        <group key={`peg-${x}-${y}`}>
          <mesh position={[wx, STACK_H / 2 - LEVEL / 2, wz]}>
            <cylinderGeometry args={[0.07, 0.07, STACK_H, 16]} />
            <meshStandardMaterial color="#9ca3af" metalness={0.3} roughness={0.6} />
          </mesh>
          {/* Invisible tall hit-target for tapping a column directly in 3D. */}
          <mesh
            position={[wx, STACK_H / 2, wz]}
            visible={false}
            onClick={(e) => {
              e.stopPropagation();
              if (canPlay) onPlay({ x, y });
            }}
          >
            <cylinderGeometry args={[0.5, 0.5, STACK_H + 1, 8]} />
          </mesh>
        </group>,
      );
    }
  }

  const beads = [];
  for (let i = 0; i < state.board.length; i++) {
    const color = state.board[i];
    if (!color) continue;
    const { x, y, h } = deindex(i);
    beads.push(
      <Bead
        key={i}
        position={worldPos(x, y, h)}
        color={color}
        animate={i === lastCell}
        highlight={winning.has(i)}
      />,
    );
  }

  return (
    <Canvas shadows camera={{ position: [5.5, 5.5, 6.5], fov: 42 }} dpr={[1, 2]}>
      <color attach="background" args={['#0e1117']} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[6, 10, 4]} intensity={1.1} castShadow />
      <directionalLight position={[-6, 4, -4]} intensity={0.4} />

      {/* Base plate */}
      <mesh position={[0, -0.5, 0]} receiveShadow>
        <boxGeometry args={[4.8, 0.3, 4.8]} />
        <meshStandardMaterial color="#3f3f46" roughness={0.9} />
      </mesh>

      <EdgeMarkers />
      {pegs}
      {beads}

      <OrbitControls
        enablePan={false}
        minDistance={5}
        maxDistance={14}
        target={[0, 1.4, 0]}
      />
    </Canvas>
  );
}
