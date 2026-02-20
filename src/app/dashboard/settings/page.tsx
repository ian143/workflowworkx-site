"use client";

import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";

interface CloudConnection {
  id: string;
  provider: string;
  accountEmail: string | null;
  createdAt: string;
}

interface CloudFolder {
  id: string;
  name: string;
}

interface WatchFolder {
  watchFolderId: string | null;
  watchFolderProvider: string | null;
  watchFolderName: string | null;
}

function SettingsContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const subscriptionInactive = searchParams.get("subscription") === "inactive";
  const cloudStatus = searchParams.get("cloud");
  const authError = searchParams.get("error");
  const authErrorReason = searchParams.get("reason");
  const [linkedinConnecting, setLinkedinConnecting] = useState(false);
  const [resubLoading, setResubLoading] = useState<string | null>(null);
  const [cloudConnections, setCloudConnections] = useState<CloudConnection[]>([]);
  const [cloudConnecting, setCloudConnecting] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Watch folder state
  const [watchFolder, setWatchFolder] = useState<WatchFolder | null>(null);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [pickerProvider, setPickerProvider] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{ id: string; name: string }[]>([]);
  const [folders, setFolders] = useState<CloudFolder[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [savingWatch, setSavingWatch] = useState(false);

  // Show OAuth status messages from redirect
  useEffect(() => {
    if (cloudStatus === "google_connected") {
      setStatusMessage({ type: "success", text: "Google Drive connected successfully!" });
    } else if (cloudStatus === "onedrive_connected") {
      setStatusMessage({ type: "success", text: "OneDrive connected successfully!" });
    } else if (authError === "google_auth_failed") {
      const detail = authErrorReason ? ` (${authErrorReason})` : "";
      setStatusMessage({ type: "error", text: `Google Drive connection failed.${detail}` });
    } else if (authError === "no_code") {
      setStatusMessage({ type: "error", text: "Google Drive authorization was cancelled." });
    } else if (authError) {
      setStatusMessage({ type: "error", text: `Connection failed: ${authError}` });
    }
  }, [cloudStatus, authError, authErrorReason]);

  useEffect(() => {
    fetch("/api/cloud-connections")
      .then((r) => (r.ok ? r.json() : []))
      .then(setCloudConnections);
    fetch("/api/watch-folder")
      .then((r) => (r.ok ? r.json() : null))
      .then(setWatchFolder);
  }, []);

  async function loadFolders(provider: string, parentId: string = "root") {
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

  function startFolderPicker(provider: string) {
    setPickerProvider(provider);
    setFolderPath([{ id: "root", name: provider === "google_drive" ? "Google Drive" : "OneDrive" }]);
    setFolders([]);
    loadFolders(provider, "root");
  }

  function navigateFolder(folder: CloudFolder) {
    if (!pickerProvider) return;
    setFolderPath((prev) => [...prev, { id: folder.id, name: folder.name }]);
    loadFolders(pickerProvider, folder.id);
  }

  function navigateBreadcrumb(index: number) {
    if (!pickerProvider) return;
    const target = folderPath[index];
    setFolderPath((prev) => prev.slice(0, index + 1));
    loadFolders(pickerProvider, target.id);
  }

  async function selectWatchFolder(folderId: string, folderName: string) {
    if (!pickerProvider) return;
    setSavingWatch(true);
    const res = await fetch("/api/watch-folder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId, provider: pickerProvider, folderName }),
    });
    if (res.ok) {
      setWatchFolder(await res.json());
      setShowFolderPicker(false);
      setPickerProvider(null);
      setFolderPath([]);
      setFolders([]);
    }
    setSavingWatch(false);
  }

  async function removeWatchFolder() {
    await fetch("/api/watch-folder", { method: "DELETE" });
    setWatchFolder({ watchFolderId: null, watchFolderProvider: null, watchFolderName: null });
  }

  async function connectCloudDrive(provider: "google-drive" | "onedrive") {
    setCloudConnecting(provider);
    const res = await fetch(`/api/auth/${provider}`);
    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    }
    setCloudConnecting(null);
  }

  async function disconnectCloudDrive(provider: string) {
    await fetch("/api/cloud-connections", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });
    setCloudConnections((prev) => prev.filter((c) => c.provider !== provider));
  }

  const subscriptionStatus = (
    session?.user as { subscriptionStatus?: string } | undefined
  )?.subscriptionStatus;
  const isInactive =
    subscriptionStatus === "cancelled" ||
    subscriptionStatus === "paused" ||
    subscriptionStatus === "pending_audit";

  async function handleResubscribe(includeSetup: boolean) {
    setResubLoading(includeSetup ? "setup" : "monthly");
    const res = await fetch("/api/auth/resubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ includeSetup }),
    });
    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    }
    setResubLoading(null);
  }

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  async function connectLinkedIn() {
    setLinkedinConnecting(true);
    const res = await fetch("/api/auth/linkedin");
    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    }
    setLinkedinConnecting(false);
  }

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");

    if (newPassword !== confirmPassword) {
      setPwError("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setPwError("New password must be at least 8 characters");
      return;
    }

    setPwLoading(true);

    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    setPwLoading(false);

    if (res.ok) {
      setPwSuccess("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      const data = await res.json();
      setPwError(data.error || "Failed to update password");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Settings</h1>

      {/* Subscription inactive banner */}
      {subscriptionInactive && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
          <p className="text-red-400 text-sm font-medium">
            Your subscription is no longer active. Please renew your
            subscription below to regain access.
          </p>
        </div>
      )}

      {/* OAuth status message */}
      {statusMessage && (
        <div
          className={`rounded-xl p-4 mb-6 ${
            statusMessage.type === "success"
              ? "bg-green-500/10 border border-green-500/30"
              : "bg-red-500/10 border border-red-500/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <p
              className={`text-sm font-medium ${
                statusMessage.type === "success" ? "text-green-400" : "text-red-400"
              }`}
            >
              {statusMessage.text}
            </p>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-xs text-slate-500 hover:text-slate-400 ml-4"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Account */}
      <div className="glass rounded-xl p-6 mb-6">
        <h2 className="text-lg font-bold mb-4">Account</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">Email</span>
            <span className="text-sm">{session?.user?.email ?? "..."}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">Name</span>
            <span className="text-sm">{session?.user?.name ?? "..."}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">Subscription</span>
            <span className="text-sm capitalize">
              {(session?.user as { subscriptionStatus?: string })
                ?.subscriptionStatus?.replace(/_/g, " ") ?? "..."}
            </span>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="glass rounded-xl p-6 mb-6">
        <h2 className="text-lg font-bold mb-4">Change Password</h2>
        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-sm">
          <div>
            <label className="block text-sm text-slate-400 mb-1">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              minLength={8}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              minLength={8}
              required
            />
          </div>

          {pwError && <p className="text-red-400 text-sm">{pwError}</p>}
          {pwSuccess && <p className="text-green-400 text-sm">{pwSuccess}</p>}

          <button
            type="submit"
            disabled={pwLoading}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {pwLoading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>

      {/* LinkedIn Connection */}
      <div className="glass rounded-xl p-6 mb-6">
        <h2 className="text-lg font-bold mb-4">LinkedIn Connection</h2>
        <p className="text-sm text-slate-400 mb-4">
          Connect your LinkedIn account to publish posts directly from GlueOS.
        </p>
        <button
          onClick={connectLinkedIn}
          disabled={linkedinConnecting}
          className="px-4 py-2 bg-[#0077b5] hover:bg-[#006699] rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {linkedinConnecting ? "Connecting..." : "Connect LinkedIn"}
        </button>
      </div>

      {/* Cloud Drive Connections */}
      <div className="glass rounded-xl p-6 mb-6">
        <h2 className="text-lg font-bold mb-4">Cloud Drive Connections</h2>
        <p className="text-sm text-slate-400 mb-4">
          Connect your cloud storage to link project folders. Files are read at
          processing time and never stored.
        </p>

        {cloudConnections.length > 0 && (
          <div className="space-y-3 mb-4">
            {cloudConnections.map((conn) => (
              <div
                key={conn.id}
                className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3"
              >
                <div>
                  <span className="text-sm font-medium">
                    {conn.provider === "google_drive"
                      ? "Google Drive"
                      : "OneDrive"}
                  </span>
                  {conn.accountEmail && (
                    <span className="text-xs text-slate-400 ml-2">
                      ({conn.accountEmail})
                    </span>
                  )}
                </div>
                <button
                  onClick={() => disconnectCloudDrive(conn.provider)}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          {!cloudConnections.some((c) => c.provider === "google_drive") && (
            <button
              onClick={() => connectCloudDrive("google-drive")}
              disabled={cloudConnecting !== null}
              className="px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {cloudConnecting === "google-drive"
                ? "Connecting..."
                : "Connect Google Drive"}
            </button>
          )}
          {!cloudConnections.some((c) => c.provider === "onedrive") && (
            <button
              onClick={() => connectCloudDrive("onedrive")}
              disabled={cloudConnecting !== null}
              className="px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {cloudConnecting === "onedrive"
                ? "Connecting..."
                : "Connect OneDrive"}
            </button>
          )}
        </div>
      </div>

      {/* Watch Folder */}
      <div className="glass rounded-xl p-6 mb-6">
        <h2 className="text-lg font-bold mb-4">Project Watch Folder</h2>
        <p className="text-sm text-slate-400 mb-4">
          Set a root folder to watch. Each subfolder will automatically appear as a
          potential project on the Projects page.
        </p>

        {watchFolder?.watchFolderId ? (
          <div className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3 mb-4">
            <div>
              <span className="text-sm font-medium">{watchFolder.watchFolderName}</span>
              <span className="text-xs text-slate-400 ml-2">
                ({watchFolder.watchFolderProvider === "google_drive" ? "Google Drive" : "OneDrive"})
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowFolderPicker(true);
                  setPickerProvider(null);
                }}
                className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                Change
              </button>
              <button
                onClick={removeWatchFolder}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          !showFolderPicker && (
            <button
              onClick={() => setShowFolderPicker(true)}
              disabled={cloudConnections.length === 0}
              className="px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {cloudConnections.length === 0
                ? "Connect a cloud drive first"
                : "Choose Watch Folder"}
            </button>
          )
        )}

        {/* Provider selection */}
        {showFolderPicker && !pickerProvider && (
          <div className="mt-4 p-4 bg-white/5 rounded-lg">
            <p className="text-sm text-slate-400 mb-3">Choose a drive:</p>
            <div className="flex gap-3">
              {cloudConnections.some((c) => c.provider === "google_drive") && (
                <button
                  onClick={() => startFolderPicker("google_drive")}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-colors"
                >
                  Google Drive
                </button>
              )}
              {cloudConnections.some((c) => c.provider === "onedrive") && (
                <button
                  onClick={() => startFolderPicker("onedrive")}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-colors"
                >
                  OneDrive
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFolderPicker(false)}
              className="mt-2 text-xs text-slate-500 hover:text-slate-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Folder browser */}
        {showFolderPicker && pickerProvider && (
          <div className="mt-4 p-4 bg-white/5 rounded-lg">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1 mb-3 text-sm overflow-x-auto">
              {folderPath.map((crumb, i) => (
                <span key={crumb.id} className="flex items-center gap-1 shrink-0">
                  {i > 0 && <span className="text-slate-600">/</span>}
                  <button
                    onClick={() => navigateBreadcrumb(i)}
                    className={`hover:text-brand-400 transition-colors ${
                      i === folderPath.length - 1 ? "text-white font-medium" : "text-slate-400"
                    }`}
                  >
                    {crumb.name}
                  </button>
                </span>
              ))}
            </div>

            {loadingFolders ? (
              <p className="text-sm text-slate-400 py-3">Loading folders...</p>
            ) : folders.length === 0 ? (
              <div className="py-3">
                <p className="text-sm text-slate-400 mb-3">No subfolders here.</p>
                {folderPath.length > 1 && (
                  <button
                    onClick={() => {
                      const current = folderPath[folderPath.length - 1];
                      selectWatchFolder(current.id, current.name);
                    }}
                    disabled={savingWatch}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {savingWatch ? "Saving..." : `Set "${folderPath[folderPath.length - 1].name}" as watch folder`}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-1 max-h-60 overflow-y-auto mb-3">
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg group"
                  >
                    <button
                      onClick={() => navigateFolder(folder)}
                      className="flex items-center gap-2 text-sm text-left flex-1 min-w-0"
                    >
                      <span className="text-yellow-400 shrink-0">&#128193;</span>
                      <span className="truncate">{folder.name}</span>
                    </button>
                    <button
                      onClick={() => selectWatchFolder(folder.id, folder.name)}
                      disabled={savingWatch}
                      className="px-3 py-1 bg-brand-600 hover:bg-brand-500 rounded text-xs font-medium transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50 shrink-0"
                    >
                      {savingWatch ? "..." : "Select"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {folders.length > 0 && folderPath.length > 1 && (
              <button
                onClick={() => {
                  const current = folderPath[folderPath.length - 1];
                  selectWatchFolder(current.id, current.name);
                }}
                disabled={savingWatch}
                className="px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {savingWatch ? "Saving..." : `Set "${folderPath[folderPath.length - 1].name}" as watch folder`}
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
                  setShowFolderPicker(false);
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
      </div>

      {/* Subscription Management */}
      <div className="glass rounded-xl p-6">
        <h2 className="text-lg font-bold mb-4">Subscription</h2>

        {isInactive ? (
          <>
            <p className="text-sm text-slate-400 mb-4">
              Your subscription is not active. Choose an option below to
              resubscribe.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => handleResubscribe(false)}
                disabled={resubLoading !== null}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {resubLoading === "monthly"
                  ? "Redirecting..."
                  : "Resubscribe (Monthly Only)"}
              </button>
              <button
                onClick={() => handleResubscribe(true)}
                disabled={resubLoading !== null}
                className="px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {resubLoading === "setup"
                  ? "Redirecting..."
                  : "Resubscribe with Setup Fee"}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Already completed onboarding? Choose &quot;Monthly Only&quot; to
              skip the setup fee.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-400 mb-4">
              Manage your subscription through the Stripe customer portal.
            </p>
            <button
              onClick={async () => {
                const res = await fetch("/api/auth/billing-portal", {
                  method: "POST",
                });
                if (res.ok) {
                  const { url } = await res.json();
                  window.location.href = url;
                }
              }}
              className="px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-sm transition-colors"
            >
              Manage Subscription
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="text-slate-400">Loading settings...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
