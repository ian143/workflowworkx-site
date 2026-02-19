"use client";

import { useEffect, useState, FormEvent } from "react";

interface CloudFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedTime: string;
}

interface Project {
  id: string;
  name: string;
  status: string;
  sourceFolderUrl: string | null;
  sourceFolderProvider: string | null;
  createdAt: string;
  _count: { files: number };
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  // Folder linking state
  const [linkingProjectId, setLinkingProjectId] = useState<string | null>(null);
  const [folderUrl, setFolderUrl] = useState("");
  const [folderProvider, setFolderProvider] = useState<"google_drive" | "onedrive">("google_drive");
  const [linkingSaving, setLinkingSaving] = useState(false);

  // File browsing state
  const [browsingProjectId, setBrowsingProjectId] = useState<string | null>(null);
  const [cloudFiles, setCloudFiles] = useState<CloudFile[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [browsing, setBrowsing] = useState(false);
  const [selectingSaving, setSelectingSaving] = useState(false);

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

  async function handleLinkFolder(projectId: string) {
    setLinkingSaving(true);
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceFolderUrl: folderUrl,
        sourceFolderProvider: folderProvider,
      }),
    });
    if (res.ok) {
      setLinkingProjectId(null);
      setFolderUrl("");
      loadProjects();
    }
    setLinkingSaving(false);
  }

  async function handleBrowseFolder(projectId: string) {
    setBrowsingProjectId(projectId);
    setBrowsing(true);
    setCloudFiles([]);
    setSelectedFileIds(new Set());

    const res = await fetch(`/api/projects/${projectId}/browse-folder`);
    if (res.ok) {
      const data = await res.json();
      setCloudFiles(data.files);
    }
    setBrowsing(false);
  }

  async function handleSelectFiles(projectId: string) {
    setSelectingSaving(true);
    const filesToSelect = cloudFiles.filter((f) => selectedFileIds.has(f.id));
    await fetch(`/api/projects/${projectId}/select-files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files: filesToSelect }),
    });
    setBrowsingProjectId(null);
    setCloudFiles([]);
    setSelectedFileIds(new Set());
    setSelectingSaving(false);
    loadProjects();
  }

  function toggleFile(fileId: string) {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const statusColors: Record<string, string> = {
    linking: "text-yellow-400 bg-yellow-400/10",
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

              {/* Linked folder info */}
              {project.sourceFolderProvider && (
                <p className="text-xs text-slate-400 mb-3">
                  Linked to{" "}
                  {project.sourceFolderProvider === "google_drive"
                    ? "Google Drive"
                    : "OneDrive"}
                  {project.sourceFolderUrl && (
                    <span className="ml-1 text-slate-500 truncate inline-block max-w-[200px] align-bottom">
                      {project.sourceFolderUrl}
                    </span>
                  )}
                </p>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">
                  {project._count.files} file
                  {project._count.files !== 1 ? "s" : ""}
                </span>
                <div className="flex gap-2">
                  {!project.sourceFolderProvider ? (
                    <button
                      onClick={() => {
                        setLinkingProjectId(
                          linkingProjectId === project.id ? null : project.id
                        );
                      }}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-colors"
                    >
                      Link Folder
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBrowseFolder(project.id)}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-colors"
                    >
                      Browse Files
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      await fetch(`/api/projects/${project.id}/ingest`, {
                        method: "POST",
                      });
                      loadProjects();
                    }}
                    disabled={project._count.files === 0}
                    className="px-3 py-1.5 bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 rounded-lg text-sm transition-colors disabled:opacity-30"
                  >
                    Run Scout
                  </button>
                </div>
              </div>

              {/* Link folder form */}
              {linkingProjectId === project.id && (
                <div className="mt-4 p-4 bg-white/5 rounded-lg space-y-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Cloud Provider
                    </label>
                    <select
                      value={folderProvider}
                      onChange={(e) =>
                        setFolderProvider(
                          e.target.value as "google_drive" | "onedrive"
                        )
                      }
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="google_drive" className="text-black bg-white">
                        Google Drive
                      </option>
                      <option value="onedrive" className="text-black bg-white">
                        OneDrive
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Folder URL
                    </label>
                    <input
                      type="url"
                      value={folderUrl}
                      onChange={(e) => setFolderUrl(e.target.value)}
                      placeholder={
                        folderProvider === "google_drive"
                          ? "https://drive.google.com/drive/folders/..."
                          : "Paste OneDrive/SharePoint folder link"
                      }
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleLinkFolder(project.id)}
                      disabled={!folderUrl || linkingSaving}
                      className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 rounded-lg text-sm transition-colors disabled:opacity-50"
                    >
                      {linkingSaving ? "Linking..." : "Link Folder"}
                    </button>
                    <button
                      onClick={() => setLinkingProjectId(null)}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Browse files panel */}
              {browsingProjectId === project.id && (
                <div className="mt-4 p-4 bg-white/5 rounded-lg">
                  {browsing ? (
                    <p className="text-sm text-slate-400">Loading files...</p>
                  ) : cloudFiles.length === 0 ? (
                    <p className="text-sm text-slate-400">
                      No files found in linked folder.
                    </p>
                  ) : (
                    <>
                      <div className="space-y-2 max-h-60 overflow-y-auto mb-3">
                        {cloudFiles.map((file) => (
                          <label
                            key={file.id}
                            className="flex items-center gap-3 p-2 hover:bg-white/5 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedFileIds.has(file.id)}
                              onChange={() => toggleFile(file.id)}
                              className="rounded border-white/20"
                            />
                            <span className="text-sm flex-1 truncate">
                              {file.name}
                            </span>
                            <span className="text-xs text-slate-500">
                              {formatSize(file.size)}
                            </span>
                          </label>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSelectFiles(project.id)}
                          disabled={selectedFileIds.size === 0 || selectingSaving}
                          className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 rounded-lg text-sm transition-colors disabled:opacity-50"
                        >
                          {selectingSaving
                            ? "Saving..."
                            : `Select ${selectedFileIds.size} File${selectedFileIds.size !== 1 ? "s" : ""}`}
                        </button>
                        <button
                          onClick={() => setBrowsingProjectId(null)}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
