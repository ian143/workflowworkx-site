"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface PipelineItem {
  id: string;
  status: string;
  priority: string;
  createdAt: string;
  project: { name: string };
  _count: { sparks: number };
}

const STATUS_ORDER = [
  "new",
  "scouting",
  "sparks_generated",
  "drafting",
  "ready",
  "published",
  "error",
];

const STATUS_COLORS: Record<string, string> = {
  new: "text-slate-400 bg-slate-400/10",
  scouting: "text-blue-400 bg-blue-400/10",
  sparks_generated: "text-amber-400 bg-amber-400/10",
  drafting: "text-purple-400 bg-purple-400/10",
  ready: "text-green-400 bg-green-400/10",
  published: "text-emerald-400 bg-emerald-400/10",
  error: "text-red-400 bg-red-400/10",
};

export default function PipelinePage() {
  const [items, setItems] = useState<PipelineItem[]>([]);

  useEffect(() => {
    fetch("/api/pipeline")
      .then((r) => (r.ok ? r.json() : []))
      .then(setItems);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Steel Loop Pipeline</h1>

      {/* Status legend */}
      <div className="flex flex-wrap gap-2 mb-6">
        {STATUS_ORDER.map((status) => (
          <span
            key={status}
            className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[status]}`}
          >
            {status.replace(/_/g, " ")}
          </span>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center text-slate-400">
          No pipeline items yet. Upload and ingest a project to start the Steel
          Loop.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/dashboard/sparks?pipeline=${item.id}`}
              className="block glass rounded-xl p-5 glass-hover"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold">{item.project.name}</h3>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    STATUS_COLORS[item.status]
                  }`}
                >
                  {item.status.replace(/_/g, " ")}
                </span>
              </div>
              <div className="flex gap-4 text-sm text-slate-400">
                <span>Priority: {item.priority}</span>
                <span>{item._count.sparks} sparks</span>
                <span>
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
