import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { Color } from '@ttt3d/game-core';

/** Palette per player: fish body, fins/tail, eye. */
const FISH_COLORS: Record<Color, { body: string; fins: string; eye: string }> = {
  black: { body: '#1b1b1f', fins: '#3a3a42', eye: '#f4f4f5' },
  white: { body: '#f4f4f5', fins: '#c9c9d1', eye: '#1b1b1f' },
};

interface BeadProps {
  position: [number, number, number];
  color: Color;
  /** Animate a drop from above when true (the most recently placed bead). */
  animate?: boolean;
  highlight?: boolean;
  /** Stable seed (e.g. cell index) so each fish keeps its own heading. */
  seed?: number;
}

/**
 * A game "bead" rendered as a small low-poly fish. Fish are built from
 * primitives (ellipsoid body, cone tail/fins) so no external models are needed
 * and the app stays fully offline-capable. Each fish gets a deterministic yaw
 * from its seed so a stack looks like a school rather than clones.
 */
export function Bead({ position, color, animate, highlight, seed = 0 }: BeadProps) {
  const ref = useRef<Group>(null);
  const targetY = position[1];
  const dropOffset = useRef(animate ? 4 : 0);
  const c = FISH_COLORS[color];

  // Golden-angle spacing gives well-distributed, stable headings.
  const yaw = useMemo(() => (seed * 2.39996) % (Math.PI * 2), [seed]);

  useFrame((_, delta) => {
    if (!ref.current || dropOffset.current <= 0) return;
    dropOffset.current = Math.max(0, dropOffset.current - delta * 14);
    ref.current.position.y = targetY + dropOffset.current;
  });

  const bodyMat = (
    <meshStandardMaterial
      color={c.body}
      metalness={0.15}
      roughness={0.45}
      emissive={highlight ? '#22c55e' : '#000000'}
      emissiveIntensity={highlight ? 0.55 : 0}
    />
  );
  const finMat = (
    <meshStandardMaterial
      color={c.fins}
      metalness={0.1}
      roughness={0.6}
      emissive={highlight ? '#22c55e' : '#000000'}
      emissiveIntensity={highlight ? 0.4 : 0}
    />
  );

  return (
    <group
      ref={ref}
      position={[position[0], targetY + dropOffset.current, position[2]]}
      rotation={[0, yaw, 0]}
    >
      {/* Body: ellipsoid, nose towards +x */}
      <mesh castShadow scale={[1.35, 0.8, 0.62]}>
        <sphereGeometry args={[0.3, 24, 18]} />
        {bodyMat}
      </mesh>
      {/* Tail fin */}
      <mesh position={[-0.44, 0, 0]} rotation={[0, 0, Math.PI / 2 + 0.15]} castShadow>
        <coneGeometry args={[0.16, 0.26, 12]} />
        {finMat}
      </mesh>
      {/* Dorsal fin */}
      <mesh position={[0.02, 0.26, 0]} rotation={[0, 0, -0.35]}>
        <coneGeometry args={[0.09, 0.2, 10]} />
        {finMat}
      </mesh>
      {/* Side fins */}
      <mesh position={[0.08, -0.08, 0.17]} rotation={[0.9, 0, -0.6]}>
        <coneGeometry args={[0.06, 0.16, 8]} />
        {finMat}
      </mesh>
      <mesh position={[0.08, -0.08, -0.17]} rotation={[-0.9, 0, -0.6]}>
        <coneGeometry args={[0.06, 0.16, 8]} />
        {finMat}
      </mesh>
      {/* Eyes */}
      <mesh position={[0.3, 0.06, 0.13]}>
        <sphereGeometry args={[0.045, 10, 10]} />
        <meshStandardMaterial color={c.eye} roughness={0.3} />
      </mesh>
      <mesh position={[0.3, 0.06, -0.13]}>
        <sphereGeometry args={[0.045, 10, 10]} />
        <meshStandardMaterial color={c.eye} roughness={0.3} />
      </mesh>
    </group>
  );
}
