import { centerOfMass, distance3, midpoint3, squaredDistanceToPoint } from "./math";
import type { DistanceProjector } from "./wasmKernel";
import type { CollisionEvent, Obstacle, SimulationState, StepOptions } from "./types";

const gravity = -9.3;
const floorY = -0.68;
const damping = 0.988;
const defaultObstacle: Obstacle = {
  kind: "sphere",
  center: [0.44, -0.32, 0],
  radius: 0.23,
  color: 0xf36f72,
  label: "Hero sphere",
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
    const obstacles = this.state.obstacles ?? [];

    for (let particle = 0; particle < this.state.inverseMasses.length; particle += 1) {
      if (this.state.inverseMasses[particle] === 0) continue;

      const offset = particle * 3;
      const radius = this.state.radii[particle]!;

      if (positions[offset + 1]! - radius < floorY) {
        const penetration = floorY - (positions[offset + 1]! - radius);
        positions[offset + 1] = floorY + radius;
        previous[offset] = previous[offset]! + (positions[offset]! - previous[offset]!) * 0.18;
        previous[offset + 2] =
          previous[offset + 2]! + (positions[offset + 2]! - previous[offset + 2]!) * 0.18;

        if (emitEvents && penetration > 0.012) {
          this.collisions.push({
            point: [positions[offset]!, floorY, positions[offset + 2]!],
            impulse: penetration * 20,
          });
        }
      }

      for (const ob of obstacles) {
        this.resolveObstacle(ob, offset, radius, emitEvents);
      }
    }
  }

  private resolveObstacle(ob: Obstacle, offset: number, radius: number, emitEvents: boolean): void {
    const positions = this.state.positions;

    if (ob.kind === "sphere") {
      const dx = positions[offset]! - ob.center[0];
      const dy = positions[offset + 1]! - ob.center[1];
      const dz = positions[offset + 2]! - ob.center[2];
      const minDistance = ob.radius + radius;
      const distance = Math.hypot(dx, dy, dz);
      if (distance > 0.0001 && distance < minDistance) {
        const push = minDistance - distance;
        const nx = dx / distance;
        const ny = dy / distance;
        const nz = dz / distance;
        positions[offset] = positions[offset]! + nx * push;
        positions[offset + 1] = positions[offset + 1]! + ny * push;
        positions[offset + 2] = positions[offset + 2]! + nz * push;
        if (emitEvents && push > 0.009) {
          this.collisions.push({
            point: [positions[offset]!, positions[offset + 1]!, positions[offset + 2]!],
            impulse: push * 26,
          });
        }
      }
      return;
    }

    if (ob.kind === "box") {
      // Resolve against the inflated AABB: nearest-axis push-out keeps the
      // particle's centre at least `radius` from each box face.
      const lx = ob.center[0] - ob.halfExtents[0] - radius;
      const hx = ob.center[0] + ob.halfExtents[0] + radius;
      const ly = ob.center[1] - ob.halfExtents[1] - radius;
      const hy = ob.center[1] + ob.halfExtents[1] + radius;
      const lz = ob.center[2] - ob.halfExtents[2] - radius;
      const hz = ob.center[2] + ob.halfExtents[2] + radius;
      const px = positions[offset]!;
      const py = positions[offset + 1]!;
      const pz = positions[offset + 2]!;
      if (px < lx || px > hx || py < ly || py > hy || pz < lz || pz > hz) return;

      const overlapXLow = px - lx;
      const overlapXHigh = hx - px;
      const overlapYLow = py - ly;
      const overlapYHigh = hy - py;
      const overlapZLow = pz - lz;
      const overlapZHigh = hz - pz;
      let minOverlap = overlapXLow;
      let axis = 0;
      let sign = -1;
      const consider = (overlap: number, nextAxis: number, nextSign: number) => {
        if (overlap < minOverlap) {
          minOverlap = overlap;
          axis = nextAxis;
          sign = nextSign;
        }
      };
      consider(overlapXHigh, 0, 1);
      consider(overlapYLow, 1, -1);
      consider(overlapYHigh, 1, 1);
      consider(overlapZLow, 2, -1);
      consider(overlapZHigh, 2, 1);
      positions[offset + axis] = positions[offset + axis]! + minOverlap * sign;
      if (emitEvents && minOverlap > 0.009) {
        this.collisions.push({
          point: [positions[offset]!, positions[offset + 1]!, positions[offset + 2]!],
          impulse: minOverlap * 22,
        });
      }
      return;
    }

    // Plane: keep particle centre on the positive side of the half-space
    // n · p >= offset + radius. Inflate by radius so the particle's surface
    // touches the plane on contact.
    const nx = ob.normal[0];
    const ny = ob.normal[1];
    const nz = ob.normal[2];
    const distance =
      nx * positions[offset]! +
      ny * positions[offset + 1]! +
      nz * positions[offset + 2]! -
      ob.offset;
    if (distance >= radius) return;
    const push = radius - distance;
    positions[offset] = positions[offset]! + nx * push;
    positions[offset + 1] = positions[offset + 1]! + ny * push;
    positions[offset + 2] = positions[offset + 2]! + nz * push;
    if (emitEvents && push > 0.009) {
      this.collisions.push({
        point: [positions[offset]!, positions[offset + 1]!, positions[offset + 2]!],
        impulse: push * 24,
      });
    }
  }

  private breakOverstretchedConstraints(maxRatio: number): void {
    const before = this.state.constraints.length;
    this.state.constraints = this.state.constraints.filter((constraint) => {
      if (!constraint.tearable) return true;

      return (
        distance3(this.state.positions, constraint.a, constraint.b) / constraint.rest < maxRatio
      );
    });

    if (before !== this.state.constraints.length) {
      this.state.constraintVersion += 1;
    }
  }
}

export const collisionFloorY = floorY;
export const defaultSceneObstacle = defaultObstacle;
