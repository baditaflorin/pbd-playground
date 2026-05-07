import * as THREE from "three";
import type { SimulationState } from "../physics/types";
import { collisionFloorY, collisionObstacle } from "../physics/solver";

type AnyRenderer = THREE.WebGLRenderer & {
  init?: () => Promise<void>;
  renderAsync?: (scene: THREE.Scene, camera: THREE.Camera) => Promise<void>;
};

export interface ThreeScene {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: AnyRenderer;
  readonly canvas: HTMLCanvasElement;
  readonly rendererName: "WebGPU" | "WebGL";
  update(state: SimulationState): void;
  rebuild(state: SimulationState): void;
  resize(width: number, height: number): void;
  render(): void;
  dispose(): void;
}

export async function createThreeScene(
  canvas: HTMLCanvasElement,
  host: HTMLElement,
  state: SimulationState,
): Promise<ThreeScene> {
  const rendererResult = await createRenderer(canvas);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111417);
  scene.fog = new THREE.Fog(0x111417, 3.2, 6.2);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 12);
  frameCamera(camera, state);

  const ambient = new THREE.HemisphereLight(0xb8e4ff, 0x2b2017, 1.65);
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(-1.4, 2.5, 1.8);
  const rim = new THREE.DirectionalLight(0xffd08a, 0.9);
  rim.position.set(2.4, 1.3, -2.2);
  scene.add(ambient, key, rim);

  const floor = createFloor();
  const obstacle = createObstacle();
  scene.add(floor, obstacle);

  const renderer = rendererResult.renderer;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  let bodies = createBodies(state);
  scene.add(bodies.root);

  function update(stateToRender: SimulationState): void {
    updateBodies(bodies, stateToRender);
  }

  function rebuild(nextState: SimulationState): void {
    scene.remove(bodies.root);
    bodies.dispose();
    bodies = createBodies(nextState);
    scene.add(bodies.root);
    frameCamera(camera, nextState);
  }

  function resize(width: number, height: number): void {
    const safeWidth = Math.max(1, width);
    const safeHeight = Math.max(1, height);
    camera.aspect = safeWidth / safeHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(safeWidth, safeHeight, false);
  }

  function render(): void {
    if (typeof renderer.renderAsync === "function") {
      void renderer.renderAsync(scene, camera);
      return;
    }

    renderer.render(scene, camera);
  }

  const rect = host.getBoundingClientRect();
  resize(rect.width, rect.height);

  return {
    scene,
    camera,
    renderer,
    canvas,
    rendererName: rendererResult.name,
    update,
    rebuild,
    resize,
    render,
    dispose() {
      bodies.dispose();
      renderer.dispose();
    },
  };
}

function frameCamera(camera: THREE.PerspectiveCamera, state: SimulationState): void {
  const center = new THREE.Vector3();
  const count = state.positions.length / 3;

  for (let i = 0; i < count; i += 1) {
    const offset = i * 3;
    center.x += state.positions[offset]!;
    center.y += state.positions[offset + 1]!;
    center.z += state.positions[offset + 2]!;
  }

  center.multiplyScalar(1 / count);
  camera.position.set(0, center.y + 0.12, state.cameraDistance);
  camera.lookAt(center.x, center.y, center.z);
}

async function createRenderer(
  canvas: HTMLCanvasElement,
): Promise<{ renderer: AnyRenderer; name: "WebGPU" | "WebGL" }> {
  const forceWebGl = new URLSearchParams(window.location.search).get("renderer") === "webgl";

  if (!forceWebGl && "gpu" in navigator) {
    try {
      const webgpu = await import("three/webgpu");
      const renderer = new webgpu.WebGPURenderer({
        canvas,
        antialias: true,
        alpha: false,
      }) as unknown as AnyRenderer;
      await renderer.init?.();
      return { renderer, name: "WebGPU" };
    } catch {
      // Fall through to WebGL. Some Chromium builds expose navigator.gpu without a working adapter.
    }
  }

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  }) as AnyRenderer;

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  return { renderer, name: "WebGL" };
}

interface Bodies {
  root: THREE.Group;
  points: THREE.InstancedMesh;
  pointMatrix: THREE.Matrix4;
  lines: THREE.LineSegments;
  linePositions: Float32Array;
  surface: THREE.Mesh | null;
  dispose(): void;
}

function createBodies(state: SimulationState): Bodies {
  const root = new THREE.Group();
  const particleCount = state.positions.length / 3;
  const sphere = new THREE.SphereGeometry(state.particleRadius, 10, 8);
  const pointMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(state.accent),
    roughness: 0.58,
    metalness: 0.05,
    emissive: new THREE.Color(state.accent).multiplyScalar(0.08),
  });
  const points = new THREE.InstancedMesh(sphere, pointMaterial, particleCount);
  points.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  root.add(points);

  const visibleConstraints = state.constraints.filter((constraint) => constraint.visual);
  const linePositions = new Float32Array(visibleConstraints.length * 2 * 3);
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
  const lineMaterial = new THREE.LineBasicMaterial({
    color: new THREE.Color(state.tint),
    transparent: true,
    opacity: 0.55,
  });
  const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
  root.add(lines);

  let surface: THREE.Mesh | null = null;
  if (state.surfaceIndices) {
    const surfaceGeometry = new THREE.BufferGeometry();
    surfaceGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(state.positions.length), 3),
    );
    surfaceGeometry.setIndex(new THREE.BufferAttribute(state.surfaceIndices, 1));
    surfaceGeometry.computeVertexNormals();

    const surfaceMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(state.tint),
      roughness: 0.42,
      metalness: 0.02,
      transmission: state.kind === "jelly" ? 0.28 : 0,
      transparent: true,
      opacity: state.kind === "cloth" ? 0.72 : 0.64,
      side: THREE.DoubleSide,
      clearcoat: state.kind === "jelly" ? 0.45 : 0.05,
    });

    surface = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
    root.add(surface);
  }

  const bodies = {
    root,
    points,
    pointMatrix: new THREE.Matrix4(),
    lines,
    linePositions,
    surface,
    dispose() {
      sphere.dispose();
      pointMaterial.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
      if (surface) {
        surface.geometry.dispose();
        const material = surface.material;
        if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
        else material.dispose();
      }
    },
  };

  updateBodies(bodies, state);

  return bodies;
}

function updateBodies(bodies: Bodies, state: SimulationState): void {
  for (let particle = 0; particle < state.positions.length / 3; particle += 1) {
    const offset = particle * 3;
    bodies.pointMatrix.compose(
      new THREE.Vector3(
        state.positions[offset]!,
        state.positions[offset + 1]!,
        state.positions[offset + 2]!,
      ),
      new THREE.Quaternion(),
      new THREE.Vector3(1, 1, 1),
    );
    bodies.points.setMatrixAt(particle, bodies.pointMatrix);
  }
  bodies.points.instanceMatrix.needsUpdate = true;

  const visibleConstraints = state.constraints.filter((constraint) => constraint.visual);
  if (visibleConstraints.length * 6 !== bodies.linePositions.length) {
    bodies.lines.geometry.dispose();
    bodies.linePositions = new Float32Array(visibleConstraints.length * 6);
    bodies.lines.geometry = new THREE.BufferGeometry();
    bodies.lines.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(bodies.linePositions, 3),
    );
  }

  for (let i = 0; i < visibleConstraints.length; i += 1) {
    const constraint = visibleConstraints[i]!;
    const aOffset = constraint.a * 3;
    const bOffset = constraint.b * 3;
    const lineOffset = i * 6;
    bodies.linePositions[lineOffset] = state.positions[aOffset]!;
    bodies.linePositions[lineOffset + 1] = state.positions[aOffset + 1]!;
    bodies.linePositions[lineOffset + 2] = state.positions[aOffset + 2]!;
    bodies.linePositions[lineOffset + 3] = state.positions[bOffset]!;
    bodies.linePositions[lineOffset + 4] = state.positions[bOffset + 1]!;
    bodies.linePositions[lineOffset + 5] = state.positions[bOffset + 2]!;
  }

  const lineAttribute = bodies.lines.geometry.getAttribute("position") as THREE.BufferAttribute;
  lineAttribute.needsUpdate = true;
  bodies.lines.geometry.computeBoundingSphere();

  if (bodies.surface) {
    const attribute = bodies.surface.geometry.getAttribute("position") as THREE.BufferAttribute;
    attribute.array.set(state.positions);
    attribute.needsUpdate = true;
    bodies.surface.geometry.computeVertexNormals();
    bodies.surface.geometry.computeBoundingSphere();
  }
}

function createFloor(): THREE.Group {
  const group = new THREE.Group();
  const grid = new THREE.GridHelper(3.8, 24, 0x38545e, 0x253238);
  grid.position.y = collisionFloorY;
  grid.material.opacity = 0.36;
  grid.material.transparent = true;
  group.add(grid);

  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(4, 4),
    new THREE.MeshStandardMaterial({
      color: 0x151a1d,
      roughness: 0.9,
      metalness: 0,
      transparent: true,
      opacity: 0.84,
    }),
  );
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = collisionFloorY - 0.003;
  group.add(plane);

  return group;
}

function createObstacle(): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(collisionObstacle.radius, 32, 18),
    new THREE.MeshPhysicalMaterial({
      color: 0xf36f72,
      roughness: 0.34,
      metalness: 0.08,
      clearcoat: 0.4,
      transparent: true,
      opacity: 0.88,
    }),
  );
  mesh.position.set(collisionObstacle.x, collisionObstacle.y, collisionObstacle.z);

  return mesh;
}

export { THREE };
