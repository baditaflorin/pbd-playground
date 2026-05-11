import type { PresetKind } from "../playground/settings";

export interface DistanceConstraint {
  a: number;
  b: number;
  rest: number;
  stiffness: number;
  tearable: boolean;
  visual: boolean;
}

export interface SphereObstacle {
  kind: "sphere";
  center: [number, number, number];
  radius: number;
  color?: number;
  label?: string;
}

export interface BoxObstacle {
  kind: "box";
  center: [number, number, number];
  halfExtents: [number, number, number];
  color?: number;
  label?: string;
}

/**
 * A static infinite plane defined by its normal (unit length) and the signed
 * distance from the world origin along that normal. Particle collision keeps
 * the centre of the particle at least `radius` away on the positive side of
 * the plane (n · p - d >= radius).
 */
export interface PlaneObstacle {
  kind: "plane";
  normal: [number, number, number];
  offset: number;
  color?: number;
  label?: string;
  // Optional axis-aligned box that bounds the rendered slab. When omitted,
  // renderers fall back to a large rectangle near the world origin.
  extent?: [number, number, number];
}

export type Obstacle = SphereObstacle | BoxObstacle | PlaneObstacle;

export interface SimulationState {
  kind: PresetKind;
  positions: Float32Array;
  previous: Float32Array;
  inverseMasses: Float32Array;
  radii: Float32Array;
  constraints: DistanceConstraint[];
  surfaceIndices: Uint32Array | null;
  obstacles: Obstacle[];
  tint: string;
  accent: string;
  particleRadius: number;
  cameraDistance: number;
  constraintVersion: number;
}

export interface GrabHandle {
  particle: number;
  target: [number, number, number];
  strength: number;
}

export interface TwistImpulse {
  center: [number, number, number];
  amount: number;
  radius: number;
}

export interface CollisionEvent {
  point: [number, number, number];
  impulse: number;
}

export interface StepOptions {
  dt: number;
  iterations: number;
  stiffnessScale: number;
  wind: number;
  grab: GrabHandle | null;
  twist: TwistImpulse | null;
}
