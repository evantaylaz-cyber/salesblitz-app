"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  ChevronRight,
  Crown,
  Shield,
  User,
  Mail,
  Loader2,
  X,
  Building2,
} from "lucide-react";
import AppNav from "@/components/AppNav";

interface Team {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  currentTier: string | null;
  subscriptionStatus: string;
  subscriptionRunsRemaining: number;
  subscriptionRunsTotal: number;
  maxSeats: number;
  memberCount: number;
  myRole: string;
  createdAt: string;
}

interface PendingInvite {
  teamId: string;
  teamName: string;
  invitedBy: string | null;
  role: string;
  createdAt: string;
}

export default function TeamsPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const [teams, setTeams] = useState<Team[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDesc, setNewTeamDesc] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isLoaded && clerkUser) fetchTeams();
  }, [isLoaded, clerkUser]);

  async function fetchTeams() {
    try {
      const res = await fetch("/api/teams");
      const data = await res.json();
      setTeams(data.teams || []);
      setPendingInvites(data.pendingInvites || []);
    } catch {
      console.error("Failed to fetch teams");
    } finally {
      setLoading(false);
    }
  }

  async function createTeam() {
    if (!newTeamName.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTeamName.trim(),
          description: newTeamDesc.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create team");
        return;
      }
      setShowCreate(false);
      setNewTeamName("");
      setNewTeamDesc("");
      fetchTeams();
    } catch {
      setError("Network error");
    } finally {
      setCreating(false);
    }
  }

  async function respondToInvite(teamId: string, action: "accept_invite" | "decline_invite") {
    try {
      await fetch(`/api/teams/${teamId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      fetchTeams();
    } catch {
      console.error("Failed to respond to invite");
    }
  }

  const roleIcon = (role: string) => {
    if (role === "owner") return <Crown className="h-4 w-4 text-amber-500" />;
    if (role === "admin") return <Shield className="h-4 w-4 text-emerald-400" />;
    return <User className="h-4 w-4 text-neutral-500" />;
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppNav currentPage="/teams" />

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-400">
              Pending Invites
            </h2>
            <div className="space-y-3">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.teamId}
                  className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4"
                >
                  <div>
                    <p className="font-medium text-white">{invite.teamName}</p>
                    <p className="text-sm text-neutral-300">
                      Invited as {invite.role}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => respondToInvite(invite.teamId, "accept_invite")}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => respondToInvite(invite.teamId, "decline_invite")}
                      className="rounded-lg border border-[#333333] bg-[#141414] px-4 py-2 text-sm font-medium text-neutral-200 hover:bg-[#0a0a0a]"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Teams Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Your Teams</h1>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
          >
            <Plus className="h-4 w-4" />
            Create Team
          </button>
        </div>

        {/* Create Team Modal */}
        {showCreate && (
          <div className="mb-6 rounded-xl border bg-[#141414] p-6 shadow-sm shadow-black/20">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">New Team</h3>
              <button onClick={() => setShowCreate(false)}>
                <X className="h-5 w-5 text-neutral-500 hover:text-neutral-300" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-200">
                  Team Name *
                </label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. Sales Team West"
                  className="w-full rounded-lg border border-[#333333] bg-[#0a0a0a] px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-200">
                  Description
                </label>
                <input
                  type="text"
                  value={newTeamDesc}
                  onChange={(e) => setNewTeamDesc(e.target.value)}
                  placeholder="Optional team description"
                  className="w-full rounded-lg border border-[#333333] bg-[#0a0a0a] px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button
                onClick={createTeam}
                disabled={creating || !newTeamName.trim()}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Create Team
              </button>
            </div>
          </div>
        )}

        {/* Team List */}
        {teams.length === 0 && !showCreate ? (
          <div className="rounded-xl border bg-[#141414] p-12 text-center">
            <Building2 className="mx-auto mb-3 h-12 w-12 text-neutral-500" />
            <h3 className="mb-1 text-lg font-medium text-white">No teams yet</h3>
            <p className="mb-4 text-sm text-neutral-400">
              Create a team to share runs, knowledge base docs, and billing with your colleagues.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
            >
              <Plus className="h-4 w-4" />
              Create Your First Team
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {teams.map((team) => (
              <Link
                key={team.id}
                href={`/teams/${team.id}`}
                className="flex items-center justify-between rounded-xl border bg-[#141414] p-5 shadow-sm shadow-black/20 transition hover:border-emerald-500/20 hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15">
                    <Users className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{team.name}</h3>
                    <div className="flex items-center gap-3 text-sm text-neutral-400">
                      <span className="flex items-center gap-1">
                        {roleIcon(team.myRole)}
                        {team.myRole}
                      </span>
                      <span>{team.memberCount} member{team.memberCount !== 1 ? "s" : ""}</span>
                      {team.currentTier && (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
                          {team.currentTier}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {team.subscriptionRunsTotal > 0 && (
                    <span className="text-sm text-neutral-400">
                      {team.subscriptionRunsRemaining}/{team.subscriptionRunsTotal} runs
                    </span>
                  )}
                  <ChevronRight className="h-5 w-5 text-neutral-500" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
