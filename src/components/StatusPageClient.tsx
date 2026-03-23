"use client";

import { useState, useEffect, useCallback } from "react";

interface StatusEntry {
  name: string;
  url: string;
  is_up: number | null;
  response_time_ms: number | null;
  uptime_24h: number;
  uptime_7d: number;
  uptime_30d: number;
  last_checked: string | null;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr + "Z");
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 5) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

function uptimeColor(pct: number): string {
  if (pct >= 99.9) return "text-emerald-400";
  if (pct >= 99) return "text-emerald-400/70";
  if (pct >= 95) return "text-amber-400";
  return "text-red-400";
}

function statusDot(isUp: number | null): { color: string; label: string; pulse: boolean } {
  if (isUp === null) return { color: "bg-white/20", label: "Unknown", pulse: false };
  if (isUp === 0) return { color: "bg-red-400", label: "Down", pulse: true };
  return { color: "bg-emerald-400", label: "Operational", pulse: false };
}

export default function StatusPageClient() {
  const [entries, setEntries] = useState<StatusEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error("Failed to fetch status:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const allUp = entries.length > 0 && entries.every((e) => e.is_up === 1);
  const someDown = entries.some((e) => e.is_up === 0);

  return (
    <div className="min-h-screen bg-[#0a0a0b]">
      {/* Header Banner */}
      <div className={`border-b px-6 py-8 text-center ${
        someDown
          ? "border-red-500/20 bg-red-500/[0.03]"
          : allUp
          ? "border-emerald-500/20 bg-emerald-500/[0.03]"
          : "border-white/[0.06] bg-white/[0.02]"
      }`}>
        <div className="mx-auto max-w-3xl">
          <div className="mb-3 flex items-center justify-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white/95 tracking-tight">System Status</h1>
          </div>

          {isLoading ? (
            <div className="h-6 w-48 mx-auto animate-pulse rounded-lg bg-white/[0.04]" />
          ) : (
            <div className="flex items-center justify-center gap-2">
              <span className={`inline-block h-3 w-3 rounded-full ${
                someDown ? "bg-red-400 animate-pulse" : allUp ? "bg-emerald-400" : "bg-amber-400"
              }`} />
              <span className={`text-lg font-medium ${
                someDown ? "text-red-400" : allUp ? "text-emerald-400" : "text-amber-400"
              }`}>
                {someDown
                  ? "Some services are experiencing issues"
                  : allUp
                  ? "All systems operational"
                  : "Checking services..."}
              </span>
            </div>
          )}

          {lastUpdated && (
            <p className="mt-2 text-xs text-white/30">
              Last updated: {lastUpdated.toLocaleTimeString()} &middot; Auto-refreshes every 30s
            </p>
          )}
        </div>
      </div>

      {/* Service List */}
      <div className="mx-auto max-w-3xl px-6 py-8">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02]" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="py-12 text-center text-sm text-white/40">
            No endpoints configured yet.
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => {
              const dot = statusDot(entry.is_up);
              return (
                <div
                  key={entry.name}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:border-white/[0.10]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`inline-block h-2.5 w-2.5 rounded-full ${dot.color} ${dot.pulse ? "animate-pulse" : ""}`} />
                      <div>
                        <h3 className="text-sm font-semibold text-white/90">{entry.name}</h3>
                        <p className="text-xs text-white/30 font-mono">{entry.url}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <span className={`text-xs font-medium ${
                        entry.is_up === 0 ? "text-red-400" : entry.is_up === 1 ? "text-emerald-400" : "text-white/30"
                      }`}>
                        {dot.label}
                      </span>
                      {entry.response_time_ms !== null && (
                        <span className="text-xs font-mono text-white/40 tabular-nums w-16 text-right">
                          {entry.response_time_ms}ms
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Uptime bars */}
                  <div className="mt-4 grid grid-cols-3 gap-4">
                    {([
                      { label: "24h", value: entry.uptime_24h },
                      { label: "7d", value: entry.uptime_7d },
                      { label: "30d", value: entry.uptime_30d },
                    ]).map((stat) => (
                      <div key={stat.label}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-white/30">{stat.label}</span>
                          <span className={`font-mono tabular-nums font-medium ${uptimeColor(stat.value)}`}>
                            {stat.value}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              stat.value >= 99.9 ? "bg-emerald-400" : stat.value >= 95 ? "bg-amber-400" : "bg-red-400"
                            }`}
                            style={{ width: `${stat.value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 text-right">
                    <span className="text-xs text-white/20">
                      Checked {timeAgo(entry.last_checked)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-xs text-white/20">
            Powered by{" "}
            <a href="/" className="text-indigo-400/60 hover:text-indigo-400 transition-colors">
              API Health Monitor
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
