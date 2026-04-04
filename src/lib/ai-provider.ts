import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export type AIProvider = "claude" | "openai";

interface AIConfig {
  provider: AIProvider;
  claudeApiKey?: string;
  claudeModel?: string;
  openaiApiKey?: string;
  openaiModel?: string;
}

// Default config from env
function getConfig(): AIConfig {
  // Check localStorage-persisted settings (stored in a simple JSON file approach)
  // For server-side, we use env vars
  return {
    provider: (process.env.AI_PROVIDER as AIProvider) || "claude",
    claudeApiKey: process.env.ANTHROPIC_API_KEY,
    claudeModel: process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514",
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL || "gpt-4o",
  };
}

export async function callAI(
  prompt: string,
  maxTokens: number = 1500,
  configOverride?: Partial<AIConfig>
): Promise<string> {
  const config = { ...getConfig(), ...configOverride };

  if (config.provider === "openai") {
    return callOpenAI(prompt, maxTokens, config);
  }
  return callClaude(prompt, maxTokens, config);
}

async function callClaude(prompt: string, maxTokens: number, config: AIConfig): Promise<string> {
  if (!config.claudeApiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const anthropic = new Anthropic({ apiKey: config.claudeApiKey });

  const message = await anthropic.messages.create({
    model: config.claudeModel || "claude-sonnet-4-20250514",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  return textBlock?.text || "";
}

async function callOpenAI(prompt: string, maxTokens: number, config: AIConfig): Promise<string> {
  if (!config.openaiApiKey) throw new Error("OPENAI_API_KEY not configured");

  const openai = new OpenAI({ apiKey: config.openaiApiKey });

  const response = await openai.chat.completions.create({
    model: config.openaiModel || "gpt-4o",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });

  return response.choices[0]?.message?.content || "";
}

// Get current provider info for display
export function getProviderInfo(): { provider: AIProvider; model: string; hasKey: boolean } {
  const config = getConfig();
  if (config.provider === "openai") {
    return { provider: "openai", model: config.openaiModel || "gpt-4o", hasKey: !!config.openaiApiKey };
  }
  return { provider: "claude", model: config.claudeModel || "claude-sonnet-4-20250514", hasKey: !!config.claudeApiKey };
}
