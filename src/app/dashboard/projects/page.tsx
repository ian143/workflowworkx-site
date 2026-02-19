"use client";

import { useEffect, useState, FormEvent } from "react";

interface Project {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  _count: { files: number };
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadProjects() {
    const res = await fetch("/api/projects");
    if (res.ok) setProjects(await res.json());
  }

  useEffect(() => {
    loadProjects();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setName("");
      setShowCreate(false);
      loadProjects();
    }
    setCreating(false);
  }

  async function handleFileUpload(projectId: string, files: FileList) {
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append("files", f));

    await fetch(`/api/projects/${projectId}/upload`, {
      method: "POST",
      body: formData,
    });

    loadProjects();
  }

  const statusColors: Record<string, string> = {
    uploading: "text-yellow-400 bg-yellow-400/10",
    processing: "text-blue-400 bg-blue-400/10",
    ready: "text-green-400 bg-green-400/10",
    archived: "text-slate-400 bg-slate-400/10",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Projects</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-500 rounded-lg text-sm font-medium transition-colors"
        >
          New Project
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="glass rounded-xl p-4 mb-6 flex gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            required
          />
          <button
            type="submit"
            disabled={creating}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            Create
          </button>
        </form>
      )}

      <div className="space-y-3">
        {projects.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center text-slate-400">
            No projects yet. Create one to get started.
          </div>
        ) : (
          projects.map((project) => (
            <div key={project.id} className="glass rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold">{project.name}</h3>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    statusColors[project.status] || ""
                  }`}
                >
                  {project.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">
                  {project._count.files} file
                  {project._count.files !== 1 ? "s" : ""}
                </span>
                <div className="flex gap-2">
                  <label className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm cursor-pointer transition-colors">
                    Upload Files
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      accept=".pdf,.docx,.pptx,.txt,.png,.jpg,.jpeg"
                      onChange={(e) => {
                        if (e.target.files)
                          handleFileUpload(project.id, e.target.files);
                      }}
                    />
                  </label>
                  <button
                    onClick={async () => {
                      await fetch(`/api/projects/${project.id}/ingest`, {
                        method: "POST",
                      });
                      loadProjects();
                    }}
                    className="px-3 py-1.5 bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 rounded-lg text-sm transition-colors"
                  >
                    Run Scout
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
