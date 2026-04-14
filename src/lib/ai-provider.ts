import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

export type AIProvider = "claude" | "openai";

interface AIConfig {
  provider: AIProvider;
  claudeApiKey?: string;
  claudeModel?: string;
  openaiApiKey?: string;
  openaiModel?: string;
}

// Load settings from DB, fallback to env
async function getConfigFromDB(): Promise<AIConfig> {
  try {
    const rows = await prisma.appSettings.findMany({
      where: { key: { in: ["ai_provider", "ai_model_claude", "ai_model_openai", "ai_key_claude", "ai_key_openai"] } },
    });
    const db: Record<string, string> = {};
    for (const r of rows) db[r.key] = r.value;

    return {
      provider: (db.ai_provider as AIProvider) || (process.env.AI_PROVIDER as AIProvider) || "claude",
      claudeApiKey: db.ai_key_claude || process.env.ANTHROPIC_API_KEY,
      claudeModel: db.ai_model_claude || process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514",
      openaiApiKey: db.ai_key_openai || process.env.OPENAI_API_KEY,
      openaiModel: db.ai_model_openai || process.env.OPENAI_MODEL || "gpt-4o",
    };
  } catch {
    // DB not available, fallback to env
    return {
      provider: (process.env.AI_PROVIDER as AIProvider) || "claude",
      claudeApiKey: process.env.ANTHROPIC_API_KEY,
      claudeModel: process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514",
      openaiApiKey: process.env.OPENAI_API_KEY,
      openaiModel: process.env.OPENAI_MODEL || "gpt-4o",
    };
  }
}

// Sync version for display only (uses env)
export function getProviderInfo(): { provider: AIProvider; model: string; hasKey: boolean } {
  const provider = (process.env.AI_PROVIDER as AIProvider) || "claude";
  if (provider === "openai") {
    return { provider: "openai", model: process.env.OPENAI_MODEL || "gpt-4o", hasKey: !!process.env.OPENAI_API_KEY };
  }
  return { provider: "claude", model: process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514", hasKey: !!process.env.ANTHROPIC_API_KEY };
}

export async function callAI(
  prompt: string,
  maxTokens: number = 1500,
  configOverride?: Partial<AIConfig>
): Promise<string> {
  const dbConfig = await getConfigFromDB();
  const config = { ...dbConfig, ...configOverride };

  if (config.provider === "openai") {
    return callOpenAI(prompt, maxTokens, config);
  }
  return callClaude(prompt, maxTokens, config);
}

// Friendly error formatter for network/API failures
function wrapAIError(e: unknown, provider: string): Error {
  const err = e as { message?: string; cause?: { code?: string; message?: string } };
  const msg = err?.message || "";
  const causeCode = err?.cause?.code;

  if (msg.includes("Connection error") || msg.includes("fetch failed") || causeCode === "EBADF" || causeCode === "ECONNREFUSED") {
    return new Error(`اتصال به ${provider} برقرار نشد. فیلترشکن/VPN رو چک کن یا بعدا تلاش کن.`);
  }
  if (msg.includes("401") || msg.includes("Unauthorized") || msg.includes("invalid api key")) {
    return new Error(`کلید API ${provider} نامعتبر است. از تنظیمات ادمین بررسی کن.`);
  }
  if (msg.includes("429") || msg.includes("rate limit")) {
    return new Error(`محدودیت نرخ ${provider}. چند دقیقه صبر کن و دوباره تلاش کن.`);
  }
  if (msg.includes("timeout") || msg.includes("ETIMEDOUT")) {
    return new Error(`پاسخ ${provider} طولانی شد. دوباره تلاش کن.`);
  }
  return new Error(`خطای ${provider}: ${msg.slice(0, 200)}`);
}

async function callClaude(prompt: string, maxTokens: number, config: AIConfig): Promise<string> {
  if (!config.claudeApiKey) throw new Error("کلید Anthropic تنظیم نشده. از تنظیمات ادمین وارد کنید.");

  try {
    const anthropic = new Anthropic({ apiKey: config.claudeApiKey });
    const message = await anthropic.messages.create({
      model: config.claudeModel || "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    return textBlock?.text || "";
  } catch (e) {
    throw wrapAIError(e, "Claude");
  }
}

async function callOpenAI(prompt: string, maxTokens: number, config: AIConfig): Promise<string> {
  if (!config.openaiApiKey) throw new Error("کلید OpenAI تنظیم نشده. از تنظیمات ادمین وارد کنید.");

  try {
    const openai = new OpenAI({ apiKey: config.openaiApiKey });
    const response = await openai.chat.completions.create({
      model: config.openaiModel || "gpt-4o",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    });
    return response.choices[0]?.message?.content || "";
  } catch (e) {
    throw wrapAIError(e, "OpenAI");
  }
}
