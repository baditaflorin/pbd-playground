import type { PresetKind } from "../playground/settings";

export interface DistanceConstraint {
  a: number;
  b: number;
  rest: number;
  stiffness: number;
  tearable: boolean;
  visual: boolean;
}

export interface SimulationState {
  kind: PresetKind;
  positions: Float32Array;
  previous: Float32Array;
  inverseMasses: Float32Array;
  radii: Float32Array;
  constraints: DistanceConstraint[];
  surfaceIndices: Uint32Array | null;
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
