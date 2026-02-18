/**
 * Claude API Client
 *
 * Wraps the Anthropic SDK for use across the Steel Loop.
 * Replaces the V1.0 callClaude() Google Apps Script helper.
 */

import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-5-20250929";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return client;
}

export interface AIResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Core Claude call — used by Scout, Architect, and Ghostwriter.
 */
export async function callClaude(
  prompt: string,
  systemPrompt: string,
  maxTokens: number = 4000
): Promise<AIResponse> {
  const anthropic = getClient();

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = message.content.find((block) => block.type === "text");

  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  return {
    text: textBlock.text,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  };
}

/**
 * Structured JSON call — parses Claude's response as JSON.
 * Used by Ghostwriter for draft generation.
 */
export async function callClaudeJSON<T>(
  prompt: string,
  systemPrompt: string,
  maxTokens: number = 4000
): Promise<T> {
  const response = await callClaude(prompt, systemPrompt, maxTokens);

  // Strip markdown code fences if present
  const cleaned = response.text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(
      `Failed to parse Claude JSON response: ${cleaned.substring(0, 200)}...`
    );
  }
}
