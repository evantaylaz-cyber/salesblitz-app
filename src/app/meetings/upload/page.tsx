"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import AppNav from "@/components/AppNav";
import { Upload, FileText, Loader2 } from "lucide-react";

interface TargetOption {
  id: string;
  companyName: string;
  contactName: string | null;
}

export default function MeetingUploadPage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [targets, setTargets] = useState<TargetOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [transcript, setTranscript] = useState("");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingType, setMeetingType] = useState("");
  const [platform, setPlatform] = useState("");
  const [targetId, setTargetId] = useState("");
  const [meetingDate, setMeetingDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  // Fetch targets for linking
  useEffect(() => {
    async function fetchTargets() {
      try {
        const res = await fetch("/api/targets");
        if (res.ok) {
          const data = await res.json();
          setTargets(data.targets || []);
        }
      } catch {
        // Non-fatal
      }
    }
    fetchTargets();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!transcript.trim()) {
      setError("Paste or type a transcript to analyze.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/meeting/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcript.trim(),
          meetingTitle: meetingTitle.trim() || null,
          meetingType: meetingType || null,
          platform: platform || null,
          targetId: targetId || null,
          meetingDate: meetingDate
            ? new Date(meetingDate).toISOString()
            : null,
          transcriptSource: "manual_upload",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json();
      router.push(`/meetings/${data.recording.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // 5MB limit for text files
    if (file.size > 5 * 1024 * 1024) {
      setError("File too large. Max 5MB.");
      return;
    }

    try {
      const text = await file.text();
      setTranscript(text);
      if (!meetingTitle) {
        setMeetingTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    } catch {
      setError("Could not read file.");
    }
  }

  if (!isLoaded || !isSignedIn) return null;

  return (
    <div className="min-h-screen bg-black text-white">
      <AppNav />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-1 text-xl font-bold">Upload Meeting Transcript</h1>
        <p className="mb-6 text-sm text-zinc-400">
          Paste a transcript or upload a text file. We will analyze it for
          actionable intelligence, objection handling, deal qualification, and
          coaching notes.
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-800 bg-red-950/30 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title + Date row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                Meeting Title
              </label>
              <input
                type="text"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="e.g. Discovery call with Acme Corp"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                Meeting Date
              </label>
              <input
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Type + Platform + Target */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                Meeting Type
              </label>
              <select
                value={meetingType}
                onChange={(e) => setMeetingType(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">Select...</option>
                <option value="discovery">Discovery</option>
                <option value="demo">Demo</option>
                <option value="negotiation">Negotiation</option>
                <option value="interview">Interview</option>
                <option value="follow_up">Follow-up</option>
                <option value="internal">Internal</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                Platform
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">Select...</option>
                <option value="google_meet">Google Meet</option>
                <option value="zoom">Zoom</option>
                <option value="teams">Microsoft Teams</option>
                <option value="phone">Phone</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                Link to Target
              </label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">None</option>
                {targets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.companyName}
                    {t.contactName ? ` - ${t.contactName}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Transcript input */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-400">
                Transcript
              </label>
              <label className="flex cursor-pointer items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300">
                <Upload className="h-3 w-3" />
                Upload .txt file
                <input
                  type="file"
                  accept=".txt,.srt,.vtt,.md"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={12}
              placeholder={`Paste your meeting transcript here...\n\nFormat:\nSpeaker Name: What they said...\n\nOr just paste raw text, we'll figure out the structure.`}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-200 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-zinc-600">
              {transcript.length > 0
                ? `${transcript.length.toLocaleString()} characters`
                : "Supports speaker labels like 'John: ...' or plain text"}
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !transcript.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Upload & Analyze
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
