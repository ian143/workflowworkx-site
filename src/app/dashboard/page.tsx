"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface DashboardStats {
  projects: number;
  pipelineItems: number;
  pendingSparks: number;
  readyDrafts: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    async function load() {
      const [projectsRes, pipelineRes, draftsRes] = await Promise.all([
        fetch("/api/projects"),
        fetch("/api/pipeline"),
        fetch("/api/drafts"),
      ]);

      const projects = projectsRes.ok ? await projectsRes.json() : [];
      const pipeline = pipelineRes.ok ? await pipelineRes.json() : [];
      const drafts = draftsRes.ok ? await draftsRes.json() : [];

      setStats({
        projects: projects.length,
        pipelineItems: pipeline.length,
        pendingSparks: pipeline.reduce(
          (acc: number, p: { _count?: { sparks?: number } }) =>
            acc + (p._count?.sparks ?? 0),
          0
        ),
        readyDrafts: drafts.filter(
          (d: { status: string }) => d.status === "draft"
        ).length,
      });
    }
    load();
  }, []);

  const cards = [
    {
      label: "Active Projects",
      value: stats?.projects ?? "-",
      href: "/dashboard/projects",
      color: "text-blue-600",
    },
    {
      label: "Pipeline Items",
      value: stats?.pipelineItems ?? "-",
      href: "/dashboard/pipeline",
      color: "text-purple-600",
    },
    {
      label: "Pending Sparks",
      value: stats?.pendingSparks ?? "-",
      href: "/dashboard/sparks",
      color: "text-amber-600",
    },
    {
      label: "Ready Drafts",
      value: stats?.readyDrafts ?? "-",
      href: "/dashboard/drafts",
      color: "text-green-600",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Command Center</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="glass rounded-xl p-5 glass-hover"
          >
            <p className="text-sm text-sage-600 mb-1">{card.label}</p>
            <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
          </Link>
        ))}
      </div>

      <div className="glass rounded-xl p-6">
        <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <Link
            href="/dashboard/projects"
            className="px-4 py-3 bg-sage-100 hover:bg-sage-200 rounded-lg text-sm text-sage-700 transition-colors text-center"
          >
            Upload New Project
          </Link>
          <Link
            href="/dashboard/sparks"
            className="px-4 py-3 bg-amber-50 hover:bg-amber-100 rounded-lg text-sm text-amber-700 transition-colors text-center"
          >
            Review Sparks
          </Link>
          <Link
            href="/dashboard/publish"
            className="px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg text-sm text-green-700 transition-colors text-center"
          >
            Publishing Queue
          </Link>
        </div>
      </div>
    </div>
  );
}
