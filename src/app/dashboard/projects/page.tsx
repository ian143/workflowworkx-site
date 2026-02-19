"use client";

import { useEffect, useState } from "react";

interface CloudFolder {
  id: string;
  name: string;
}

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

type Provider = "google_drive" | "onedrive";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);

  // New project flow state
  const [showPicker, setShowPicker] = useState(false);
  const [pickerProvider, setPickerProvider] = useState<Provider | null>(null);
  const [folderPath, setFolderPath] = useState<{ id: string; name: string }[]>([]);
  const [folders, setFolders] = useState<CloudFolder[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [creating, setCreating] = useState(false);

  // File browsing state (for existing projects)
  const [browsingProjectId, setBrowsingProjectId] = useState<string | null>(null);
  const [cloudFiles, setCloudFiles] = useState<CloudFile[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [browsing, setBrowsing] = useState(false);
  const [selectingSaving, setSelectingSaving] = useState(false);

  // Connected providers
  const [connectedProviders, setConnectedProviders] = useState<string[]>([]);

  async function loadProjects() {
    const res = await fetch("/api/projects");
    if (res.ok) setProjects(await res.json());
  }

  useEffect(() => {
    loadProjects();
    fetch("/api/cloud-connections")
      .then((r) => (r.ok ? r.json() : []))
      .then((connections: { provider: string }[]) =>
        setConnectedProviders(connections.map((c) => c.provider))
      );
  }, []);

  async function loadFolders(provider: Provider, parentId: string = "root") {
    setLoadingFolders(true);
    const res = await fetch(
      `/api/cloud-connections/browse?provider=${provider}&parentId=${parentId}`
    );
    if (res.ok) {
      const data = await res.json();
      setFolders(data.folders);
    } else {
      setFolders([]);
    }
    setLoadingFolders(false);
  }

  function startPicker(provider: Provider) {
    setPickerProvider(provider);
    setFolderPath([{ id: "root", name: provider === "google_drive" ? "Google Drive" : "OneDrive" }]);
    setFolders([]);
    loadFolders(provider, "root");
  }

  function navigateToFolder(folder: CloudFolder) {
    if (!pickerProvider) return;
    setFolderPath((prev) => [...prev, { id: folder.id, name: folder.name }]);
    loadFolders(pickerProvider, folder.id);
  }

  function navigateToBreadcrumb(index: number) {
    if (!pickerProvider) return;
    const target = folderPath[index];
    setFolderPath((prev) => prev.slice(0, index + 1));
    loadFolders(pickerProvider, target.id);
  }

  async function selectFolder(folderId: string, folderName: string) {
    if (!pickerProvider) return;
    setCreating(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: folderName,
        sourceFolderId: folderId,
        sourceFolderProvider: pickerProvider,
      }),
    });
    if (res.ok) {
      setShowPicker(false);
      setPickerProvider(null);
      setFolderPath([]);
      setFolders([]);
      loadProjects();
    }
    setCreating(false);
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

  const hasGoogle = connectedProviders.includes("google_drive");
  const hasOneDrive = connectedProviders.includes("onedrive");
  const hasAnyProvider = hasGoogle || hasOneDrive;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Projects</h1>
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-500 rounded-lg text-sm font-medium transition-colors"
        >
          New Project
        </button>
      </div>

      {/* New Project: Provider + Folder Picker */}
      {showPicker && !pickerProvider && (
        <div className="glass rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold mb-2">Choose a cloud drive</h2>
          <p className="text-sm text-slate-400 mb-4">
            Select a folder from your connected drive. The folder name will become the project name.
          </p>
          {!hasAnyProvider ? (
            <p className="text-sm text-slate-400">
              No cloud drives connected.{" "}
              <a href="/dashboard/settings" className="text-brand-400 hover:text-brand-300 underline">
                Connect one in Settings
              </a>{" "}
              first.
            </p>
          ) : (
            <div className="flex gap-3">
              {hasGoogle && (
                <button
                  onClick={() => startPicker("google_drive")}
                  className="flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition-colors"
                >
                  <span>Google Drive</span>
                </button>
              )}
              {hasOneDrive && (
                <button
                  onClick={() => startPicker("onedrive")}
                  className="flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition-colors"
                >
                  <span>OneDrive</span>
                </button>
              )}
            </div>
          )}
          <button
            onClick={() => setShowPicker(false)}
            className="mt-3 text-xs text-slate-500 hover:text-slate-400 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Folder browser */}
      {showPicker && pickerProvider && (
        <div className="glass rounded-xl p-6 mb-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 mb-4 text-sm overflow-x-auto">
            {folderPath.map((crumb, i) => (
              <span key={crumb.id} className="flex items-center gap-1 shrink-0">
                {i > 0 && <span className="text-slate-600">/</span>}
                <button
                  onClick={() => navigateToBreadcrumb(i)}
                  className={`hover:text-brand-400 transition-colors ${
                    i === folderPath.length - 1
                      ? "text-white font-medium"
                      : "text-slate-400"
                  }`}
                >
                  {crumb.name}
                </button>
              </span>
            ))}
          </div>

          {loadingFolders ? (
            <p className="text-sm text-slate-400 py-4">Loading folders...</p>
          ) : folders.length === 0 ? (
            <div className="py-4">
              <p className="text-sm text-slate-400 mb-3">No subfolders here.</p>
              {folderPath.length > 1 && (
                <button
                  onClick={() => {
                    const current = folderPath[folderPath.length - 1];
                    selectFolder(current.id, current.name);
                  }}
                  disabled={creating}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {creating ? "Creating..." : `Select "${folderPath[folderPath.length - 1].name}"`}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-1 max-h-72 overflow-y-auto mb-4">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className="flex items-center justify-between p-2.5 hover:bg-white/5 rounded-lg group"
                >
                  <button
                    onClick={() => navigateToFolder(folder)}
                    className="flex items-center gap-2 text-sm text-left flex-1 min-w-0"
                  >
                    <span className="text-yellow-400 shrink-0">&#128193;</span>
                    <span className="truncate">{folder.name}</span>
                  </button>
                  <button
                    onClick={() => selectFolder(folder.id, folder.name)}
                    disabled={creating}
                    className="px-3 py-1 bg-brand-600 hover:bg-brand-500 rounded text-xs font-medium transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50 shrink-0"
                  >
                    {creating ? "..." : "Select"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Select current folder button (when there are subfolders and we're not at root) */}
          {folders.length > 0 && folderPath.length > 1 && (
            <button
              onClick={() => {
                const current = folderPath[folderPath.length - 1];
                selectFolder(current.id, current.name);
              }}
              disabled={creating}
              className="px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {creating ? "Creating..." : `Select current folder "${folderPath[folderPath.length - 1].name}"`}
            </button>
          )}

          <div className="mt-3 flex gap-3">
            <button
              onClick={() => {
                setPickerProvider(null);
                setFolderPath([]);
                setFolders([]);
              }}
              className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
            >
              Back to drives
            </button>
            <button
              onClick={() => {
                setShowPicker(false);
                setPickerProvider(null);
                setFolderPath([]);
                setFolders([]);
              }}
              className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {projects.length === 0 && !showPicker ? (
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
                </p>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">
                  {project._count.files} file
                  {project._count.files !== 1 ? "s" : ""}
                </span>
                <div className="flex gap-2">
                  {project.sourceFolderProvider && (
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
