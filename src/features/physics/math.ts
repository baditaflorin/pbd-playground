export function distance3(
  positions: Float32Array,
  a: number,
  b: number,
): number {
  const ai = a * 3;
  const bi = b * 3;
  const dx = positions[ai]! - positions[bi]!;
  const dy = positions[ai + 1]! - positions[bi + 1]!;
  const dz = positions[ai + 2]! - positions[bi + 2]!;

  return Math.hypot(dx, dy, dz);
}

export function midpoint3(
  positions: Float32Array,
  a: number,
  b: number,
): [number, number, number] {
  const ai = a * 3;
  const bi = b * 3;

  return [
    (positions[ai]! + positions[bi]!) * 0.5,
    (positions[ai + 1]! + positions[bi + 1]!) * 0.5,
    (positions[ai + 2]! + positions[bi + 2]!) * 0.5,
  ];
}

export function squaredDistanceToPoint(
  a: [number, number, number],
  b: [number, number, number],
): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];

  return dx * dx + dy * dy + dz * dz;
}

export function centerOfMass(positions: Float32Array): [number, number, number] {
  const count = positions.length / 3;
  const center: [number, number, number] = [0, 0, 0];

  for (let i = 0; i < count; i += 1) {
    const offset = i * 3;
    center[0] += positions[offset]!;
    center[1] += positions[offset + 1]!;
    center[2] += positions[offset + 2]!;
  }

  center[0] /= count;
  center[1] /= count;
  center[2] /= count;

  return center;
}
