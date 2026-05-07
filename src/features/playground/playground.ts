import { CollisionAudio } from "../audio/collisionAudio";
import { createPreset } from "../physics/presets";
import { PbdSolver } from "../physics/solver";
import type { GrabHandle, SimulationState, TwistImpulse } from "../physics/types";
import { createDistanceProjector } from "../physics/wasmKernel";
import { createThreeScene, THREE, type ThreeScene } from "../rendering/threeScene";
import type { PlaygroundSettings, PresetKind } from "./settings";

export interface PlaygroundStats {
  fps: number;
  particles: number;
  constraints: number;
  renderer: "WebGPU" | "WebGL";
  wasm: "wasm" | "typescript";
}

export interface PlaygroundOptions {
  host: HTMLElement;
  canvas: HTMLCanvasElement;
  settings: PlaygroundSettings;
  onStats(stats: PlaygroundStats): void;
  onStatus(message: string): void;
}

export class Playground {
  private settings: PlaygroundSettings;
  private state: SimulationState;
  private solver: PbdSolver;
  private scene: ThreeScene;
  private readonly audio = new CollisionAudio();
  private raf = 0;
  private paused = false;
  private lastTime = performance.now();
  private statsStartedAt = performance.now();
  private frames = 0;
  private grab: GrabHandle | null = null;
  private dragPlane = new THREE.Plane();
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly pointerPoint = new THREE.Vector3();
  private pendingTwist: TwistImpulse | null = null;
  private activeTwist: { center: [number, number, number]; lastX: number } | null = null;
  private readonly resizeObserver: ResizeObserver;

  private constructor(
    private readonly options: PlaygroundOptions,
    settings: PlaygroundSettings,
    state: SimulationState,
    solver: PbdSolver,
    scene: ThreeScene,
  ) {
    this.settings = settings;
    this.state = state;
    this.solver = solver;
    this.scene = scene;
    this.audio.setEnabled(settings.audioEnabled);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(options.host);
    this.bindPointerEvents();
    this.resize();
    this.loop();
  }

  static async create(options: PlaygroundOptions): Promise<Playground> {
    options.onStatus("Loading C++ WASM physics kernel");
    const projector = await createDistanceProjector();
    const state = createPreset(options.settings.preset);
    const solver = new PbdSolver(state, projector);
    options.onStatus(
      projector.mode === "wasm"
        ? "C++ WASM physics kernel ready"
        : "WASM unavailable; TypeScript solver active",
    );
    const scene = await createThreeScene(options.canvas, options.host, state);

    return new Playground(options, options.settings, state, solver, scene);
  }

  async unlockAudio(): Promise<void> {
    await this.audio.unlock();
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  setSettings(settings: PlaygroundSettings): void {
    const previousPreset = this.settings.preset;
    this.settings = settings;
    this.audio.setEnabled(settings.audioEnabled);

    if (previousPreset !== settings.preset) {
      this.reset(settings.preset);
    }
  }

  reset(preset: PresetKind = this.settings.preset): void {
    this.state = createPreset(preset);
    this.solver = new PbdSolver(this.state, this.solver.projector);
    this.scene.rebuild(this.state);
    this.grab = null;
    this.activeTwist = null;
    this.pendingTwist = null;
    this.options.onStatus(`${preset} preset reset`);
    this.emitStats();
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.options.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.options.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.options.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.options.canvas.removeEventListener("pointercancel", this.onPointerUp);
    this.scene.dispose();
  }

  private loop = (): void => {
    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    if (!this.paused) {
      const collisions = this.solver.step({
        dt,
        iterations: this.settings.quality === "high" ? 8 : 6,
        stiffnessScale: this.settings.stiffness,
        wind: this.settings.wind,
        grab: this.grab,
        twist: this.pendingTwist,
      });
      this.pendingTwist = null;
      this.audio.playCollisions(collisions);
    }

    this.scene.update(this.state);
    this.scene.render();
    this.frames += 1;

    if (now - this.statsStartedAt >= 350) {
      this.emitStats();
      this.frames = 0;
      this.statsStartedAt = now;
    }

    this.raf = requestAnimationFrame(this.loop);
  };

  private emitStats(): void {
    const elapsed = Math.max(1, performance.now() - this.statsStartedAt);
    this.options.onStats({
      fps: Math.round((this.frames * 1000) / elapsed),
      particles: this.state.positions.length / 3,
      constraints: this.state.constraints.length,
      renderer: this.scene.rendererName,
      wasm: this.solver.projectorMode,
    });
  }

  private bindPointerEvents(): void {
    this.options.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.options.canvas.addEventListener("pointermove", this.onPointerMove);
    this.options.canvas.addEventListener("pointerup", this.onPointerUp);
    this.options.canvas.addEventListener("pointercancel", this.onPointerUp);
  }

  private onPointerDown = (event: PointerEvent): void => {
    this.options.canvas.setPointerCapture(event.pointerId);

    if (this.settings.tool === "tear") {
      this.tearAt(event);
      return;
    }

    if (this.settings.tool === "twist") {
      this.activeTwist = {
        center: this.solver.center(),
        lastX: event.clientX,
      };
      return;
    }

    const picked = this.pickParticle(event, 0.095);
    if (picked === null) return;

    const offset = picked * 3;
    const point = new THREE.Vector3(
      this.state.positions[offset]!,
      this.state.positions[offset + 1]!,
      this.state.positions[offset + 2]!,
    );
    const normal = new THREE.Vector3();
    this.scene.camera.getWorldDirection(normal);
    this.dragPlane.setFromNormalAndCoplanarPoint(normal, point);
    this.grab = {
      particle: picked,
      target: [point.x, point.y, point.z],
      strength: 0.48,
    };
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (this.settings.tool === "tear" && event.buttons > 0) {
      this.tearAt(event);
      return;
    }

    if (this.activeTwist && event.buttons > 0) {
      const amount = (event.clientX - this.activeTwist.lastX) * 0.012;
      this.pendingTwist = {
        center: this.activeTwist.center,
        amount,
        radius: 1.05,
      };
      this.activeTwist.lastX = event.clientX;
      return;
    }

    if (!this.grab) return;

    const ray = this.updateRay(event);
    if (ray.intersectPlane(this.dragPlane, this.pointerPoint)) {
      this.grab.target = [this.pointerPoint.x, this.pointerPoint.y, this.pointerPoint.z];
    }
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (this.options.canvas.hasPointerCapture(event.pointerId)) {
      this.options.canvas.releasePointerCapture(event.pointerId);
    }

    this.grab = null;
    this.activeTwist = null;
  };

  private tearAt(event: PointerEvent): void {
    const picked = this.pickParticle(event, 0.22);
    if (picked === null) return;

    const offset = picked * 3;
    const point: [number, number, number] = [
      this.state.positions[offset]!,
      this.state.positions[offset + 1]!,
      this.state.positions[offset + 2]!,
    ];
    const removed = this.solver.tearNear(point, this.state.kind === "jelly" ? 0.18 : 0.13);

    if (removed > 0) {
      this.audio.playTear(removed);
      this.options.onStatus(`Tore ${removed} constraints`);
    }
  }

  private pickParticle(event: PointerEvent, threshold: number): number | null {
    const ray = this.updateRay(event);
    let bestParticle: number | null = null;
    let bestDistance = threshold * threshold;
    const point = new THREE.Vector3();

    for (let particle = 0; particle < this.state.positions.length / 3; particle += 1) {
      const offset = particle * 3;
      point.set(
        this.state.positions[offset]!,
        this.state.positions[offset + 1]!,
        this.state.positions[offset + 2]!,
      );
      const distance = ray.distanceSqToPoint(point);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestParticle = particle;
      }
    }

    return bestParticle;
  }

  private updateRay(event: PointerEvent): THREE.Ray {
    const rect = this.options.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    this.raycaster.setFromCamera(this.pointer, this.scene.camera);

    return this.raycaster.ray;
  }

  private resize(): void {
    const rect = this.options.host.getBoundingClientRect();
    this.scene.resize(rect.width, rect.height);
  }
}

export async function createPlayground(options: PlaygroundOptions): Promise<Playground> {
  return Playground.create(options);
}
