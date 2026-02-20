"use client";

import { useEffect, useState } from "react";

interface VaultData {
  id: string;
  vaultData: Record<string, unknown>;
  auditStatus: string;
  auditResults: string | null;
  version: number;
}

const AUDIT_STATUS_COLORS: Record<string, string> = {
  pending: "text-sage-700 bg-sage-100",
  passed: "text-green-700 bg-green-50",
  passed_with_warnings: "text-amber-700 bg-amber-50",
  failed: "text-red-700 bg-red-50",
};

export default function VaultPage() {
  const [vault, setVault] = useState<VaultData | null>(null);
  const [editing, setEditing] = useState(false);
  const [json, setJson] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/vault")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setVault(data);
          setJson(JSON.stringify(data.vaultData, null, 2));
        }
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    setError("");

    try {
      const parsed = JSON.parse(json);
      const res = await fetch("/api/vault", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
      } else {
        const updated = await res.json();
        setVault(updated);
        setEditing(false);
      }
    } catch {
      setError("Invalid JSON");
    }

    setSaving(false);
  }

  async function runAudit() {
    const res = await fetch("/api/vault/audit", { method: "POST" });
    if (res.ok) {
      const result = await res.json();
      setVault((v) =>
        v
          ? {
              ...v,
              auditStatus: result.status,
              auditResults: result.summary,
            }
          : null
      );
    }
  }

  if (!vault) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">Identity Vault</h1>
        <div className="glass rounded-xl p-12 text-center">
          <p className="text-sage-600 mb-4">
            No vault configured yet. Complete the onboarding flow to set up your
            Identity Vault.
          </p>
          <a
            href="/onboarding"
            className="inline-block px-4 py-2 bg-sage-600 hover:bg-sage-700 text-white rounded-lg text-sm transition-colors"
          >
            Start Onboarding
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Identity Vault</h1>
          <p className="text-sm text-sage-600 mt-1">Version {vault.version}</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              AUDIT_STATUS_COLORS[vault.auditStatus]
            }`}
          >
            {vault.auditStatus.replace(/_/g, " ")}
          </span>
          <button
            onClick={runAudit}
            className="px-3 py-1.5 bg-sage-100 hover:bg-sage-200 rounded-lg text-sm transition-colors"
          >
            Run Audit
          </button>
          <button
            onClick={() => setEditing(!editing)}
            className="px-3 py-1.5 bg-sage-600 hover:bg-sage-700 text-white rounded-lg text-sm transition-colors"
          >
            {editing ? "Cancel" : "Edit"}
          </button>
        </div>
      </div>

      {vault.auditResults && (
        <div className="glass rounded-xl p-4 mb-6">
          <h3 className="text-sm font-medium mb-1">Latest Audit</h3>
          <p className="text-sm text-sage-600">{vault.auditResults}</p>
        </div>
      )}

      {error && (
        <p className="text-red-600 text-sm mb-4">{error}</p>
      )}

      {editing ? (
        <div>
          <textarea
            value={json}
            onChange={(e) => setJson(e.target.value)}
            rows={30}
            className="w-full bg-white border border-sage-200 rounded-xl px-4 py-3 text-black font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-sage-500 resize-none"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-3 px-4 py-2 bg-sage-600 hover:bg-sage-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      ) : (
        <pre className="glass rounded-xl p-4 text-xs font-mono text-sage-700 overflow-auto max-h-[600px]">
          {JSON.stringify(vault.vaultData, null, 2)}
        </pre>
      )}
    </div>
  );
}
