import { google } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";

/**
 * The model behind "Identify with AI".
 *
 * Uses OpenRouter when OPENROUTER_API_KEY is set, otherwise Google directly
 * with GOOGLE_GENERATIVE_AI_API_KEY. AI_ITEM_MODEL overrides the model name
 * (an OpenRouter id like "google/gemini-3.8-flash", or a Google one like
 * "gemini-3.8-flash").
 */

// Flash Lite: about 1s per item versus 4-12s for gemini-3.8-flash, with the
// same results on book pages in testing (Nov 2026).
const DEFAULT_OPENROUTER_MODEL = "google/gemini-3.5-flash-lite";
const DEFAULT_GOOGLE_MODEL = "gemini-3.5-flash-lite";

export type WebSearchEngine = "exa" | "parallel" | "native";

/**
 * Lets the model look things up on the web before answering, so recent items
 * (e.g. a show from this year) come out right. OpenRouter only. AI_WEB_SEARCH
 * picks the engine: "exa" (default, ~$0.007 per lookup), "parallel" (~$0.001,
 * slower at times), "native" (~$0.03) or "off".
 */
export const getWebSearchProviderOptions = ():
  | { openrouter: Record<string, unknown> }
  | undefined => {
  if (!process.env.OPENROUTER_API_KEY) return undefined;
  const setting = (process.env.AI_WEB_SEARCH ?? "exa").trim().toLowerCase();
  if (setting === "off" || setting === "false") return undefined;
  const engine: WebSearchEngine = ["exa", "parallel", "native"].includes(
    setting,
  )
    ? (setting as WebSearchEngine)
    : "exa";

  return {
    openrouter: {
      plugins: [
        {
          id: "web",
          engine,
          max_results: 3,
          ...(engine === "parallel" ? { mode: "turbo" } : {}),
          search_prompt:
            "Web search results follow. Use them to get facts right. Do not cite them or include links in your answer.",
        },
      ],
    },
  };
};

export const getItemModel = (): LanguageModel => {
  const override = process.env.AI_ITEM_MODEL?.trim();

  if (process.env.OPENROUTER_API_KEY) {
    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
      // Shows up as the app name in OpenRouter's usage dashboard.
      headers: { "X-Title": "Snobbin" },
    });
    return openrouter(override || DEFAULT_OPENROUTER_MODEL);
  }

  return google(override || DEFAULT_GOOGLE_MODEL);
};
