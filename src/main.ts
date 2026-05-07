import {
  Activity,
  Github,
  Hand,
  Heart,
  Pause,
  Play,
  RefreshCw,
  Rotate3D,
  Scissors,
  Volume2,
  VolumeX,
  Wind,
  createIcons,
} from "lucide";
import "./styles.css";
import { pagesUrl, paypalUrl, repositoryUrl, resolveBuildInfo } from "./lib/buildInfo";
import {
  defaultSettings,
  loadSettings,
  playgroundSettingsSchema,
  saveSettings,
  type PlaygroundSettings,
} from "./features/playground/settings";
import type { Playground, PlaygroundStats } from "./features/playground/playground";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App root not found");

let settings = loadSettings();
let playground: Playground | null = null;
let paused = false;

app.innerHTML = `
  <main class="shell">
    <header class="topbar" aria-label="Project links and build metadata">
      <a class="brand" href="${pagesUrl}" aria-label="pbd-playground home">
        <span class="brand-mark"></span>
        <span>pbd-playground</span>
      </a>
      <nav class="link-row" aria-label="Project links">
        <a class="text-link" href="${repositoryUrl}" target="_blank" rel="noreferrer">
          <i data-lucide="github" aria-hidden="true"></i>
          <span>Star on GitHub</span>
        </a>
        <a class="text-link paypal" href="${paypalUrl}" target="_blank" rel="noreferrer">
          <i data-lucide="heart" aria-hidden="true"></i>
          <span>PayPal</span>
        </a>
      </nav>
      <div class="build-strip" aria-label="Build version">
        <span>v<span data-build-version>${__APP_VERSION__}</span></span>
        <span>commit <a href="${repositoryUrl}/commit/${__GIT_COMMIT__}" data-build-commit target="_blank" rel="noreferrer">${__GIT_COMMIT__}</a></span>
      </div>
    </header>

    <section class="stage" aria-label="Position-based dynamics playground">
      <div class="canvas-host" data-canvas-host>
        <canvas data-playground-canvas aria-label="Soft body simulation canvas"></canvas>
        <div class="launch" data-launch-panel>
          <button class="launch-button" type="button" data-launch>
            <i data-lucide="play" aria-hidden="true"></i>
            <span>Start simulation</span>
          </button>
          <div class="launch-meta">
            <span data-launch-status>Ready</span>
          </div>
        </div>
      </div>

      <aside class="control-dock" aria-label="Simulation controls">
        <div class="dock-group">
          <label class="field-label" for="preset">Body</label>
          <select id="preset" data-setting="preset">
            <option value="cloth">Cloth</option>
            <option value="jelly">Jelly</option>
            <option value="rope">Rope</option>
            <option value="hair">Hair</option>
          </select>
        </div>

        <fieldset class="tool-set">
          <legend>Tool</legend>
          <button type="button" class="tool-button" data-tool="drag" title="Drag">
            <i data-lucide="hand" aria-hidden="true"></i>
            <span>Drag</span>
          </button>
          <button type="button" class="tool-button" data-tool="twist" title="Twist">
            <i data-lucide="rotate-3d" aria-hidden="true"></i>
            <span>Twist</span>
          </button>
          <button type="button" class="tool-button" data-tool="tear" title="Tear">
            <i data-lucide="scissors" aria-hidden="true"></i>
            <span>Tear</span>
          </button>
        </fieldset>

        <label class="slider-field">
          <span>Stiffness</span>
          <input type="range" min="0.2" max="1.4" step="0.01" data-setting="stiffness" />
        </label>

        <label class="slider-field">
          <span><i data-lucide="wind" aria-hidden="true"></i> Wind</span>
          <input type="range" min="0" max="1" step="0.01" data-setting="wind" />
        </label>

        <div class="quality-row">
          <label>
            <span>Quality</span>
            <select data-setting="quality">
              <option value="balanced">Balanced</option>
              <option value="high">High</option>
            </select>
          </label>
        </div>

        <div class="button-row">
          <button class="icon-button" type="button" data-reset title="Reset">
            <i data-lucide="refresh-cw" aria-hidden="true"></i>
            <span>Reset</span>
          </button>
          <button class="icon-button" type="button" data-pause title="Pause">
            <i data-lucide="pause" aria-hidden="true"></i>
            <span>Pause</span>
          </button>
          <button class="icon-button" type="button" data-audio title="Sound">
            <i data-lucide="volume-2" aria-hidden="true"></i>
            <span>Sound</span>
          </button>
        </div>

        <dl class="stats" aria-label="Runtime stats">
          <div><dt><i data-lucide="activity" aria-hidden="true"></i> FPS</dt><dd data-stat="fps">0</dd></div>
          <div><dt>Particles</dt><dd data-stat="particles">0</dd></div>
          <div><dt>Constraints</dt><dd data-stat="constraints">0</dd></div>
          <div><dt>Renderer</dt><dd data-stat="renderer">pending</dd></div>
          <div><dt>Physics</dt><dd data-stat="wasm" data-wasm-status="pending">pending</dd></div>
        </dl>
      </aside>

      <div class="status-line" role="status" aria-live="polite" data-status>Idle</div>
    </section>
  </main>
`;

createIcons({
  icons: {
    Activity,
    Github,
    Hand,
    Heart,
    Pause,
    Play,
    RefreshCw,
    Rotate3D,
    Scissors,
    Volume2,
    VolumeX,
    Wind,
  },
});

const canvasHost = query<HTMLElement>("[data-canvas-host]");
const canvas = query<HTMLCanvasElement>("[data-playground-canvas]");
const launchPanel = query<HTMLElement>("[data-launch-panel]");
const launchButton = query<HTMLButtonElement>("[data-launch]");
const launchStatus = query<HTMLElement>("[data-launch-status]");
const statusLine = query<HTMLElement>("[data-status]");
const pauseButton = query<HTMLButtonElement>("[data-pause]");
const audioButton = query<HTMLButtonElement>("[data-audio]");
const resetButton = query<HTMLButtonElement>("[data-reset]");
const presetSelect = query<HTMLSelectElement>('[data-setting="preset"]');
const stiffnessInput = query<HTMLInputElement>('[data-setting="stiffness"]');
const windInput = query<HTMLInputElement>('[data-setting="wind"]');
const qualitySelect = query<HTMLSelectElement>('[data-setting="quality"]');
const versionNode = query<HTMLElement>("[data-build-version]");
const commitNode = query<HTMLAnchorElement>("[data-build-commit]");

syncControls();
void hydrateBuildInfo();
registerServiceWorker();

launchButton.addEventListener("click", () => {
  void launch();
});

presetSelect.addEventListener("change", () => updateSettingsFromControls());
stiffnessInput.addEventListener("input", () => updateSettingsFromControls());
windInput.addEventListener("input", () => updateSettingsFromControls());
qualitySelect.addEventListener("change", () => updateSettingsFromControls());
resetButton.addEventListener("click", () => playground?.reset(settings.preset));
pauseButton.addEventListener("click", () => {
  paused = !paused;
  playground?.setPaused(paused);
  pauseButton.innerHTML = paused
    ? '<i data-lucide="play" aria-hidden="true"></i><span>Resume</span>'
    : '<i data-lucide="pause" aria-hidden="true"></i><span>Pause</span>';
  createIcons({ icons: { Play, Pause } });
});
audioButton.addEventListener("click", () => {
  settings = { ...settings, audioEnabled: !settings.audioEnabled };
  saveAndApply();
  void playground?.unlockAudio();
});

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-tool]")) {
  button.addEventListener("click", () => {
    settings = playgroundSettingsSchema.parse({
      ...settings,
      tool: button.dataset.tool,
    });
    saveAndApply();
  });
}

async function launch(): Promise<void> {
  if (playground) return;

  launchButton.disabled = true;
  setStatus("Starting renderer");

  const { createPlayground } = await import("./features/playground/playground");
  playground = await createPlayground({
    host: canvasHost,
    canvas,
    settings,
    onStats: renderStats,
    onStatus: setStatus,
  });
  await playground.unlockAudio();
  launchPanel.classList.add("is-hidden");
  setStatus("Running");
}

function updateSettingsFromControls(): void {
  settings = playgroundSettingsSchema.parse({
    preset: presetSelect.value,
    tool: settings.tool,
    stiffness: Number(stiffnessInput.value),
    wind: Number(windInput.value),
    audioEnabled: settings.audioEnabled,
    quality: qualitySelect.value,
  });
  saveAndApply();
}

function saveAndApply(): void {
  saveSettings(settings);
  syncControls();
  playground?.setSettings(settings);
}

function syncControls(): void {
  presetSelect.value = settings.preset;
  stiffnessInput.value = String(settings.stiffness);
  windInput.value = String(settings.wind);
  qualitySelect.value = settings.quality;
  audioButton.innerHTML = settings.audioEnabled
    ? '<i data-lucide="volume-2" aria-hidden="true"></i><span>Sound</span>'
    : '<i data-lucide="volume-x" aria-hidden="true"></i><span>Muted</span>';

  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-tool]")) {
    button.classList.toggle("is-active", button.dataset.tool === settings.tool);
    button.setAttribute("aria-pressed", String(button.dataset.tool === settings.tool));
  }

  createIcons({ icons: { Volume2, VolumeX } });
}

function renderStats(stats: PlaygroundStats): void {
  setStat("fps", String(stats.fps));
  setStat("particles", String(stats.particles));
  setStat("constraints", String(stats.constraints));
  setStat("renderer", stats.renderer);
  setStat("wasm", stats.wasm === "wasm" ? "C++ WASM" : "TypeScript");
  query<HTMLElement>('[data-stat="wasm"]').dataset.wasmStatus =
    stats.wasm === "wasm" ? "ready" : "fallback";
  query<HTMLElement>('[data-stat="renderer"]').dataset.renderer = stats.renderer;
}

function setStat(name: string, value: string): void {
  query<HTMLElement>(`[data-stat="${name}"]`).textContent = value;
}

function setStatus(message: string): void {
  statusLine.textContent = message;
  launchStatus.textContent = message;
}

async function hydrateBuildInfo(): Promise<void> {
  const info = await resolveBuildInfo();
  versionNode.textContent = info.version;
  commitNode.textContent = info.liveCommit;
  commitNode.href = info.commitUrl;
}

function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator) || import.meta.env.DEV) return;

  window.addEventListener("load", () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  });
}

function query<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing element: ${selector}`);
  }

  return element;
}

window.addEventListener("error", (event) => {
  setStatus(event.message || "Unexpected browser error");
});

window.addEventListener("unhandledrejection", () => {
  setStatus("Unexpected async error");
});

if (settings === defaultSettings) {
  saveSettings(settings);
}
