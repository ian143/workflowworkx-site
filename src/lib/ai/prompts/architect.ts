/**
 * Architect Agent — Strategic Spark Generation Prompt
 *
 * Replaces: processPipelineItems() prompt in V1.0 Agentic Engine
 *
 * Takes the Scout's forensic brief + Identity Vault
 * and generates 5 Strategic Sparks (hooks).
 */

export function buildArchitectPrompt(
  identityVault: string,
  forensicBrief: string,
  projectName: string
): string {
  return `
IDENTITY VAULT:
${identityVault}

PROJECT: ${projectName}

FORENSIC BRIEF:
${forensicBrief}

TASK: Generate exactly 5 "Strategic Sparks" — these are high-authority hooks that will become LinkedIn posts.

CONSTRAINTS:
- Maximum 10 words per spark (the 3-Second Rule — a reader must grasp the tension instantly).
- Each spark must anchor to a specific Data Bomb or Secret Math from the forensic brief.
- Focus on "Commercial Friction" — challenge the status quo, don't provide generic tips.
- Tone must match the Identity Vault's tone_archetype.
- Vary the angles: at least one should be contrarian, one data-led, one methodology-focused.

OUTPUT: Return ONLY a numbered list (1-5). No explanations, no preamble.

EXAMPLES OF STRONG SPARKS:
1. "42% cost reduction. Zero headcount change."
2. "The compliance framework nobody asked for worked."
3. "Three dashboards replaced one conversation."
4. "Revenue grew because we stopped measuring it."
5. "Their procurement process was the actual product."
  `.trim();
}

export const ARCHITECT_SYSTEM_PROMPT = `You are the GlueOS Architect — a strategic hook generator for B2B thought leadership.

Your hooks must:
- Create intellectual tension in under 10 words
- Reference specific commercial or technical outcomes
- Never be generic, motivational, or "LinkedIn-bro" style
- Sound like they were said by a sharp strategist in a boardroom, not a content creator

You output only the hooks. Nothing else.`;
