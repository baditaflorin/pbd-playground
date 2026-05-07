import { z } from "zod";

export const presetSchema = z.enum(["cloth", "jelly", "rope", "hair"]);
export const toolSchema = z.enum(["drag", "twist", "tear"]);
export const qualitySchema = z.enum(["balanced", "high"]);

export type PresetKind = z.infer<typeof presetSchema>;
export type ToolMode = z.infer<typeof toolSchema>;
export type QualityMode = z.infer<typeof qualitySchema>;

export const playgroundSettingsSchema = z.object({
  preset: presetSchema,
  tool: toolSchema,
  stiffness: z.number().min(0.2).max(1.4),
  wind: z.number().min(0).max(1),
  audioEnabled: z.boolean(),
  quality: qualitySchema,
});

export type PlaygroundSettings = z.infer<typeof playgroundSettingsSchema>;

export const defaultSettings: PlaygroundSettings = {
  preset: "cloth",
  tool: "drag",
  stiffness: 0.9,
  wind: 0.25,
  audioEnabled: true,
  quality: "balanced",
};

const storageKey = "pbd-playground.settings.v1";

export function loadSettings(): PlaygroundSettings {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return defaultSettings;

    return playgroundSettingsSchema.parse({
      ...defaultSettings,
      ...(JSON.parse(raw) as Partial<PlaygroundSettings>),
    });
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: PlaygroundSettings): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(playgroundSettingsSchema.parse(settings)));
  } catch {
    // Persistence is nice-to-have; simulation should not depend on it.
  }
}
