"use client";

import { useState } from "react";
import { UserButton } from "@clerk/nextjs";
import {
  Menu,
  X,
  Zap,
  LayoutDashboard,
  Inbox,
  Video,
  UserCircle,
  BookOpen,
  FileText,
  BarChart3,
  Users,
  Target,
  Plug,
  type LucideIcon,
} from "lucide-react";

interface AppNavProps {
  /** Current page path for active state highlighting */
  currentPage?: string;
  /** Number of pending requests to show as badge */
  pendingRequests?: number;
  /** Whether user has an active subscription */
  hasSubscription?: boolean;
  /** Whether user is on the max tier */
  isMaxTier?: boolean;
  /** Handler for billing button click */
  onManageBilling?: () => void;
  /** Optional tier badge text */
  tierBadge?: string;
  /** Whether user has priority processing */
  hasPriority?: boolean;
}

const NAV_ITEMS: Array<{ href: string; label: string; icon: LucideIcon; hasBadge?: boolean }> = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/requests", label: "Requests", icon: Inbox, hasBadge: true },
  { href: "/practice", label: "Practice", icon: Video },
  { href: "/extensions", label: "Extensions", icon: Plug },
  { href: "/profile", label: "Profile", icon: UserCircle },
  { href: "/knowledge-base", label: "Knowledge Base", icon: BookOpen },
  { href: "/playbooks", label: "Playbooks", icon: FileText },
  { href: "/targets", label: "Targets", icon: Target },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/teams", label: "Teams", icon: Users },
];

export default function AppNav({
  currentPage,
  pendingRequests = 0,
  hasSubscription = false,
  isMaxTier = false,
  onManageBilling,
  tierBadge,
  hasPriority = false,
}: AppNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#1a1a1a] bg-[#0a0a0a]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <a href="/dashboard" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-64.png" alt="Sales Blitz" className="h-7 w-7" />
            <span className="text-base font-bold tracking-tight text-white">
              Sales Blitz
            </span>
          </a>
          {tierBadge && (
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400">
              {tierBadge}
            </span>
          )}
          {hasPriority && (
            <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-1 text-xs font-semibold text-amber-400">
              Priority
            </span>
          )}
        </div>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-x-8">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === currentPage;
            return (
              <a
                key={item.href}
                href={item.href}
                className={`relative text-sm border-b-2 pb-0.5 transition-colors ${
                  isActive
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-neutral-400 hover:text-white"
                }`}
              >
                {item.label}
                {item.hasBadge && pendingRequests > 0 && (
                  <span className="absolute -top-1.5 -right-3 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-black">
                    {pendingRequests}
                  </span>
                )}
              </a>
            );
          })}
          {hasSubscription && onManageBilling && (
            <button
              onClick={onManageBilling}
              className="text-sm text-neutral-400 hover:text-white transition-colors"
            >
              Billing
            </button>
          )}
          {!isMaxTier && (
            <a
              href="/subscribe"
              className="rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-black hover:bg-emerald-400 transition-all hover:shadow-[0_0_16px_rgba(16,185,129,0.3)]"
            >
              {hasSubscription ? "Upgrade" : "Subscribe"}
            </a>
          )}
          <UserButton afterSignOutUrl="/sign-in" />
        </div>

        {/* Mobile nav */}
        <div className="flex lg:hidden items-center gap-4">
          <a href="/requests" className="relative text-sm text-neutral-400 hover:text-white">
            Requests
            {pendingRequests > 0 && (
              <span className="absolute -top-1.5 -right-3 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-black">
                {pendingRequests}
              </span>
            )}
          </a>
          <UserButton afterSignOutUrl="/sign-in" />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-[#1a1a1a] hover:text-white"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#1a1a1a] bg-[#0a0a0a] px-6 py-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === currentPage;
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "text-neutral-300 hover:bg-[#141414] hover:text-white"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-emerald-400" : "text-neutral-500"}`} />
                {item.label}
                {item.hasBadge && pendingRequests > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-black">
                    {pendingRequests}
                  </span>
                )}
              </a>
            );
          })}
          {hasSubscription && onManageBilling && (
            <button
              onClick={() => {
                onManageBilling();
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left rounded-lg px-3 py-2.5 text-sm text-neutral-300 hover:bg-[#141414]"
            >
              Billing
            </button>
          )}
          {!isMaxTier && (
            <a
              href="/subscribe"
              className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/10"
            >
              {hasSubscription ? "Upgrade" : "Subscribe"}
            </a>
          )}
        </div>
      )}
    </header>
  );
}
