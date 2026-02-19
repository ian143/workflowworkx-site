"use client";

import { useEffect, useState } from "react";

interface DiscoveredFolder {
  id: string;
  name: string;
  isProject: boolean;
  projectId: string | null;
  projectStatus: string | null;
  fileCount: number;
}

interface CloudFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedTime: string;
}

export default function ProjectsPage() {
  const [discoveredFolders, setDiscoveredFolders] = useState<DiscoveredFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [noWatchFolder, setNoWatchFolder] = useState(false);
  const [creatingId, setCreatingId] = useState<string | null>(null);

  // File browsing state
  const [browsingProjectId, setBrowsingProjectId] = useState<string | null>(null);
  const [cloudFiles, setCloudFiles] = useState<CloudFile[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [browsing, setBrowsing] = useState(false);
  const [selectingSaving, setSelectingSaving] = useState(false);

  async function syncFolders() {
    setSyncing(true);
    const res = await fetch("/api/watch-folder/sync");
    if (res.ok) {
      const data = await res.json();
      setDiscoveredFolders(data.folders);
      setNoWatchFolder(false);
    } else {
      const data = await res.json();
      if (data.error?.includes("No watch folder")) {
        setNoWatchFolder(true);
      }
      setDiscoveredFolders([]);
    }
    setSyncing(false);
    setLoading(false);
  }

  useEffect(() => {
    syncFolders();
  }, []);

  async function createProject(folder: DiscoveredFolder) {
    setCreatingId(folder.id);

    const watchRes = await fetch("/api/watch-folder");
    if (!watchRes.ok) {
      setCreatingId(null);
      return;
    }
    const watchData = await watchRes.json();

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: folder.name,
        sourceFolderId: folder.id,
        sourceFolderProvider: watchData.watchFolderProvider,
      }),
    });

    if (res.ok) {
      await syncFolders();
    }
    setCreatingId(null);
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
    await syncFolders();
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

  const statusLabels: Record<string, { text: string; className: string }> = {
    linking: { text: "Linking", className: "text-yellow-400 bg-yellow-400/10" },
    processing: { text: "Processing", className: "text-blue-400 bg-blue-400/10" },
    ready: { text: "Ready", className: "text-green-400 bg-green-400/10" },
    archived: { text: "Archived", className: "text-slate-400 bg-slate-400/10" },
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-8">Projects</h1>
        <div className="glass rounded-xl p-12 text-center text-slate-400">
          Scanning your watch folder...
        </div>
      </div>
    );
  }

  if (noWatchFolder) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-8">Projects</h1>
        <div className="glass rounded-xl p-12 text-center">
          <p className="text-slate-400 mb-4">
            No watch folder configured yet. Set a root folder in Settings and
            each subfolder will automatically appear here as a project.
          </p>
          <a
            href="/dashboard/settings"
            className="inline-block px-4 py-2 bg-brand-600 hover:bg-brand-500 rounded-lg text-sm font-medium transition-colors"
          >
            Go to Settings
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Projects</h1>
        <button
          onClick={syncFolders}
          disabled={syncing}
          className="px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {syncing ? "Syncing..." : "Sync Folders"}
        </button>
      </div>

      {discoveredFolders.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center text-slate-400">
          No folders found in your watch directory. Add some folders to your
          cloud drive and click Sync.
        </div>
      ) : (
        <div className="space-y-3">
          {discoveredFolders.map((folder) => (
            <div key={folder.id} className="glass rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold">{folder.name}</h3>
                  {folder.isProject && folder.projectStatus && (
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        statusLabels[folder.projectStatus]?.className || ""
                      }`}
                    >
                      {statusLabels[folder.projectStatus]?.text || folder.projectStatus}
                    </span>
                  )}
                </div>

                {folder.isProject ? (
                  <span className="text-xs text-slate-500 bg-white/5 px-2 py-1 rounded-full">
                    Already added
                  </span>
                ) : (
                  <button
                    onClick={() => createProject(folder)}
                    disabled={creatingId !== null}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {creatingId === folder.id ? "Creating..." : "Add Project"}
                  </button>
                )}
              </div>

              {folder.isProject && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">
                    {folder.fileCount} file{folder.fileCount !== 1 ? "s" : ""}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleBrowseFolder(folder.projectId!)}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-colors"
                    >
                      Browse Files
                    </button>
                    <button
                      onClick={async () => {
                        await fetch(`/api/projects/${folder.projectId}/ingest`, {
                          method: "POST",
                        });
                        await syncFolders();
                      }}
                      disabled={folder.fileCount === 0}
                      className="px-3 py-1.5 bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 rounded-lg text-sm transition-colors disabled:opacity-30"
                    >
                      Run Scout
                    </button>
                  </div>
                </div>
              )}

              {/* Browse files panel */}
              {folder.projectId && browsingProjectId === folder.projectId && (
                <div className="mt-4 p-4 bg-white/5 rounded-lg">
                  {browsing ? (
                    <p className="text-sm text-slate-400">Loading files...</p>
                  ) : cloudFiles.length === 0 ? (
                    <p className="text-sm text-slate-400">
                      No files found in this folder.
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
                          onClick={() => handleSelectFiles(folder.projectId!)}
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
          ))}
        </div>
      )}
    </div>
  );
}
