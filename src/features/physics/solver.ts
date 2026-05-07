import { centerOfMass, distance3, midpoint3, squaredDistanceToPoint } from "./math";
import type { DistanceProjector } from "./wasmKernel";
import type { CollisionEvent, SimulationState, StepOptions } from "./types";

const gravity = -9.3;
const floorY = -0.68;
const damping = 0.988;
const obstacle = {
  x: 0.44,
  y: -0.32,
  z: 0,
  radius: 0.23,
};

export class PbdSolver {
  private readonly collisions: CollisionEvent[] = [];

  constructor(
    public readonly state: SimulationState,
    public readonly projector: DistanceProjector,
  ) {}

  get projectorMode(): "wasm" | "typescript" {
    return this.projector.mode;
  }

  step(options: StepOptions): CollisionEvent[] {
    this.collisions.length = 0;
    const dt = Math.min(Math.max(options.dt, 1 / 240), 1 / 30);
    this.integrate(dt, options.wind);

    if (options.twist) {
      this.applyTwist(options.twist.center, options.twist.amount, options.twist.radius);
    }

    for (let iteration = 0; iteration < options.iterations; iteration += 1) {
      this.projector.project(
        this.state.positions,
        this.state.inverseMasses,
        this.state.constraints,
        options.stiffnessScale,
      );

      if (options.grab) {
        this.applyGrab(options.grab.particle, options.grab.target, options.grab.strength);
      }

      this.projectCollisions(iteration === options.iterations - 1);
    }

    this.breakOverstretchedConstraints(2.35);

    return [...this.collisions];
  }

  tearNear(point: [number, number, number], radius: number): number {
    const radiusSquared = radius * radius;
    const before = this.state.constraints.length;

    this.state.constraints = this.state.constraints.filter((constraint) => {
      if (!constraint.tearable) return true;
      const midpoint = midpoint3(this.state.positions, constraint.a, constraint.b);

      return squaredDistanceToPoint(midpoint, point) > radiusSquared;
    });

    const removed = before - this.state.constraints.length;
    if (removed > 0) this.state.constraintVersion += 1;

    return removed;
  }

  center(): [number, number, number] {
    return centerOfMass(this.state.positions);
  }

  private integrate(dt: number, wind: number): void {
    const positions = this.state.positions;
    const previous = this.state.previous;

    for (let particle = 0; particle < this.state.inverseMasses.length; particle += 1) {
      if (this.state.inverseMasses[particle] === 0) {
        const offset = particle * 3;
        previous[offset] = positions[offset]!;
        previous[offset + 1] = positions[offset + 1]!;
        previous[offset + 2] = positions[offset + 2]!;
        continue;
      }

      const offset = particle * 3;
      const x = positions[offset]!;
      const y = positions[offset + 1]!;
      const z = positions[offset + 2]!;
      const vx = (x - previous[offset]!) * damping;
      const vy = (y - previous[offset + 1]!) * damping;
      const vz = (z - previous[offset + 2]!) * damping;
      const gust = Math.sin(performance.now() * 0.0016 + y * 4.1 + particle * 0.13) * wind;

      previous[offset] = x;
      previous[offset + 1] = y;
      previous[offset + 2] = z;
      positions[offset] = x + vx + gust * dt * dt * 5.5;
      positions[offset + 1] = y + vy + gravity * dt * dt;
      positions[offset + 2] = z + vz + Math.cos(particle * 0.31) * wind * dt * dt * 2.8;
    }
  }

  private applyGrab(particle: number, target: [number, number, number], strength: number): void {
    if (this.state.inverseMasses[particle] === 0) return;

    const offset = particle * 3;
    this.state.positions[offset] =
      this.state.positions[offset]! + (target[0] - this.state.positions[offset]!) * strength;
    this.state.positions[offset + 1] =
      this.state.positions[offset + 1]! +
      (target[1] - this.state.positions[offset + 1]!) * strength;
    this.state.positions[offset + 2] =
      this.state.positions[offset + 2]! +
      (target[2] - this.state.positions[offset + 2]!) * strength;
  }

  private applyTwist(center: [number, number, number], amount: number, radius: number): void {
    const positions = this.state.positions;
    const radiusSquared = radius * radius;

    for (let particle = 0; particle < this.state.inverseMasses.length; particle += 1) {
      if (this.state.inverseMasses[particle] === 0) continue;

      const offset = particle * 3;
      const x = positions[offset]! - center[0];
      const y = positions[offset + 1]! - center[1];
      const z = positions[offset + 2]! - center[2];
      const distanceSquared = x * x + y * y + z * z;

      if (distanceSquared > radiusSquared) continue;

      const falloff = 1 - distanceSquared / radiusSquared;
      const angle = amount * falloff;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      positions[offset] = center[0] + x * cos - z * sin;
      positions[offset + 2] = center[2] + x * sin + z * cos;
      positions[offset + 1] = center[1] + y + amount * 0.015 * falloff;
    }
  }

  private projectCollisions(emitEvents: boolean): void {
    const positions = this.state.positions;
    const previous = this.state.previous;

    for (let particle = 0; particle < this.state.inverseMasses.length; particle += 1) {
      if (this.state.inverseMasses[particle] === 0) continue;

      const offset = particle * 3;
      const radius = this.state.radii[particle]!;

      if (positions[offset + 1]! - radius < floorY) {
        const penetration = floorY - (positions[offset + 1]! - radius);
        positions[offset + 1] = floorY + radius;
        previous[offset] = previous[offset]! + (positions[offset]! - previous[offset]!) * 0.18;
        previous[offset + 2] = previous[offset + 2]! + (positions[offset + 2]! - previous[offset + 2]!) * 0.18;

        if (emitEvents && penetration > 0.012) {
          this.collisions.push({
            point: [positions[offset]!, floorY, positions[offset + 2]!],
            impulse: penetration * 20,
          });
        }
      }

      const dx = positions[offset]! - obstacle.x;
      const dy = positions[offset + 1]! - obstacle.y;
      const dz = positions[offset + 2]! - obstacle.z;
      const minDistance = obstacle.radius + radius;
      const distance = Math.hypot(dx, dy, dz);

      if (distance > 0.0001 && distance < minDistance) {
        const push = minDistance - distance;
        positions[offset] = positions[offset]! + (dx / distance) * push;
        positions[offset + 1] = positions[offset + 1]! + (dy / distance) * push;
        positions[offset + 2] = positions[offset + 2]! + (dz / distance) * push;

        if (emitEvents && push > 0.009) {
          this.collisions.push({
            point: [positions[offset]!, positions[offset + 1]!, positions[offset + 2]!],
            impulse: push * 26,
          });
        }
      }
    }
  }

  private breakOverstretchedConstraints(maxRatio: number): void {
    const before = this.state.constraints.length;
    this.state.constraints = this.state.constraints.filter((constraint) => {
      if (!constraint.tearable) return true;

      return distance3(this.state.positions, constraint.a, constraint.b) / constraint.rest < maxRatio;
    });

    if (before !== this.state.constraints.length) {
      this.state.constraintVersion += 1;
    }
  }
}

export const collisionObstacle = obstacle;
export const collisionFloorY = floorY;
