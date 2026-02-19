"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface Spark {
  id: string;
  sparkText: string;
  status: string;
  sortOrder: number;
  pipelineItem: {
    id: string;
    project: { name: string };
  };
}

const STATUS_COLORS: Record<string, string> = {
  pending: "border-amber-500/30 bg-amber-500/5",
  approved: "border-green-500/30 bg-green-500/5",
  rejected: "border-red-500/30 bg-red-500/5",
  drafted: "border-purple-500/30 bg-purple-500/5",
};

function SparksContent() {
  const searchParams = useSearchParams();
  const pipelineId = searchParams.get("pipeline");
  const [sparks, setSparks] = useState<Spark[]>([]);

  async function loadSparks() {
    const url = pipelineId
      ? `/api/pipeline/${pipelineId}/sparks`
      : "/api/pipeline";
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();

    if (pipelineId) {
      setSparks(data);
    } else {
      // Load all sparks from all pipeline items
      const allSparks: Spark[] = [];
      for (const item of data) {
        const sparkRes = await fetch(`/api/pipeline/${item.id}/sparks`);
        if (sparkRes.ok) {
          const itemSparks = await sparkRes.json();
          allSparks.push(...itemSparks);
        }
      }
      setSparks(allSparks);
    }
  }

  useEffect(() => {
    loadSparks();
  }, [pipelineId]);

  async function handleAction(sparkId: string, action: "approve" | "reject") {
    await fetch(`/api/sparks/${sparkId}/${action}`, { method: "POST" });
    loadSparks();
  }

  const pendingSparks = sparks.filter((s) => s.status === "pending");
  const otherSparks = sparks.filter((s) => s.status !== "pending");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Strategic Sparks</h1>

      {pendingSparks.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-medium text-amber-400 mb-4">
            Awaiting Review ({pendingSparks.length})
          </h2>
          <div className="space-y-3">
            {pendingSparks.map((spark) => (
              <div
                key={spark.id}
                className={`rounded-xl p-5 border ${STATUS_COLORS[spark.status]}`}
              >
                <p className="text-xs text-slate-400 mb-2">
                  {spark.pipelineItem.project.name} &middot; Spark{" "}
                  {spark.sortOrder}
                </p>
                <p className="text-lg font-bold mb-4">{spark.sparkText}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction(spark.id, "approve")}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleAction(spark.id, "reject")}
                    className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg text-sm transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {otherSparks.length > 0 && (
        <div>
          <h2 className="text-lg font-medium text-slate-400 mb-4">
            Reviewed ({otherSparks.length})
          </h2>
          <div className="space-y-3">
            {otherSparks.map((spark) => (
              <div
                key={spark.id}
                className={`rounded-xl p-5 border ${STATUS_COLORS[spark.status]}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">
                      {spark.pipelineItem.project.name} &middot; Spark{" "}
                      {spark.sortOrder}
                    </p>
                    <p className="font-bold">{spark.sparkText}</p>
                  </div>
                  <span className="text-xs capitalize text-slate-400">
                    {spark.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sparks.length === 0 && (
        <div className="glass rounded-xl p-12 text-center text-slate-400">
          No sparks yet. Run the Scout + Architect phases on a project first.
        </div>
      )}
    </div>
  );
}

export default function SparksPage() {
  return (
    <Suspense fallback={<div className="text-slate-400">Loading sparks...</div>}>
      <SparksContent />
    </Suspense>
  );
}
