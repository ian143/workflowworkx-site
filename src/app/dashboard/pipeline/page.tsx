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
  new: "text-sage-700 bg-sage-100",
  scouting: "text-blue-700 bg-blue-50",
  sparks_generated: "text-amber-700 bg-amber-50",
  drafting: "text-purple-700 bg-purple-50",
  ready: "text-green-700 bg-green-50",
  published: "text-emerald-700 bg-emerald-50",
  error: "text-red-700 bg-red-50",
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
        <div className="glass rounded-xl p-12 text-center text-sage-600">
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
              <div className="flex gap-4 text-sm text-sage-600">
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
