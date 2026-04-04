import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";
import { callAI } from "@/lib/ai-provider";

// GET - current AI config (merged DB + env)
export async function GET(request: NextRequest) {
  const session = await verifyAdmin(request);
  if (!session) return unauthorizedResponse();

  // Load from DB
  const rows = await prisma.appSettings.findMany({
    where: { key: { startsWith: "ai_" } },
  });
  const db: Record<string, string> = {};
  for (const r of rows) db[r.key] = r.value;

  const provider = db.ai_provider || process.env.AI_PROVIDER || "claude";
  const claudeModel = db.ai_model_claude || process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514";
  const openaiModel = db.ai_model_openai || process.env.OPENAI_MODEL || "gpt-4o";
  const claudeKeyDB = db.ai_key_claude || "";
  const openaiKeyDB = db.ai_key_openai || "";
  const claudeKeyEnv = process.env.ANTHROPIC_API_KEY || "";
  const openaiKeyEnv = process.env.OPENAI_API_KEY || "";

  return NextResponse.json({
    provider,
    claudeModel,
    openaiModel,
    // Show masked keys
    claudeKeyDB: claudeKeyDB ? `...${claudeKeyDB.slice(-6)}` : null,
    claudeKeyEnv: claudeKeyEnv ? `...${claudeKeyEnv.slice(-6)}` : null,
    openaiKeyDB: openaiKeyDB ? `...${openaiKeyDB.slice(-6)}` : null,
    openaiKeyEnv: openaiKeyEnv ? `...${openaiKeyEnv.slice(-6)}` : null,
    hasClaudeKey: !!(claudeKeyDB || claudeKeyEnv),
    hasOpenaiKey: !!(openaiKeyDB || openaiKeyEnv),
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
      if (apiKey) configOverride.openaiApiKey = apiKey;
      if (model) configOverride.openaiModel = model;
    } else {
      if (apiKey) configOverride.claudeApiKey = apiKey;
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

// PUT - save AI settings to DB
export async function PUT(request: NextRequest) {
  const session = await verifyAdmin(request);
  if (!session) return unauthorizedResponse();

  const body = await request.json();

  const updates: { key: string; value: string }[] = [];
  if (body.provider) updates.push({ key: "ai_provider", value: body.provider });
  if (body.claudeModel) updates.push({ key: "ai_model_claude", value: body.claudeModel });
  if (body.openaiModel) updates.push({ key: "ai_model_openai", value: body.openaiModel });
  if (body.claudeKey !== undefined) updates.push({ key: "ai_key_claude", value: body.claudeKey });
  if (body.openaiKey !== undefined) updates.push({ key: "ai_key_openai", value: body.openaiKey });

  for (const u of updates) {
    await prisma.appSettings.upsert({
      where: { key: u.key },
      update: { value: u.value },
      create: { key: u.key, value: u.value },
    });
  }

  return NextResponse.json({ success: true, saved: updates.map((u) => u.key) });
}
