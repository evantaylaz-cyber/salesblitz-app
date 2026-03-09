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
  { href: "/profile", label: "Profile", icon: UserCircle },
  { href: "/knowledge-base", label: "Knowledge Base", icon: BookOpen },
  { href: "/playbooks", label: "Playbooks", icon: FileText },
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
    <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <a href="/dashboard" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-64.png" alt="Sales Blitz" className="h-7 w-7" />
            <span className="text-base font-bold tracking-tight text-gray-900">
              Sales Blitz
            </span>
          </a>
          {tierBadge && (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              {tierBadge}
            </span>
          )}
          {hasPriority && (
            <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
              Priority
            </span>
          )}
        </div>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-x-8">
          {NAV_ITEMS.filter((item) => item.href !== currentPage).map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="relative text-sm text-gray-600 hover:text-gray-900"
            >
              {item.label}
              {item.hasBadge && pendingRequests > 0 && (
                <span className="absolute -top-1.5 -right-3 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                  {pendingRequests}
                </span>
              )}
            </a>
          ))}
          {hasSubscription && onManageBilling && (
            <button
              onClick={onManageBilling}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Billing
            </button>
          )}
          {!isMaxTier && (
            <a
              href="/subscribe"
              className="text-sm font-medium text-emerald-700 hover:text-emerald-900"
            >
              {hasSubscription ? "Upgrade" : "Subscribe"}
            </a>
          )}
          <UserButton afterSignOutUrl="/sign-in" />
        </div>

        {/* Mobile nav */}
        <div className="flex lg:hidden items-center gap-4">
          <a href="/requests" className="relative text-sm text-gray-600 hover:text-gray-900">
            Requests
            {pendingRequests > 0 && (
              <span className="absolute -top-1.5 -right-3 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                {pendingRequests}
              </span>
            )}
          </a>
          <UserButton afterSignOutUrl="/sign-in" />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t bg-white px-6 py-3 space-y-1">
          {NAV_ITEMS.filter((item) => item.href !== currentPage).map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Icon className="h-4 w-4 text-gray-400" />
                {item.label}
                {item.hasBadge && pendingRequests > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
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
              className="block w-full text-left rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Billing
            </button>
          )}
          {!isMaxTier && (
            <a
              href="/subscribe"
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
            >
              {hasSubscription ? "Upgrade" : "Subscribe"}
            </a>
          )}
        </div>
      )}
    </header>
  );
}
