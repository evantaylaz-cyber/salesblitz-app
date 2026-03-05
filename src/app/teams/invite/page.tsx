"use client";

import { useUser } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2, XCircle, Users } from "lucide-react";

export default function InviteAcceptPage() {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();

  const teamId = searchParams.get("teamId");
  const email = searchParams.get("email");

  const [status, setStatus] = useState<"loading" | "accepting" | "accepted" | "error" | "no-invite">("loading");
  const [teamName, setTeamName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!isLoaded) return;

    if (!teamId) {
      setStatus("error");
      setErrorMsg("Invalid invite link. No team specified.");
      return;
    }

    // If not signed in, redirect to sign-up with redirect back here
    if (!isSignedIn) {
      const currentUrl = window.location.href;
      router.push(`/sign-up?redirect_url=${encodeURIComponent(currentUrl)}`);
      return;
    }

    // Signed in; try to accept the invite
    acceptInvite();
  }, [isLoaded, isSignedIn, teamId]);

  async function acceptInvite() {
    setStatus("accepting");
    try {
      // First fetch team info to show the name
      const teamsRes = await fetch("/api/teams");
      const teamsData = await teamsRes.json();

      // Check pending invites
      const pendingInvite = teamsData.pendingInvites?.find(
        (inv: { teamId: string }) => inv.teamId === teamId
      );

      if (pendingInvite) {
        setTeamName(pendingInvite.teamName);
      }

      // Check if already a member
      const alreadyMember = teamsData.teams?.find(
        (t: { id: string }) => t.id === teamId
      );
      if (alreadyMember) {
        setTeamName(alreadyMember.name);
        setStatus("accepted");
        return;
      }

      if (!pendingInvite) {
        setStatus("no-invite");
        setErrorMsg("No pending invite found for your account. The invite may have expired or been revoked.");
        return;
      }

      // Accept the invite
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept_invite" }),
      });

      if (res.ok) {
        setStatus("accepted");
      } else {
        const data = await res.json();
        setStatus("error");
        setErrorMsg(data.error || "Failed to accept invite");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again.");
    }
  }

  if (!isLoaded || status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600" />
          <p className="mt-3 text-sm text-gray-500">Loading invite...</p>
        </div>
      </div>
    );
  }

  if (status === "accepting") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600" />
          <p className="mt-3 text-sm text-gray-500">Accepting invite...</p>
        </div>
      </div>
    );
  }

  if (status === "accepted") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="mx-auto max-w-md rounded-xl border bg-white p-8 text-center shadow-sm">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <h1 className="mt-4 text-xl font-bold text-gray-900">You're in!</h1>
          <p className="mt-2 text-sm text-gray-600">
            You've joined <strong>{teamName}</strong>. Your team's shared runs, knowledge base, and playbooks are now available.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href={`/teams/${teamId}`}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              View Team
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Error or no-invite
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="mx-auto max-w-md rounded-xl border bg-white p-8 text-center shadow-sm">
        <XCircle className="mx-auto h-12 w-12 text-red-400" />
        <h1 className="mt-4 text-xl font-bold text-gray-900">
          {status === "no-invite" ? "Invite Not Found" : "Something Went Wrong"}
        </h1>
        <p className="mt-2 text-sm text-gray-600">{errorMsg}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/teams"
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            View Your Teams
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
