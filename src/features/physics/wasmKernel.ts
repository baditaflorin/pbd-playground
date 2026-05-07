import type { DistanceConstraint } from "./types";

type ProjectDistanceConstraints = (
  positions: number,
  inverseMasses: number,
  aIndices: number,
  bIndices: number,
  restLengths: number,
  stiffnesses: number,
  count: number,
) => void;

interface PbdKernelExports {
  memory: WebAssembly.Memory;
  __heap_base?: WebAssembly.Global | number;
  project_distance_constraints: ProjectDistanceConstraints;
}

export interface DistanceProjector {
  readonly mode: "wasm" | "typescript";
  project(
    positions: Float32Array,
    inverseMasses: Float32Array,
    constraints: readonly DistanceConstraint[],
    stiffnessScale: number,
  ): void;
}

function projectWithTypeScript(
  positions: Float32Array,
  inverseMasses: Float32Array,
  constraints: readonly DistanceConstraint[],
  stiffnessScale: number,
): void {
  for (const constraint of constraints) {
    const aOffset = constraint.a * 3;
    const bOffset = constraint.b * 3;
    const wa = inverseMasses[constraint.a]!;
    const wb = inverseMasses[constraint.b]!;
    const weight = wa + wb;

    if (weight <= 0.000001) continue;

    let dx = positions[bOffset]! - positions[aOffset]!;
    let dy = positions[bOffset + 1]! - positions[aOffset + 1]!;
    let dz = positions[bOffset + 2]! - positions[aOffset + 2]!;
    const length = Math.hypot(dx, dy, dz);

    if (length <= 0.000001) continue;

    const correction = ((length - constraint.rest) / length) * constraint.stiffness * stiffnessScale;
    dx *= correction;
    dy *= correction;
    dz *= correction;

    const aw = wa / weight;
    const bw = wb / weight;

    positions[aOffset] = positions[aOffset]! + dx * aw;
    positions[aOffset + 1] = positions[aOffset + 1]! + dy * aw;
    positions[aOffset + 2] = positions[aOffset + 2]! + dz * aw;
    positions[bOffset] = positions[bOffset]! - dx * bw;
    positions[bOffset + 1] = positions[bOffset + 1]! - dy * bw;
    positions[bOffset + 2] = positions[bOffset + 2]! - dz * bw;
  }
}

export class TypeScriptDistanceProjector implements DistanceProjector {
  readonly mode = "typescript";

  project(
    positions: Float32Array,
    inverseMasses: Float32Array,
    constraints: readonly DistanceConstraint[],
    stiffnessScale: number,
  ): void {
    projectWithTypeScript(positions, inverseMasses, constraints, stiffnessScale);
  }
}

class WasmDistanceProjector implements DistanceProjector {
  readonly mode = "wasm";

  private heapBase: number;

  constructor(private readonly exports: PbdKernelExports) {
    const heapBase = exports.__heap_base;
    this.heapBase =
      typeof heapBase === "number" ? heapBase : heapBase instanceof WebAssembly.Global ? Number(heapBase.value) : 0;
  }

  project(
    positions: Float32Array,
    inverseMasses: Float32Array,
    constraints: readonly DistanceConstraint[],
    stiffnessScale: number,
  ): void {
    if (constraints.length === 0) return;

    const count = constraints.length;
    const positionBytes = positions.byteLength;
    const inverseMassBytes = inverseMasses.byteLength;
    const indexBytes = count * Uint32Array.BYTES_PER_ELEMENT;
    const scalarBytes = count * Float32Array.BYTES_PER_ELEMENT;

    let cursor = this.align(this.heapBase, 4);
    const positionsPtr = cursor;
    cursor += positionBytes;
    cursor = this.align(cursor, 4);
    const inverseMassesPtr = cursor;
    cursor += inverseMassBytes;
    cursor = this.align(cursor, 4);
    const aIndicesPtr = cursor;
    cursor += indexBytes;
    cursor = this.align(cursor, 4);
    const bIndicesPtr = cursor;
    cursor += indexBytes;
    cursor = this.align(cursor, 4);
    const restLengthsPtr = cursor;
    cursor += scalarBytes;
    cursor = this.align(cursor, 4);
    const stiffnessesPtr = cursor;
    cursor += scalarBytes;

    this.ensureMemory(cursor);

    const buffer = this.exports.memory.buffer;
    new Float32Array(buffer, positionsPtr, positions.length).set(positions);
    new Float32Array(buffer, inverseMassesPtr, inverseMasses.length).set(inverseMasses);

    const aIndices = new Uint32Array(buffer, aIndicesPtr, count);
    const bIndices = new Uint32Array(buffer, bIndicesPtr, count);
    const restLengths = new Float32Array(buffer, restLengthsPtr, count);
    const stiffnesses = new Float32Array(buffer, stiffnessesPtr, count);

    for (let i = 0; i < count; i += 1) {
      const constraint = constraints[i]!;
      aIndices[i] = constraint.a;
      bIndices[i] = constraint.b;
      restLengths[i] = constraint.rest;
      stiffnesses[i] = constraint.stiffness * stiffnessScale;
    }

    this.exports.project_distance_constraints(
      positionsPtr,
      inverseMassesPtr,
      aIndicesPtr,
      bIndicesPtr,
      restLengthsPtr,
      stiffnessesPtr,
      count,
    );

    positions.set(new Float32Array(this.exports.memory.buffer, positionsPtr, positions.length));
  }

  private ensureMemory(requiredBytes: number): void {
    const memory = this.exports.memory;
    if (memory.buffer.byteLength >= requiredBytes) return;

    const pageSize = 65536;
    const neededPages = Math.ceil((requiredBytes - memory.buffer.byteLength) / pageSize);
    memory.grow(neededPages);
  }

  private align(value: number, alignment: number): number {
    return Math.ceil(value / alignment) * alignment;
  }
}

export async function createDistanceProjector(): Promise<DistanceProjector> {
  try {
    const wasmUrl = `${import.meta.env.BASE_URL}wasm/pbd_kernel.wasm`;
    const response = await fetch(wasmUrl);

    if (!response.ok) {
      throw new Error(`WASM request failed: ${response.status}`);
    }

    const bytes = await response.arrayBuffer();
    const module = await WebAssembly.instantiate(bytes, {});
    const exports = module.instance.exports as unknown as PbdKernelExports;

    if (!exports.memory || typeof exports.project_distance_constraints !== "function") {
      throw new Error("PBD WASM exports are incomplete");
    }

    return new WasmDistanceProjector(exports);
  } catch {
    return new TypeScriptDistanceProjector();
  }
}
