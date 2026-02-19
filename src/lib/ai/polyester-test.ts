/**
 * The Polyester Test — Quality Gate
 *
 * Every AI output must pass this validation before being stored.
 * Named for the principle: if it feels cheap and shiny, it's slop.
 */

export interface PolyesterTestResult {
  passed: boolean;
  overallScore: number;
  scores: {
    rhythmScore: number;
    slopScore: number;
    dataBombAnchor: boolean;
    commercialFriction: boolean;
    lengthCompliance: boolean;
  };
  violations: string[];
}

// Default AI slop words — supplemented by vault-specific triggers
const DEFAULT_SLOP_TRIGGERS = [
  "game-changer",
  "game changer",
  "synergy",
  "leverage",
  "in today's fast-paced world",
  "in today's digital age",
  "it's no secret that",
  "at the end of the day",
  "think outside the box",
  "paradigm shift",
  "low-hanging fruit",
  "move the needle",
  "deep dive",
  "circle back",
  "unlock the power",
  "take it to the next level",
  "best-in-class",
  "cutting-edge",
  "revolutionary",
  "innovative solution",
  "seamlessly",
  "robust",
  "holistic approach",
  "actionable insights",
];

/**
 * Analyze sentence length variance (Gary Provost rhythm).
 * Good writing has high variance — a mix of short and long sentences.
 * Returns 0-100 score.
 */
function scoreRhythm(text: string): number {
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (sentences.length < 3) return 50; // Not enough data

  const lengths = sentences.map((s) => s.split(/\s+/).length);
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance =
    lengths.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0) /
    lengths.length;
  const stdDev = Math.sqrt(variance);

  // Good rhythm has stdDev > 5 (mix of 3-word and 20-word sentences)
  // Perfect score at stdDev >= 8
  const normalized = Math.min(100, (stdDev / 8) * 100);
  return Math.round(normalized);
}

/**
 * Check for AI slop triggers.
 * Returns 0-100 score (100 = no slop, 0 = heavy slop).
 */
function scoreSlopCompliance(
  text: string,
  vaultBannedWords: string[] = [],
  vaultSlopTriggers: string[] = []
): { score: number; found: string[] } {
  const lowerText = text.toLowerCase();
  const allTriggers = [
    ...DEFAULT_SLOP_TRIGGERS,
    ...vaultBannedWords,
    ...vaultSlopTriggers,
  ];

  const found = allTriggers.filter((trigger) =>
    lowerText.includes(trigger.toLowerCase())
  );

  // Each trigger found reduces score by 15 points
  const score = Math.max(0, 100 - found.length * 15);
  return { score, found };
}

/**
 * Check if the post contains specific data/numbers (Data Bomb anchor).
 */
function hasDataBombAnchor(text: string): boolean {
  // Must contain at least one specific number/percentage/metric
  const patterns = [
    /\d+%/,           // Percentages
    /£\d+/,           // Currency (GBP)
    /\$\d+/,          // Currency (USD)
    /\d+x/i,          // Multipliers
    /\d+\s*(hours?|days?|weeks?|months?|years?)/i,  // Time metrics
    /\d+\s*(clients?|projects?|teams?|people)/i,     // Scale metrics
  ];

  return patterns.some((pattern) => pattern.test(text));
}

/**
 * Check if the post leads with tension/friction rather than generic advice.
 */
function hasCommercialFriction(text: string): boolean {
  const firstSentence = text.split(/[.!?]/)[0] || "";

  // Generic openers that indicate NO friction
  const genericOpeners = [
    /^(here are|here's|top \d+|the key to|how to|why you should|did you know)/i,
    /^(i'm (excited|thrilled|delighted)|happy to announce|proud to share)/i,
    /^(in (today's|this|the modern)|as we all know|it goes without saying)/i,
  ];

  const isGeneric = genericOpeners.some((pattern) =>
    pattern.test(firstSentence.trim())
  );
  return !isGeneric;
}

/**
 * Run the full Polyester Test on a draft.
 */
export function runPolyesterTest(
  text: string,
  options: {
    targetLength?: { min: number; max: number };
    bannedWords?: string[];
    slopTriggers?: string[];
  } = {}
): PolyesterTestResult {
  const violations: string[] = [];

  // 1. Rhythm
  const rhythmScore = scoreRhythm(text);
  if (rhythmScore < 40) {
    violations.push(
      `Low rhythm variance (${rhythmScore}/100) — needs more sentence length variety`
    );
  }

  // 2. Slop compliance
  const { score: slopScore, found: slopFound } = scoreSlopCompliance(
    text,
    options.bannedWords,
    options.slopTriggers
  );
  if (slopFound.length > 0) {
    violations.push(`AI slop detected: "${slopFound.join('", "')}"`);
  }

  // 3. Data Bomb anchor
  const dataBombAnchor = hasDataBombAnchor(text);
  if (!dataBombAnchor) {
    violations.push(
      "No quantified Data Bomb found — post needs specific metrics"
    );
  }

  // 4. Commercial friction
  const commercialFriction = hasCommercialFriction(text);
  if (!commercialFriction) {
    violations.push(
      "Opens with a generic pattern — needs commercial tension upfront"
    );
  }

  // 5. Length compliance
  let lengthCompliance = true;
  if (options.targetLength) {
    const charCount = text.length;
    if (
      charCount < options.targetLength.min ||
      charCount > options.targetLength.max
    ) {
      lengthCompliance = false;
      violations.push(
        `Length ${charCount} chars — target is ${options.targetLength.min}-${options.targetLength.max}`
      );
    }
  }

  // Overall score (weighted average)
  const overallScore = Math.round(
    rhythmScore * 0.2 +
      slopScore * 0.25 +
      (dataBombAnchor ? 100 : 0) * 0.25 +
      (commercialFriction ? 100 : 0) * 0.2 +
      (lengthCompliance ? 100 : 0) * 0.1
  );

  return {
    passed: violations.length === 0 && overallScore >= 70,
    overallScore,
    scores: {
      rhythmScore,
      slopScore,
      dataBombAnchor,
      commercialFriction,
      lengthCompliance,
    },
    violations,
  };
}
