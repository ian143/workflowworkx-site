"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface VaultDraft {
  voice_dna: {
    tone_archetype: string;
    signature_phrases: string[];
    banned_words: string[];
    emoji_usage: "none" | "minimal" | "average" | "frequent";
    ai_slop_triggers: string[];
  };
  historical_wins: Array<{
    project_name: string;
    data_bomb: string;
    secret_math: string;
  }>;
  icp: {
    core_pain_point: string;
    decision_maker: string;
  };
  verbatim_language: string[];
  content_strategy: {
    preferred_post_length: string;
    length_in_characters: { short: number; medium: number; long: number };
    format_preferences: {
      willing_to_create: string[];
      primary_format: string;
    };
    posting_frequency: string;
  };
  industry_context: {
    primary_industry: string;
    writing_guidelines: {
      appropriate_jargon: string[];
      appropriate_metrics: string[];
    };
  };
}

const STEPS = [
  "Voice DNA",
  "Historical Wins",
  "ICP & Language",
  "Content Strategy",
  "Industry & Review",
] as const;

const emptyVault: VaultDraft = {
  voice_dna: {
    tone_archetype: "",
    signature_phrases: ["", "", ""],
    banned_words: ["", "", "", "", ""],
    emoji_usage: "minimal",
    ai_slop_triggers: ["", "", ""],
  },
  historical_wins: [
    { project_name: "", data_bomb: "", secret_math: "" },
    { project_name: "", data_bomb: "", secret_math: "" },
    { project_name: "", data_bomb: "", secret_math: "" },
  ],
  icp: { core_pain_point: "", decision_maker: "" },
  verbatim_language: ["", "", ""],
  content_strategy: {
    preferred_post_length: "medium_1300_1600",
    length_in_characters: { short: 700, medium: 1500, long: 2200 },
    format_preferences: {
      willing_to_create: ["text", "carousel"],
      primary_format: "mixed",
    },
    posting_frequency: "2_5_per_week",
  },
  industry_context: {
    primary_industry: "",
    writing_guidelines: {
      appropriate_jargon: ["", "", ""],
      appropriate_metrics: ["", ""],
    },
  },
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [vault, setVault] = useState<VaultDraft>(emptyVault);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateVoiceDna(field: string, value: unknown) {
    setVault((v) => ({
      ...v,
      voice_dna: { ...v.voice_dna, [field]: value },
    }));
  }

  function updateWin(index: number, field: string, value: string) {
    setVault((v) => {
      const wins = [...v.historical_wins];
      wins[index] = { ...wins[index], [field]: value };
      return { ...v, historical_wins: wins };
    });
  }

  async function handleSubmit() {
    setSaving(true);
    setError("");

    // Filter out empty strings from arrays
    const cleanedVault = {
      ...vault,
      voice_dna: {
        ...vault.voice_dna,
        signature_phrases: vault.voice_dna.signature_phrases.filter(Boolean),
        banned_words: vault.voice_dna.banned_words.filter(Boolean),
        ai_slop_triggers: vault.voice_dna.ai_slop_triggers.filter(Boolean),
      },
      verbatim_language: vault.verbatim_language.filter(Boolean),
      industry_context: {
        ...vault.industry_context,
        writing_guidelines: {
          appropriate_jargon:
            vault.industry_context.writing_guidelines.appropriate_jargon.filter(
              Boolean
            ),
          appropriate_metrics:
            vault.industry_context.writing_guidelines.appropriate_metrics.filter(
              Boolean
            ),
        },
      },
    };

    const res = await fetch("/api/vault", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cleanedVault),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to save vault");
      setSaving(false);
      return;
    }

    // Run audit
    await fetch("/api/vault/audit", { method: "POST" });

    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-serif font-bold mb-2">
          Build Your Identity Vault
        </h1>
        <p className="text-slate-400 mb-8">
          This powers your content engine. The more specific you are, the better
          your output.
        </p>

        {/* Step indicator */}
        <div className="flex gap-2 mb-8">
          {STEPS.map((label, i) => (
            <button
              key={label}
              onClick={() => setStep(i)}
              className={`flex-1 text-xs py-2 rounded-lg transition-colors ${
                i === step
                  ? "bg-brand-600 text-white"
                  : i < step
                  ? "bg-brand-600/20 text-brand-300"
                  : "bg-white/5 text-slate-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="glass rounded-xl p-6">
          {/* Step 0: Voice DNA */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">Voice DNA</h2>
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Tone Archetype
                </label>
                <input
                  type="text"
                  value={vault.voice_dna.tone_archetype}
                  onChange={(e) =>
                    updateVoiceDna("tone_archetype", e.target.value)
                  }
                  placeholder="e.g. Strategic Pragmatist, Calm Authority"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Signature Phrases (min 3)
                </label>
                {vault.voice_dna.signature_phrases.map((p, i) => (
                  <input
                    key={i}
                    type="text"
                    value={p}
                    onChange={(e) => {
                      const arr = [...vault.voice_dna.signature_phrases];
                      arr[i] = e.target.value;
                      updateVoiceDna("signature_phrases", arr);
                    }}
                    placeholder={`Phrase ${i + 1}`}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white mb-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                ))}
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Banned Words (min 5)
                </label>
                {vault.voice_dna.banned_words.map((w, i) => (
                  <input
                    key={i}
                    type="text"
                    value={w}
                    onChange={(e) => {
                      const arr = [...vault.voice_dna.banned_words];
                      arr[i] = e.target.value;
                      updateVoiceDna("banned_words", arr);
                    }}
                    placeholder={`Word ${i + 1}`}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white mb-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                ))}
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Emoji Usage
                </label>
                <select
                  value={vault.voice_dna.emoji_usage}
                  onChange={(e) =>
                    updateVoiceDna("emoji_usage", e.target.value)
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="none">None</option>
                  <option value="minimal">Minimal</option>
                  <option value="average">Average</option>
                  <option value="frequent">Frequent</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 1: Historical Wins */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold">Historical Wins (min 3)</h2>
              <p className="text-sm text-slate-400">
                Each win needs a project name, a Data Bomb (specific metric),
                and Secret Math (why it worked).
              </p>
              {vault.historical_wins.map((win, i) => (
                <div key={i} className="space-y-2 p-4 bg-white/5 rounded-lg">
                  <h3 className="text-sm font-medium text-brand-300">
                    Win {i + 1}
                  </h3>
                  <input
                    type="text"
                    value={win.project_name}
                    onChange={(e) => updateWin(i, "project_name", e.target.value)}
                    placeholder="Project name"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <input
                    type="text"
                    value={win.data_bomb}
                    onChange={(e) => updateWin(i, "data_bomb", e.target.value)}
                    placeholder="Data Bomb — e.g. 42% cost reduction in 6 months"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <textarea
                    value={win.secret_math}
                    onChange={(e) => updateWin(i, "secret_math", e.target.value)}
                    placeholder="Secret Math — the mechanism that made it work (min 50 chars)"
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Step 2: ICP & Verbatim Language */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">
                Ideal Client Profile & Language
              </h2>
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Core Pain Point
                </label>
                <textarea
                  value={vault.icp.core_pain_point}
                  onChange={(e) =>
                    setVault((v) => ({
                      ...v,
                      icp: { ...v.icp, core_pain_point: e.target.value },
                    }))
                  }
                  placeholder="What problem does your ideal client struggle with most?"
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Decision Maker Title
                </label>
                <input
                  type="text"
                  value={vault.icp.decision_maker}
                  onChange={(e) =>
                    setVault((v) => ({
                      ...v,
                      icp: { ...v.icp, decision_maker: e.target.value },
                    }))
                  }
                  placeholder="e.g. Head of Operations, CFO, Procurement Director"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Verbatim Client Language (min 3 quotes)
                </label>
                {vault.verbatim_language.map((q, i) => (
                  <input
                    key={i}
                    type="text"
                    value={q}
                    onChange={(e) => {
                      const arr = [...vault.verbatim_language];
                      arr[i] = e.target.value;
                      setVault((v) => ({ ...v, verbatim_language: arr }));
                    }}
                    placeholder={`Quote ${i + 1} — things your clients actually say`}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white mb-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Content Strategy */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">Content Strategy</h2>
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Preferred Post Length
                </label>
                <select
                  value={vault.content_strategy.preferred_post_length}
                  onChange={(e) =>
                    setVault((v) => ({
                      ...v,
                      content_strategy: {
                        ...v.content_strategy,
                        preferred_post_length: e.target.value,
                      },
                    }))
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="short_500_800">Short (500-800 chars)</option>
                  <option value="medium_1300_1600">
                    Medium (1300-1600 chars)
                  </option>
                  <option value="long_1800_2500">Long (1800-2500 chars)</option>
                  <option value="flexible">Flexible</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Posting Frequency
                </label>
                <select
                  value={vault.content_strategy.posting_frequency}
                  onChange={(e) =>
                    setVault((v) => ({
                      ...v,
                      content_strategy: {
                        ...v.content_strategy,
                        posting_frequency: e.target.value,
                      },
                    }))
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="1_per_week">1 per week</option>
                  <option value="2_5_per_week">2-5 per week</option>
                  <option value="daily">Daily</option>
                  <option value="sporadic">Sporadic</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Primary Format
                </label>
                <select
                  value={
                    vault.content_strategy.format_preferences.primary_format
                  }
                  onChange={(e) =>
                    setVault((v) => ({
                      ...v,
                      content_strategy: {
                        ...v.content_strategy,
                        format_preferences: {
                          ...v.content_strategy.format_preferences,
                          primary_format: e.target.value,
                        },
                      },
                    }))
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="mixed">Mixed (text + carousel)</option>
                  <option value="text_only">Text Only</option>
                  <option value="carousel_focused">Carousel Focused</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 4: Industry & Review */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">Industry Context</h2>
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Primary Industry
                </label>
                <input
                  type="text"
                  value={vault.industry_context.primary_industry}
                  onChange={(e) =>
                    setVault((v) => ({
                      ...v,
                      industry_context: {
                        ...v.industry_context,
                        primary_industry: e.target.value,
                      },
                    }))
                  }
                  placeholder="e.g. SaaS, Construction, Professional Services"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Appropriate Jargon (min 3)
                </label>
                {vault.industry_context.writing_guidelines.appropriate_jargon.map(
                  (j, i) => (
                    <input
                      key={i}
                      type="text"
                      value={j}
                      onChange={(e) => {
                        const arr = [
                          ...vault.industry_context.writing_guidelines
                            .appropriate_jargon,
                        ];
                        arr[i] = e.target.value;
                        setVault((v) => ({
                          ...v,
                          industry_context: {
                            ...v.industry_context,
                            writing_guidelines: {
                              ...v.industry_context.writing_guidelines,
                              appropriate_jargon: arr,
                            },
                          },
                        }));
                      }}
                      placeholder={`Term ${i + 1}`}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white mb-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  )
                )}
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors disabled:opacity-30"
            >
              Back
            </button>
            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="px-6 py-2 bg-brand-600 hover:bg-brand-500 rounded-lg text-sm font-medium transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-6 py-2 bg-brand-600 hover:bg-brand-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save & Continue"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
