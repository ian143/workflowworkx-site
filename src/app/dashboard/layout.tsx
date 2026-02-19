"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: "grid" },
  { href: "/dashboard/projects", label: "Projects", icon: "folder" },
  { href: "/dashboard/pipeline", label: "Pipeline", icon: "zap" },
  { href: "/dashboard/sparks", label: "Sparks", icon: "sparkles" },
  { href: "/dashboard/drafts", label: "Drafts", icon: "edit" },
  { href: "/dashboard/publish", label: "Publish", icon: "send" },
  { href: "/dashboard/vault", label: "Vault", icon: "shield" },
  { href: "/dashboard/settings", label: "Settings", icon: "settings" },
] as const;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-slate-900/50 flex flex-col">
        <div className="p-6">
          <Link href="/dashboard" className="text-xl font-bold tracking-tight">
            Glue<span className="text-brand-400">OS</span>
          </Link>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-brand-600/20 text-brand-300"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg text-left transition-colors"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}
