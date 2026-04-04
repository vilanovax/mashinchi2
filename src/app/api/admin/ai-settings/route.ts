import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";
import { getProviderInfo } from "@/lib/ai-provider";

// GET - current AI config (without exposing full keys)
export async function GET(request: NextRequest) {
  const session = await verifyAdmin(request);
  if (!session) return unauthorizedResponse();

  const info = getProviderInfo();

  return NextResponse.json({
    provider: info.provider,
    model: info.model,
    hasKey: info.hasKey,
    claudeKey: process.env.ANTHROPIC_API_KEY ? `...${process.env.ANTHROPIC_API_KEY.slice(-8)}` : null,
    openaiKey: process.env.OPENAI_API_KEY ? `...${process.env.OPENAI_API_KEY.slice(-8)}` : null,
    claudeModel: process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514",
    openaiModel: process.env.OPENAI_MODEL || "gpt-4o",
    availableClaudeModels: [
      "claude-sonnet-4-20250514",
      "claude-haiku-4-5-20251001",
      "claude-opus-4-6",
    ],
    availableOpenaiModels: [
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4-turbo",
      "gpt-3.5-turbo",
    ],
  });
}
