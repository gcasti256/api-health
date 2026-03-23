"use client";

import Link from "next/link";
import StatusBadge from "./StatusBadge";

interface EndpointCardProps {
  id: number;
  name: string;
  url: string;
  latestStatusCode: number | null;
  latestResponseTimeMs: number | null;
  latestIsUp: number | null;
  latestCheckedAt: string | null;
  onDelete: (id: number) => void;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never checked";
  const date = new Date(dateStr + "Z");
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 5) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function EndpointCard({
  id,
  name,
  url,
  latestStatusCode,
  latestResponseTimeMs,
  latestIsUp,
  latestCheckedAt,
  onDelete,
}: EndpointCardProps) {
  return (
    <div className="group relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:border-white/[0.12] hover:bg-white/[0.04]">
      <div className="mb-3 flex items-start justify-between">
        <Link
          href={`/endpoints/${id}`}
          className="flex-1"
        >
          <h3 className="text-base font-semibold text-white/90 group-hover:text-white transition-colors">
            {name}
          </h3>
          <p className="mt-0.5 truncate text-sm text-white/40 font-mono">
            {url}
          </p>
        </Link>
        <button
          onClick={(e) => {
            e.preventDefault();
            if (confirm(`Delete "${name}"?`)) onDelete(id);
          }}
          className="ml-2 rounded-lg p-1.5 text-white/20 opacity-0 transition-all hover:bg-white/[0.06] hover:text-red-400 group-hover:opacity-100"
          title="Delete endpoint"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <div className="flex items-center justify-between">
        <StatusBadge
          responseTimeMs={latestResponseTimeMs}
          isUp={latestIsUp}
        />
        <div className="flex items-center gap-4 text-sm text-white/40">
          {latestResponseTimeMs !== null && (
            <span className="font-mono tabular-nums">
              {latestResponseTimeMs}ms
            </span>
          )}
          {latestStatusCode !== null && (
            <span className="font-mono tabular-nums">
              {latestStatusCode}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-white/[0.04] pt-3">
        <span className="text-xs text-white/30">
          {timeAgo(latestCheckedAt)}
        </span>
        <Link
          href={`/endpoints/${id}`}
          className="text-xs font-medium text-indigo-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-indigo-300"
        >
          View details &rarr;
        </Link>
      </div>
    </div>
  );
}
