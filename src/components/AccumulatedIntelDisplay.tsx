"use client";

import { Brain } from "lucide-react";

interface IntelEntry {
  date: string;
  type: "debrief" | "practice" | "unknown";
  outcome?: string;
  score?: number;
  summary?: string;
  keyTakeaways?: string;
  nextSteps?: string;
  keyMiss?: string;
  strength?: string;
  rawText: string;
}

function parseIntelEntries(intelText: string): IntelEntry[] {
  const lines = intelText.split("\n").filter((line) => line.trim());
  const entries: IntelEntry[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let entry: IntelEntry | null = null;

    // Try to parse as debrief: [Debrief YYYY-MM-DD] | Outcome: X | Key takeaways: ... | Next steps: ...
    const debriefMatch = trimmed.match(
      /\[Debrief (\d{4}-\d{2}-\d{2})\]\s*\|\s*(.*)/
    );
    if (debriefMatch) {
      const date = debriefMatch[1];
      const rest = debriefMatch[2];
      const parts = rest.split(" | ").map((p) => p.trim());

      const entry: IntelEntry = {
        date,
        type: "debrief",
        rawText: trimmed,
      };

      for (const part of parts) {
        if (part.startsWith("Outcome:")) {
          entry.outcome = part.replace(/^Outcome:\s*/, "");
        } else if (part.startsWith("Key takeaways:")) {
          entry.keyTakeaways = part.replace(/^Key takeaways:\s*/, "");
        } else if (part.startsWith("Next steps:")) {
          entry.nextSteps = part.replace(/^Next steps:\s*/, "");
        }
      }

      entries.push(entry);
      continue;
    }

    // Try to parse as practice session: [Session X - YYYY-MM-DD] Score: X/5 (outcome). Key miss: ... Strength: ...
    const sessionMatch = trimmed.match(
      /\[Session\s+\d+\s+-\s+(\d{4}-\d{2}-\d{2})\]\s+Score:\s+(\d+(?:\.\d+)?)\s*\/\s*5\s*\(\s*(\w+)\s*\)\s*(.*)/
    );
    if (sessionMatch) {
      const date = sessionMatch[1];
      const score = parseFloat(sessionMatch[2]);
      const outcome = sessionMatch[3];
      const rest = sessionMatch[4];

      const entry: IntelEntry = {
        date,
        type: "practice",
        score,
        outcome,
        rawText: trimmed,
      };

      // Extract key miss and strength
      const keyMissMatch = rest.match(/Key miss:\s*([^.]*?)(?:Strength:|$)/);
      const strengthMatch = rest.match(/Strength:\s*(.*)$/);

      if (keyMissMatch) {
        entry.keyMiss = keyMissMatch[1].trim();
      }
      if (strengthMatch) {
        entry.strength = strengthMatch[1].trim();
      }

      entries.push(entry);
      continue;
    }

    // Fallback: treat as unknown entry
    entries.push({
      date: new Date().toISOString().split("T")[0],
      type: "unknown",
      rawText: trimmed,
    });
  }

  return entries;
}

interface AccumulatedIntelDisplayProps {
  intel: string;
}

export default function AccumulatedIntelDisplay({
  intel,
}: AccumulatedIntelDisplayProps) {
  const entries = parseIntelEntries(intel);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
        <Brain className="h-4 w-4 text-emerald-500" />
        Accumulated Intelligence
      </h2>
      <div className="space-y-3">
        {entries.map((entry, idx) => (
          <div
            key={`${entry.date}-${idx}`}
            className="rounded-xl border bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Header with date & type */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <time className="text-sm font-semibold text-gray-900">
                  {entry.date}
                </time>
                <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 font-medium">
                  {entry.type === "debrief"
                    ? "Debrief"
                    : entry.type === "practice"
                    ? "Practice"
                    : "Note"}
                </span>
              </div>
              {entry.score && (
                <div className="flex items-center gap-1.5">
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">
                      {entry.score}/5
                    </div>
                    <div
                      className={`text-xs font-medium ${
                        entry.outcome === "passed"
                          ? "text-emerald-600"
                          : entry.outcome === "needs_work"
                          ? "text-amber-600"
                          : "text-gray-500"
                      }`}
                    >
                      {entry.outcome}
                    </div>
                  </div>
                </div>
              )}
              {entry.outcome && entry.type === "debrief" && (
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                    entry.outcome.toLowerCase().includes("strong")
                      ? "bg-emerald-50 text-emerald-600"
                      : entry.outcome.toLowerCase().includes("developing")
                      ? "bg-blue-50 text-blue-600"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {entry.outcome}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="space-y-3">
              {entry.keyTakeaways && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-600 mb-1">
                    Summary
                  </h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {entry.keyTakeaways}
                  </p>
                </div>
              )}

              {entry.summary && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-600 mb-1">
                    Summary
                  </h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {entry.summary}
                  </p>
                </div>
              )}

              {(entry.strength || entry.keyMiss) && (
                <div className="grid grid-cols-2 gap-3">
                  {entry.strength && (
                    <div className="bg-emerald-50 rounded-lg p-3">
                      <h4 className="text-xs font-semibold text-emerald-700 mb-1">
                        Strength
                      </h4>
                      <p className="text-xs text-emerald-600 leading-snug">
                        {entry.strength}
                      </p>
                    </div>
                  )}
                  {entry.keyMiss && (
                    <div className="bg-amber-50 rounded-lg p-3">
                      <h4 className="text-xs font-semibold text-amber-700 mb-1">
                        Area to Improve
                      </h4>
                      <p className="text-xs text-amber-600 leading-snug">
                        {entry.keyMiss}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {entry.nextSteps && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-600 mb-1.5">
                    Next Steps
                  </h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {entry.nextSteps}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
