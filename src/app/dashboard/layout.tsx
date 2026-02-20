"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navContent = (
    <>
      <div className="p-6">
        <Link href="/dashboard" className="text-xl font-bold tracking-tight text-black">
          Glue<span className="text-sage-600">OS</span>
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
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-sage-100 text-sage-800 font-medium"
                  : "text-sage-600 hover:text-black hover:bg-sage-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sage-200">
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full px-3 py-2 text-sm text-sage-600 hover:text-black hover:bg-sage-100 rounded-lg text-left transition-colors"
        >
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 border-r border-sage-200 bg-white flex-col shrink-0">
        {navContent}
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-sage-200 flex flex-col transition-transform duration-200 md:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {navContent}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto min-w-0">
        {/* Mobile header */}
        <div className="md:hidden flex items-center gap-3 p-4 border-b border-sage-200">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 -ml-2 text-sage-600 hover:text-black transition-colors"
            aria-label="Open menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="5" x2="17" y2="5" />
              <line x1="3" y1="10" x2="17" y2="10" />
              <line x1="3" y1="15" x2="17" y2="15" />
            </svg>
          </button>
          <Link href="/dashboard" className="text-lg font-bold tracking-tight text-black">
            Glue<span className="text-sage-600">OS</span>
          </Link>
        </div>

        <div className="max-w-5xl mx-auto p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
