"use client";

import { useEffect, useState } from "react";

interface PublishedDraft {
  id: string;
  content: string;
  status: string;
  publishedAt: string | null;
  linkedinPostId: string | null;
  spark: {
    sparkText: string;
    pipelineItem: {
      project: { name: string };
    };
  };
}

export default function PublishPage() {
  const [drafts, setDrafts] = useState<PublishedDraft[]>([]);

  useEffect(() => {
    fetch("/api/drafts")
      .then((r) => (r.ok ? r.json() : []))
      .then((all: PublishedDraft[]) => {
        setDrafts(
          all.filter(
            (d) => d.status === "approved" || d.status === "published"
          )
        );
      });
  }, []);

  const approved = drafts.filter((d) => d.status === "approved");
  const published = drafts.filter((d) => d.status === "published");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Publishing Queue</h1>

      {approved.length > 0 && (
        <div className="mb-10">
          <h2 className="text-lg font-medium text-green-400 mb-4">
            Ready to Publish ({approved.length})
          </h2>
          <div className="space-y-3">
            {approved.map((draft) => (
              <div key={draft.id} className="glass rounded-xl p-5">
                <p className="text-xs text-slate-400 mb-2">
                  {draft.spark.pipelineItem.project.name} &middot; &ldquo;
                  {draft.spark.sparkText}&rdquo;
                </p>
                <p className="text-sm text-slate-300 line-clamp-3 mb-4">
                  {draft.content}
                </p>
                <button
                  onClick={async () => {
                    await fetch(`/api/drafts/${draft.id}/publish`, {
                      method: "POST",
                    });
                    window.location.reload();
                  }}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 rounded-lg text-sm font-medium transition-colors"
                >
                  Publish Now
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {published.length > 0 && (
        <div>
          <h2 className="text-lg font-medium text-slate-400 mb-4">
            Published ({published.length})
          </h2>
          <div className="space-y-3">
            {published.map((draft) => (
              <div key={draft.id} className="glass rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-400">
                    {draft.spark.pipelineItem.project.name}
                  </p>
                  {draft.publishedAt && (
                    <span className="text-xs text-emerald-400">
                      Published{" "}
                      {new Date(draft.publishedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-300 line-clamp-2">
                  {draft.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {drafts.length === 0 && (
        <div className="glass rounded-xl p-12 text-center text-slate-400">
          No approved or published drafts yet.
        </div>
      )}
    </div>
  );
}
