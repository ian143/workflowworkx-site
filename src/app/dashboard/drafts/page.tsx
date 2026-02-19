"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Draft {
  id: string;
  lengthType: string;
  content: string;
  score: number | null;
  status: string;
  spark: {
    sparkText: string;
    pipelineItem: {
      project: { name: string };
    };
  };
}

const LENGTH_LABELS: Record<string, string> = {
  short: "Short",
  medium: "Medium",
  long: "Long",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "text-amber-400 bg-amber-400/10",
  approved: "text-green-400 bg-green-400/10",
  published: "text-emerald-400 bg-emerald-400/10",
  rejected: "text-red-400 bg-red-400/10",
};

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);

  useEffect(() => {
    fetch("/api/drafts")
      .then((r) => (r.ok ? r.json() : []))
      .then(setDrafts);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Post Drafts</h1>

      {drafts.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center text-slate-400">
          No drafts yet. Approve sparks to trigger the Ghostwriter.
        </div>
      ) : (
        <div className="space-y-4">
          {drafts.map((draft) => (
            <Link
              key={draft.id}
              href={`/dashboard/drafts/${draft.id}`}
              className="block glass rounded-xl p-5 glass-hover"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      STATUS_COLORS[draft.status]
                    }`}
                  >
                    {draft.status}
                  </span>
                  <span className="text-xs text-slate-500">
                    {LENGTH_LABELS[draft.lengthType]}
                  </span>
                </div>
                {draft.score !== null && (
                  <span
                    className={`text-sm font-mono ${
                      draft.score >= 70 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {draft.score}/100
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mb-1">
                {draft.spark.pipelineItem.project.name} &middot;{" "}
                {draft.spark.sparkText}
              </p>
              <p className="text-sm text-slate-300 line-clamp-2">
                {draft.content}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
