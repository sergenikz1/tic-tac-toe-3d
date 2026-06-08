import { EDGE_COLORS } from '@ttt3d/game-core';

/**
 * Colored bars on the four sides of the base so the player keeps orientation
 * while rotating the model. The same colors border the bottom 2D grid:
 *   north = green (-Z, top),  east = red (+X, right),
 *   south = yellow (+Z, bottom), west = blue (-X, left).
 */
export function EdgeMarkers() {
  const half = 2.1; // just outside the 4x4 footprint
  const len = 4.0;
  const y = -0.35;
  return (
    <group>
      {/* North (green) along -Z */}
      <mesh position={[0, y, -half]}>
        <boxGeometry args={[len, 0.15, 0.2]} />
        <meshStandardMaterial color={EDGE_COLORS.north} />
      </mesh>
      {/* South (yellow) along +Z */}
      <mesh position={[0, y, half]}>
        <boxGeometry args={[len, 0.15, 0.2]} />
        <meshStandardMaterial color={EDGE_COLORS.south} />
      </mesh>
      {/* East (red) along +X */}
      <mesh position={[half, y, 0]}>
        <boxGeometry args={[0.2, 0.15, len]} />
        <meshStandardMaterial color={EDGE_COLORS.east} />
      </mesh>
      {/* West (blue) along -X */}
      <mesh position={[-half, y, 0]}>
        <boxGeometry args={[0.2, 0.15, len]} />
        <meshStandardMaterial color={EDGE_COLORS.west} />
      </mesh>
    </group>
  );
}
