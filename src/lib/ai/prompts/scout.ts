/**
 * Scout Agent — Forensic Analysis Prompt
 *
 * Replaces: performForensicAnalysis() prompt in V1.0 Ingestion Bridge
 *
 * Takes extracted text from project files + Identity Vault
 * and produces a high-authority Strategic Brief.
 */

export function buildScoutPrompt(
  identityVault: string,
  projectName: string,
  extractedTexts: { fileName: string; content: string }[]
): string {
  const documentSections = extractedTexts
    .map(
      (doc, i) =>
        `--- DOCUMENT ${i + 1}: ${doc.fileName} ---\n${doc.content.substring(0, 8000)}`
    )
    .join("\n\n");

  return `
IDENTITY CONTEXT:
${identityVault}

PROJECT NAME: ${projectName}

DOCUMENTS:
${documentSections}

TASK: Perform a forensic analysis of the documents above. Your job is to extract the intelligence that makes this project commercially significant.

REQUIRED OUTPUTS:
1. **Data Bombs**: Specific quantified results (percentages, revenue figures, time savings, scale metrics). At least 3.
2. **Secret Math**: The underlying methodology or logic that produced these results. Not "what" happened, but "why" the approach worked mechanically.
3. **Strategy-Project Fit**: How does this project connect to the founder's Identity Vault positioning? What narrative bridges exist?
4. **Commercial Friction Points**: What conventional wisdom does this project challenge? Where does it break the expected pattern?
5. **Authority Angles**: 3-5 specific angles from which this project can be used to demonstrate institutional expertise.

OUTPUT FORMAT: A structured Strategic Brief that the Architect agent can use to generate hooks.
  `.trim();
}

export const SCOUT_SYSTEM_PROMPT = `You are the GlueOS Scout — a forensic intelligence agent specialized in extracting commercially significant data from technical project documentation.

You operate with these principles:
- Precision over generality. Extract specific numbers, not vague claims.
- Mechanism over outcome. Explain WHY something worked, not just THAT it worked.
- Commercial logic over academic analysis. Every insight must connect to market positioning.
- You never fabricate data. If a document lacks specific metrics, say so explicitly.

Your output feeds directly into the content generation pipeline, so clarity and structure are critical.`;
