"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Plus,
  Crown,
  Shield,
  User,
  Mail,
  Loader2,
  Trash2,
  Settings,
  CreditCard,
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
} from "lucide-react";

interface Member {
  id: string;
  userId: string | null;
  name: string | null;
  email: string;
  role: string;
  inviteStatus: string;
  joinedAt: string | null;
  createdAt: string;
}

interface TeamDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  currentTier: string | null;
  billingCycle: string | null;
  subscriptionStatus: string;
  subscriptionRunsRemaining: number;
  subscriptionRunsTotal: number;
  maxSeats: number;
  memberCount: number;
  myRole: string;
}

export default function TeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const router = useRouter();
  const { user: clerkUser, isLoaded } = useUser();

  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  const isAdmin = team?.myRole === "owner" || team?.myRole === "admin";

  useEffect(() => {
    if (isLoaded && clerkUser && teamId) {
      fetchTeam();
      fetchMembers();
    }
  }, [isLoaded, clerkUser, teamId]);

  async function fetchTeam() {
    try {
      const res = await fetch("/api/teams");
      const data = await res.json();
      const found = data.teams?.find((t: TeamDetail) => t.id === teamId);
      if (found) {
        setTeam(found);
      } else {
        router.push("/teams");
      }
    } catch {
      console.error("Failed to fetch team");
    } finally {
      setLoading(false);
    }
  }

  async function fetchMembers() {
    try {
      const res = await fetch(`/api/teams/${teamId}/members`);
      const data = await res.json();
      setMembers(data.members || []);
    } catch {
      console.error("Failed to fetch members");
    }
  }

  async function inviteMember() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError("");
    setInviteSuccess("");
    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error || "Failed to invite");
        return;
      }
      setInviteSuccess(`Invite sent to ${inviteEmail}`);
      setInviteEmail("");
      fetchMembers();
    } catch {
      setInviteError("Network error");
    } finally {
      setInviting(false);
    }
  }

  async function removeMember(memberId: string) {
    if (!confirm("Remove this member from the team?")) return;
    try {
      await fetch(`/api/teams/${teamId}/members?memberId=${memberId}`, {
        method: "DELETE",
      });
      fetchMembers();
    } catch {
      console.error("Failed to remove member");
    }
  }

  async function changeRole(memberId: string, newRole: string) {
    try {
      await fetch(`/api/teams/${teamId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "change_role", memberId, role: newRole }),
      });
      fetchMembers();
    } catch {
      console.error("Failed to change role");
    }
  }

  async function openBillingPortal() {
    try {
      const res = await fetch("/api/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      console.error("Failed to open billing portal");
    }
  }

  const roleIcon = (role: string) => {
    if (role === "owner") return <Crown className="h-4 w-4 text-amber-500" />;
    if (role === "admin") return <Shield className="h-4 w-4 text-emerald-600" />;
    return <User className="h-4 w-4 text-gray-400" />;
  };

  const statusBadge = (status: string) => {
    if (status === "accepted")
      return (
        <span className="flex items-center gap-1 text-xs text-emerald-600">
          <CheckCircle2 className="h-3 w-3" /> Active
        </span>
      );
    if (status === "pending")
      return (
        <span className="flex items-center gap-1 text-xs text-amber-600">
          <Clock className="h-3 w-3" /> Pending
        </span>
      );
    return (
      <span className="flex items-center gap-1 text-xs text-gray-400">
        <XCircle className="h-3 w-3" /> {status}
      </span>
    );
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
      </div>
    );
  }

  if (!team) return null;

  const activeMembers = members.filter((m) => m.inviteStatus === "accepted").length;
  const pendingMembers = members.filter((m) => m.inviteStatus === "pending").length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-xl font-bold text-gray-900">
              Sales Blitz
            </Link>
            <span className="text-gray-300">/</span>
            <Link href="/teams" className="text-lg text-gray-500 hover:text-gray-700">
              Teams
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-lg font-semibold text-gray-700">{team.name}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
              Dashboard
            </Link>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Back Link */}
        <Link
          href="/teams"
          className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          All Teams
        </Link>

        {/* Team Overview */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Plan</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {team.currentTier ? `${team.currentTier} (${team.billingCycle})` : "No plan"}
            </p>
            {isAdmin && (
              <Link
                href={`/subscribe?teamId=${team.id}`}
                className="mt-2 inline-block text-sm text-emerald-700 hover:text-emerald-800"
              >
                {team.currentTier ? "Change plan" : "Subscribe"}
              </Link>
            )}
          </div>
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Runs</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {team.subscriptionRunsRemaining} / {team.subscriptionRunsTotal}
            </p>
            <p className="mt-1 text-xs text-gray-400">remaining this cycle</p>
          </div>
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Seats</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {activeMembers} / {team.maxSeats}
            </p>
            {pendingMembers > 0 && (
              <p className="mt-1 text-xs text-amber-600">
                +{pendingMembers} pending
              </p>
            )}
          </div>
        </div>

        {/* Admin Actions */}
        {isAdmin && (
          <div className="mb-8 flex gap-3">
            {team.currentTier && (
              <button
                onClick={openBillingPortal}
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                <CreditCard className="h-4 w-4" />
                Manage Billing
              </button>
            )}
            <Link
              href={`/analytics?teamId=${team.id}`}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <Settings className="h-4 w-4" />
              Team Analytics
            </Link>
          </div>
        )}

        {/* Invite Section (admin only) */}
        {isAdmin && (
          <div className="mb-8 rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Invite Member</h3>
            <div className="flex gap-3">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button
                onClick={inviteMember}
                disabled={inviting || !inviteEmail.trim()}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {inviting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                Invite
              </button>
            </div>
            {inviteError && (
              <p className="mt-2 text-sm text-red-600">{inviteError}</p>
            )}
            {inviteSuccess && (
              <p className="mt-2 text-sm text-emerald-600">{inviteSuccess}</p>
            )}
            <p className="mt-2 text-xs text-gray-400">
              {activeMembers + pendingMembers} of {team.maxSeats} seats used
            </p>
          </div>
        )}

        {/* Members List */}
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="border-b px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Members ({members.length})
            </h3>
          </div>
          <div className="divide-y">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between px-6 py-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
                    {roleIcon(member.role)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {member.name || member.email}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{member.email}</span>
                      {statusBadge(member.inviteStatus)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Role badge */}
                  <span className="rounded-full border px-2 py-0.5 text-xs font-medium text-gray-600">
                    {member.role}
                  </span>

                  {/* Role change dropdown (admin only, can't change owner) */}
                  {isAdmin && member.role !== "owner" && member.inviteStatus === "accepted" && (
                    <select
                      value={member.role}
                      onChange={(e) => changeRole(member.id, e.target.value)}
                      className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  )}

                  {/* Remove button (admin only, can't remove owner) */}
                  {isAdmin && member.role !== "owner" && (
                    <button
                      onClick={() => removeMember(member.id)}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                      title="Remove member"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
