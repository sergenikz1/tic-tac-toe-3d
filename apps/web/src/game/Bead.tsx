import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import type { Color } from '@ttt3d/game-core';

const COLORS: Record<Color, string> = {
  black: '#1b1b1f',
  white: '#f4f4f5',
};

interface BeadProps {
  position: [number, number, number];
  color: Color;
  /** Animate a drop from above when true (the most recently placed bead). */
  animate?: boolean;
  highlight?: boolean;
}

export function Bead({ position, color, animate, highlight }: BeadProps) {
  const ref = useRef<Mesh>(null);
  const targetY = position[1];
  const dropOffset = useRef(animate ? 4 : 0);

  useFrame((_, delta) => {
    if (!ref.current || dropOffset.current <= 0) return;
    // Ease the bead down onto the stack.
    dropOffset.current = Math.max(0, dropOffset.current - delta * 14);
    ref.current.position.y = targetY + dropOffset.current;
  });

  return (
    <mesh ref={ref} position={[position[0], targetY + dropOffset.current, position[2]]} castShadow>
      <sphereGeometry args={[0.42, 32, 32]} />
      <meshStandardMaterial
        color={COLORS[color]}
        metalness={0.1}
        roughness={color === 'black' ? 0.35 : 0.5}
        emissive={highlight ? '#22c55e' : '#000000'}
        emissiveIntensity={highlight ? 0.6 : 0}
      />
    </mesh>
  );
}
