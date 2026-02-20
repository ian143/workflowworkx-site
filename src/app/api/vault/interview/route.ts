/**
 * Brand Vault Interview — Streaming Chat Endpoint
 *
 * Replaces the static 5-step onboarding form with a Claude-powered
 * conversational interview (the "Brand Vault Architect").
 *
 * POST /api/vault/interview
 * Body: { messages: Array<{ role: "user" | "assistant", content: string }> }
 * Returns: Server-Sent Events stream of text chunks
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireActiveSession } from "@/lib/require-subscription";
import { getBrandVaultArchitectSystemPrompt } from "@/lib/ai/prompts/brand-vault-architect";

const MODEL = "claude-sonnet-4-5-20250929";
const MAX_TOKENS = 2000;

export async function POST(req: NextRequest) {
  const { error } = await requireActiveSession();
  if (error) return error;

  const body = await req.json();
  const messages: Array<{ role: "user" | "assistant"; content: string }> =
    body.messages;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "messages array is required" },
      { status: 400 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const systemPrompt = getBrandVaultArchitectSystemPrompt();

  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  // Fire-and-forget: stream Claude's response to the client
  (async () => {
    try {
      const stream = anthropic.messages.stream({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          await writer.write(
            encoder.encode(
              `data: ${JSON.stringify({ text: event.delta.text })}\n\n`
            )
          );
        }
      }

      await writer.write(encoder.encode("data: [DONE]\n\n"));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      await writer.write(
        encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
      );
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
