import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";
import { getProviderInfo } from "@/lib/ai-provider";
import { callAI } from "@/lib/ai-provider";

// GET - current AI config
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
      { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", desc: "سریع و مقرون‌به‌صرفه" },
      { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", desc: "خیلی سریع و ارزان" },
      { id: "claude-opus-4-6", name: "Claude Opus 4.6", desc: "قوی‌ترین مدل" },
    ],
    availableOpenaiModels: [
      { id: "gpt-4o", name: "GPT-4o", desc: "قوی و سریع" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", desc: "سریع و ارزان" },
      { id: "gpt-4-turbo", name: "GPT-4 Turbo", desc: "قوی با context بزرگ" },
      { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", desc: "ارزان‌ترین" },
    ],
  });
}

// POST - test AI key
export async function POST(request: NextRequest) {
  const session = await verifyAdmin(request);
  if (!session) return unauthorizedResponse();

  const { provider, apiKey, model } = await request.json();

  try {
    const configOverride: Record<string, string> = { provider };
    if (provider === "openai") {
      configOverride.openaiApiKey = apiKey;
      if (model) configOverride.openaiModel = model;
    } else {
      configOverride.claudeApiKey = apiKey;
      if (model) configOverride.claudeModel = model;
    }

    const startTime = Date.now();
    const result = await callAI("سلام. فقط بگو: سلام، من آماده‌ام!", 50, configOverride);
    const elapsed = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      response: result.trim(),
      elapsed,
      provider,
      model: model || (provider === "openai" ? "gpt-4o" : "claude-sonnet-4-20250514"),
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: errMsg }, { status: 400 });
  }
}
