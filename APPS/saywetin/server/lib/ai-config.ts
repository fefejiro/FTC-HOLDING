import OpenAI from "openai";

const DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_AI_MODEL = process.env.AI_MODEL?.trim() || "gpt-4o-mini";

type AiProvider = "openai" | "openrouter" | "none";

interface ResolvedEnvValue {
  name: string;
  value: string;
}

type ApiKeySource =
  | "AI_INTEGRATIONS_OPENAI_API_KEY"
  | "OPENAI_API_KEY"
  | "OPENROUTER_API_KEY";

export interface AiProviderConfig {
  configured: boolean;
  provider: AiProvider;
  model: string;
  apiKey: string | null;
  apiKeySource: string | null;
  baseURL?: string;
  baseURLSource?: string | null;
  defaultHeaders?: Record<string, string>;
}

function firstNonEmptyEnv(names: string[], env: NodeJS.ProcessEnv): ResolvedEnvValue | null {
  for (const name of names) {
    const rawValue = env[name];
    if (!rawValue) {
      continue;
    }

    const value = rawValue.trim();
    if (value.length > 0) {
      return { name, value };
    }
  }

  return null;
}

function getProviderForApiKeySource(source: ApiKeySource): AiProvider {
  return source === "OPENROUTER_API_KEY" ? "openrouter" : "openai";
}

function resolveBaseUrlEntry(
  apiKeySource: ApiKeySource,
  env: NodeJS.ProcessEnv,
): ResolvedEnvValue | null {
  if (apiKeySource === "AI_INTEGRATIONS_OPENAI_API_KEY") {
    return firstNonEmptyEnv(
      ["AI_INTEGRATIONS_OPENAI_BASE_URL", "OPENAI_BASE_URL"],
      env,
    );
  }

  if (apiKeySource === "OPENAI_API_KEY") {
    return firstNonEmptyEnv(["OPENAI_BASE_URL"], env);
  }

  return firstNonEmptyEnv(["OPENROUTER_BASE_URL"], env);
}

function shouldUseOpenRouterHeaders(provider: AiProvider, baseURL?: string): boolean {
  if (provider === "openrouter") {
    return true;
  }

  return typeof baseURL === "string" && /openrouter/i.test(baseURL);
}

export function getAiProviderConfig(env: NodeJS.ProcessEnv = process.env): AiProviderConfig {
  const apiKeyEntry = firstNonEmptyEnv(
    [
      "AI_INTEGRATIONS_OPENAI_API_KEY",
      "OPENAI_API_KEY",
      "OPENROUTER_API_KEY",
    ],
    env,
  );

  if (!apiKeyEntry) {
    return {
      configured: false,
      provider: "none",
      model: DEFAULT_AI_MODEL,
      apiKey: null,
      apiKeySource: null,
    };
  }

  const apiKeySource = apiKeyEntry.name as ApiKeySource;
  const provider = getProviderForApiKeySource(apiKeySource);
  const baseUrlEntry = resolveBaseUrlEntry(apiKeySource, env);

  const baseURL =
    provider === "openrouter"
      ? baseUrlEntry?.value || DEFAULT_OPENROUTER_BASE_URL
      : baseUrlEntry?.value || undefined;

  const defaultHeaders = shouldUseOpenRouterHeaders(provider, baseURL)
    ? {
        "HTTP-Referer":
          env.OPENROUTER_HTTP_REFERER?.trim() ||
          env.PUBLIC_BASE_URL?.trim() ||
          env.APP_ORIGIN?.trim() ||
          "https://saywetin.app",
        "X-Title": env.OPENROUTER_APP_TITLE?.trim() || "Saywetin",
      }
    : undefined;

  return {
    configured: true,
    provider,
    model: DEFAULT_AI_MODEL,
    apiKey: apiKeyEntry.value,
    apiKeySource: apiKeyEntry.name,
    baseURL,
    baseURLSource: baseUrlEntry?.name || null,
    defaultHeaders,
  };
}

export function isAiConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return getAiProviderConfig(env).configured;
}

export function getAiUnavailableMessage(feature: string = "AI analysis"): string {
  return `${feature} is unavailable right now because no AI provider is configured.`;
}

let cachedClient: OpenAI | null = null;
let cachedClientSignature: string | null = null;

export function getAiClient(): OpenAI {
  const config = getAiProviderConfig();
  if (!config.configured || !config.apiKey) {
    throw new Error(getAiUnavailableMessage());
  }

  const signature = JSON.stringify({
    apiKeySource: config.apiKeySource,
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    defaultHeaders: config.defaultHeaders,
  });

  if (cachedClient && cachedClientSignature === signature) {
    return cachedClient;
  }

  cachedClient = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    defaultHeaders: config.defaultHeaders,
  });
  cachedClientSignature = signature;

  return cachedClient;
}
