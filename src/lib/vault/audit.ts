/**
 * Brand Vault v4.1 Audit Engine
 *
 * Port of the V1.0 runBrandVaultAudit() from Google Apps Script.
 * Validates the Identity Vault JSON against the v4.1 structure
 * required by the Agentic Engine.
 */

import { z } from "zod";

// ============================================================
// VAULT SCHEMA (Zod validation replacing manual checks)
// ============================================================

const voiceDnaSchema = z.object({
  tone_archetype: z.string().min(1, "Missing tone archetype"),
  signature_phrases: z
    .array(z.string())
    .min(3, "Need at least 3 signature phrases"),
  banned_words: z.array(z.string()).min(5, "Need at least 5 banned words"),
  emoji_usage: z.enum(["none", "minimal", "average", "frequent"], {
    errorMap: () => ({
      message: "emoji_usage must be: none, minimal, average, or frequent",
    }),
  }),
  ai_slop_triggers: z.array(z.string()).optional(),
});

const historicalWinSchema = z.object({
  project_name: z.string().min(1),
  data_bomb: z
    .string()
    .regex(/\d+/, "Data Bomb must contain quantified numbers"),
  secret_math: z
    .string()
    .min(50, "Secret Math too vague/short (min 50 chars)"),
});

const icpSchema = z.object({
  core_pain_point: z.string().min(1, "Missing ICP core pain point"),
  decision_maker: z.string().optional(),
});

const lengthInCharactersSchema = z.object({
  short: z.number().min(300).max(1000),
  medium: z.number().min(1000).max(2000),
  long: z.number().min(1500).max(3000),
});

const formatPreferencesSchema = z.object({
  willing_to_create: z
    .array(z.enum(["text", "carousel"]))
    .min(1, "Must include at least 'text' or 'carousel'"),
  primary_format: z.enum(["mixed", "text_only", "carousel_focused"]),
});

const contentStrategySchema = z.object({
  preferred_post_length: z.enum([
    "short_500_800",
    "medium_1300_1600",
    "long_1800_2500",
    "flexible",
  ]),
  length_in_characters: lengthInCharactersSchema,
  format_preferences: formatPreferencesSchema,
  posting_frequency: z
    .enum(["1_per_week", "2_5_per_week", "daily", "sporadic"])
    .optional(),
});

const writingGuidelinesSchema = z.object({
  appropriate_jargon: z.array(z.string()).optional(),
  appropriate_metrics: z.array(z.string()).optional(),
});

const industryContextSchema = z
  .object({
    primary_industry: z.string().optional(),
    writing_guidelines: writingGuidelinesSchema.optional(),
  })
  .optional();

export const brandVaultSchema = z.object({
  voice_dna: voiceDnaSchema,
  historical_wins: z
    .array(historicalWinSchema)
    .min(3, "Need at least 3 historical wins"),
  icp: icpSchema,
  verbatim_language: z
    .array(z.string())
    .min(3, "Need at least 3 verbatim customer quotes"),
  content_strategy: contentStrategySchema,
  industry_context: industryContextSchema,
});

export type BrandVault = z.infer<typeof brandVaultSchema>;

// ============================================================
// AUDIT ENGINE
// ============================================================

export interface AuditIssue {
  severity: "critical" | "blocking" | "warning";
  message: string;
  field?: string;
}

export interface AuditResult {
  passed: boolean;
  status: "passed" | "passed_with_warnings" | "failed";
  issues: AuditIssue[];
  summary: string;
}

const CIRCULAR_PHRASES = [
  "because we executed well",
  "our process is better",
  "we did it right",
  "through hard work",
  "by being thorough",
];

export function auditBrandVault(vaultData: unknown): AuditResult {
  const issues: AuditIssue[] = [];

  // Phase 1: Schema validation (replaces all manual field checks)
  const parsed = brandVaultSchema.safeParse(vaultData);

  if (!parsed.success) {
    for (const error of parsed.error.issues) {
      const field = error.path.join(".");
      const isCritical =
        field.startsWith("content_strategy") ||
        field.startsWith("voice_dna") ||
        field === "historical_wins";

      issues.push({
        severity: isCritical ? "critical" : "blocking",
        message: error.message,
        field,
      });
    }
  }

  // Phase 2: Semantic validation (quality checks beyond structure)
  if (parsed.success) {
    const vault = parsed.data;

    // Check AI slop triggers recommendation
    if (
      !vault.voice_dna.ai_slop_triggers ||
      vault.voice_dna.ai_slop_triggers.length < 3
    ) {
      issues.push({
        severity: "warning",
        message: "Recommended: at least 3 AI slop triggers",
        field: "voice_dna.ai_slop_triggers",
      });
    }

    // Check for circular Secret Math
    for (const win of vault.historical_wins) {
      const lowerMath = win.secret_math.toLowerCase();
      for (const phrase of CIRCULAR_PHRASES) {
        if (lowerMath.includes(phrase)) {
          issues.push({
            severity: "warning",
            message: `${win.project_name}: Secret Math appears circular — needs mechanism explanation`,
            field: "historical_wins.secret_math",
          });
          break;
        }
      }
    }

    // Check ICP decision maker recommendation
    if (!vault.icp.decision_maker) {
      issues.push({
        severity: "warning",
        message: "Recommended: specify decision maker title",
        field: "icp.decision_maker",
      });
    }

    // Check industry context recommendations
    if (!vault.industry_context) {
      issues.push({
        severity: "warning",
        message:
          "Recommended: add industry_context for better content quality",
        field: "industry_context",
      });
    } else {
      if (!vault.industry_context.primary_industry) {
        issues.push({
          severity: "warning",
          message: "industry_context.primary_industry not specified",
          field: "industry_context.primary_industry",
        });
      }
      if (
        !vault.industry_context.writing_guidelines?.appropriate_jargon ||
        vault.industry_context.writing_guidelines.appropriate_jargon.length < 3
      ) {
        issues.push({
          severity: "warning",
          message: "Add at least 3 appropriate_jargon terms for authenticity",
          field: "industry_context.writing_guidelines.appropriate_jargon",
        });
      }
      if (
        !vault.industry_context.writing_guidelines?.appropriate_metrics ||
        vault.industry_context.writing_guidelines.appropriate_metrics.length < 2
      ) {
        issues.push({
          severity: "warning",
          message: "Add at least 2 appropriate_metrics for credibility",
          field: "industry_context.writing_guidelines.appropriate_metrics",
        });
      }
    }

    // Check posting frequency
    if (!vault.content_strategy.posting_frequency) {
      issues.push({
        severity: "warning",
        message: "Recommended: set posting_frequency",
        field: "content_strategy.posting_frequency",
      });
    }
  }

  // Phase 3: Determine result
  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const blockingCount = issues.filter((i) => i.severity === "blocking").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  let status: AuditResult["status"];
  let summary: string;

  if (criticalCount > 0 || blockingCount > 0) {
    status = "failed";
    const parts: string[] = [];
    if (criticalCount > 0)
      parts.push(`${criticalCount} critical issue${criticalCount > 1 ? "s" : ""}`);
    if (blockingCount > 0)
      parts.push(`${blockingCount} blocking issue${blockingCount > 1 ? "s" : ""}`);
    if (warningCount > 0)
      parts.push(`${warningCount} warning${warningCount > 1 ? "s" : ""}`);
    summary = `Audit failed: ${parts.join(", ")}`;
  } else if (warningCount > 0) {
    status = "passed_with_warnings";
    summary = `Audit passed with ${warningCount} warning${warningCount > 1 ? "s" : ""}`;
  } else {
    status = "passed";
    summary = "Audit passed — vault is production-ready";
  }

  return {
    passed: status !== "failed",
    status,
    issues,
    summary,
  };
}
