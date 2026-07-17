import { EDGE_COLORS } from '@ttt3d/game-core';

interface EdgeMarkersProps {
  size: number;
  spacing: number;
}

/**
 * Colored bars on the four sides of the base so the player keeps orientation
 * while rotating the model. The same colors border the bottom 2D grid:
 *   north = green (-Z, top),  east = red (+X, right),
 *   south = yellow (+Z, bottom), west = blue (-X, left).
 */
export function EdgeMarkers({ size, spacing }: EdgeMarkersProps) {
  const half = (size * spacing) / 2 + 0.28;
  const len = size * spacing - 0.2;
  const y = -0.3;
  const bar = (
    key: string,
    color: string,
    pos: [number, number, number],
    dims: [number, number, number],
  ) => (
    <mesh key={key} position={pos}>
      <boxGeometry args={dims} />
      <meshStandardMaterial color={color} roughness={0.5} />
    </mesh>
  );
  return (
    <group>
      {bar('n', EDGE_COLORS.north, [0, y, -half], [len, 0.2, 0.24])}
      {bar('s', EDGE_COLORS.south, [0, y, half], [len, 0.2, 0.24])}
      {bar('e', EDGE_COLORS.east, [half, y, 0], [0.24, 0.2, len])}
      {bar('w', EDGE_COLORS.west, [-half, y, 0], [0.24, 0.2, len])}
    </group>
  );
}
