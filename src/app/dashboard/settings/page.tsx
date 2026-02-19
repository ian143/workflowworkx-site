"use client";

import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const subscriptionInactive = searchParams.get("subscription") === "inactive";
  const [linkedinConnecting, setLinkedinConnecting] = useState(false);

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

      {/* Subscription Management */}
      <div className="glass rounded-xl p-6">
        <h2 className="text-lg font-bold mb-4">Subscription</h2>
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
      </div>
    </div>
  );
}
