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
  pending: "border-amber-300 bg-amber-50",
  approved: "border-green-300 bg-green-50",
  rejected: "border-red-300 bg-red-50",
  drafted: "border-purple-300 bg-purple-50",
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
          <h2 className="text-lg font-medium text-amber-600 mb-4">
            Awaiting Review ({pendingSparks.length})
          </h2>
          <div className="space-y-3">
            {pendingSparks.map((spark) => (
              <div
                key={spark.id}
                className={`rounded-xl p-5 border ${STATUS_COLORS[spark.status]}`}
              >
                <p className="text-xs text-sage-600 mb-2">
                  {spark.pipelineItem.project.name} &middot; Spark{" "}
                  {spark.sortOrder}
                </p>
                <p className="text-lg font-bold mb-4">{spark.sparkText}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction(spark.id, "approve")}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleAction(spark.id, "reject")}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-sm transition-colors"
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
          <h2 className="text-lg font-medium text-sage-600 mb-4">
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
                    <p className="text-xs text-sage-600 mb-1">
                      {spark.pipelineItem.project.name} &middot; Spark{" "}
                      {spark.sortOrder}
                    </p>
                    <p className="font-bold">{spark.sparkText}</p>
                  </div>
                  <span className="text-xs capitalize text-sage-600">
                    {spark.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sparks.length === 0 && (
        <div className="glass rounded-xl p-12 text-center text-sage-600">
          No sparks yet. Run the Scout + Architect phases on a project first.
        </div>
      )}
    </div>
  );
}

export default function SparksPage() {
  return (
    <Suspense fallback={<div className="text-sage-600">Loading sparks...</div>}>
      <SparksContent />
    </Suspense>
  );
}
