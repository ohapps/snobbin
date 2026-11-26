import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getItemModel,
  getWebSearchProviderOptions,
  isItemAiConfigured,
} from "../item-model";

const describeModel = () => {
  const model = getItemModel() as { provider: string; modelId: string };
  return { provider: model.provider, modelId: model.modelId };
};

describe("getItemModel", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses OpenRouter when its key is set", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "or-key");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "g-key");
    vi.stubEnv("AI_ITEM_MODEL", "");
    const model = describeModel();
    expect(model.provider).toMatch(/openrouter/);
    expect(model.modelId).toBe("google/gemini-3.5-flash-lite");
  });

  it("falls back to Google directly", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "g-key");
    vi.stubEnv("AI_ITEM_MODEL", "");
    const model = describeModel();
    expect(model.provider).toMatch(/google/);
    expect(model.modelId).toBe("gemini-3.5-flash-lite");
  });

  it("honours AI_ITEM_MODEL", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "or-key");
    vi.stubEnv("AI_ITEM_MODEL", "google/gemini-3.8-flash");
    expect(describeModel().modelId).toBe("google/gemini-3.8-flash");
  });

  it("reports whether any key is configured", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");
    expect(isItemAiConfigured()).toBe(false);
    vi.stubEnv("OPENROUTER_API_KEY", "or-key");
    expect(isItemAiConfigured()).toBe(true);
  });
});

describe("getWebSearchProviderOptions", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const engineOf = () =>
    (
      getWebSearchProviderOptions()?.openrouter.plugins as
        | { engine: string; mode?: string }[]
        | undefined
    )?.[0];

  it("uses Exa by default with OpenRouter", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "or-key");
    vi.stubEnv("AI_WEB_SEARCH", "");
    expect(engineOf()?.engine).toBe("exa");
  });

  it("can switch engine or turn off", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "or-key");
    vi.stubEnv("AI_WEB_SEARCH", "parallel");
    expect(engineOf()).toMatchObject({ engine: "parallel", mode: "turbo" });
    vi.stubEnv("AI_WEB_SEARCH", "off");
    expect(getWebSearchProviderOptions()).toBeUndefined();
  });

  it("is off without OpenRouter", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    expect(getWebSearchProviderOptions()).toBeUndefined();
  });
});
