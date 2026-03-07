"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-8 w-8 text-red-600" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-gray-900">Something went wrong</h1>
        <p className="mt-2 text-gray-500">
          An unexpected error occurred. Please try again or contact support if the problem
          persists.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-gray-400">Error ID: {error.digest}</p>
        )}
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
