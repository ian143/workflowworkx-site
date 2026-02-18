"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [linkedinConnecting, setLinkedinConnecting] = useState(false);

  async function connectLinkedIn() {
    setLinkedinConnecting(true);
    const res = await fetch("/api/auth/linkedin");
    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    }
    setLinkedinConnecting(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Settings</h1>

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
