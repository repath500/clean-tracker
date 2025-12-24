export const env = {
  OPENROUTER_API_KEY: process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY || "",
  OPENROUTER_MODEL: process.env.NEXT_PUBLIC_OPENROUTER_MODEL || "openai/gpt-4o-mini",
  OPENROUTER_BASE_URL: "https://openrouter.ai/api/v1",
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  APP_NAME: "ParcelAI",
};

export function isOpenRouterConfigured(): boolean {
  return Boolean(env.OPENROUTER_API_KEY);
}
