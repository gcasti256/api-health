"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import ResponseChart from "@/components/ResponseChart";

interface Endpoint {
  id: number;
  name: string;
  url: string;
  check_interval: number;
  expected_status: number;
  created_at: string;
  updated_at: string;
  uptime_24h: number;
  uptime_7d: number;
  uptime_30d: number;
}

interface Check {
  id: number;
  endpoint_id: number;
  status_code: number | null;
  response_time_ms: number | null;
  is_up: number;
  error: string | null;
  checked_at: string;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "Z");
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function intervalLabel(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${seconds / 60}m`;
  return `${seconds / 3600}h`;
}

export default function EndpointDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const endpointId = resolvedParams.id;

  const [endpoint, setEndpoint] = useState<Endpoint | null>(null);
  const [checks, setChecks] = useState<Check[]>([]);
  const [incidents, setIncidents] = useState<Check[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [endpointRes, checksRes, incidentsRes] = await Promise.all([
        fetch(`/api/endpoints/${endpointId}`),
        fetch(`/api/checks/${endpointId}?range=24h`),
        fetch(`/api/checks/${endpointId}?type=incidents`),
      ]);

      if (!endpointRes.ok) {
        setError("Endpoint not found");
        return;
      }

      const [endpointData, checksData, incidentsData] = await Promise.all([
        endpointRes.json(),
        checksRes.json(),
        incidentsRes.json(),
      ]);

      setEndpoint(endpointData);
      setChecks(checksData);
      setIncidents(incidentsData);
    } catch (err) {
      console.error("Failed to fetch endpoint data:", err);
      setError("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, [endpointId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-white/[0.04]" />
        <div className="h-64 animate-pulse rounded-xl bg-white/[0.04]" />
        <div className="h-40 animate-pulse rounded-xl bg-white/[0.04]" />
      </div>
    );
  }

  if (error || !endpoint) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg text-white/50">{error || "Not found"}</p>
        <Link
          href="/"
          className="mt-4 text-sm font-medium text-indigo-400 hover:text-indigo-300"
        >
          &larr; Back to dashboard
        </Link>
      </div>
    );
  }

  const latestCheck = checks.length > 0 ? checks[checks.length - 1] : null;

  const avgResponseTime =
    checks.length > 0
      ? Math.round(
          checks
            .filter((c) => c.response_time_ms !== null)
            .reduce((sum, c) => sum + (c.response_time_ms || 0), 0) /
            checks.filter((c) => c.response_time_ms !== null).length
        )
      : null;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-white/40">
        <Link href="/" className="hover:text-white/60 transition-colors">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-white/70">{endpoint.name}</span>
      </div>

      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white/95 tracking-tight">
              {endpoint.name}
            </h1>
            {latestCheck && (
              <StatusBadge
                responseTimeMs={latestCheck.response_time_ms}
                isUp={latestCheck.is_up}
              />
            )}
          </div>
          <p className="mt-1 font-mono text-sm text-white/40">
            {endpoint.url}
          </p>
          <div className="mt-2 flex items-center gap-4 text-xs text-white/30">
            <span>
              Interval: {intervalLabel(endpoint.check_interval)}
            </span>
            <span>Expected: {endpoint.expected_status}</span>
            <span>
              Added: {formatDate(endpoint.created_at)}
            </span>
          </div>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white/80"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </Link>
      </div>

      {/* Uptime Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="text-2xl font-bold tabular-nums text-white/90">
            {endpoint.uptime_24h}%
          </div>
          <div className="mt-0.5 text-xs font-medium text-white/40">
            Uptime 24h
          </div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="text-2xl font-bold tabular-nums text-white/90">
            {endpoint.uptime_7d}%
          </div>
          <div className="mt-0.5 text-xs font-medium text-white/40">
            Uptime 7d
          </div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="text-2xl font-bold tabular-nums text-white/90">
            {endpoint.uptime_30d}%
          </div>
          <div className="mt-0.5 text-xs font-medium text-white/40">
            Uptime 30d
          </div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="text-2xl font-bold tabular-nums text-white/90">
            {avgResponseTime !== null ? `${avgResponseTime}ms` : "—"}
          </div>
          <div className="mt-0.5 text-xs font-medium text-white/40">
            Avg Response
          </div>
        </div>
      </div>

      {/* Response Time Chart */}
      <div className="mb-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <h2 className="mb-4 text-sm font-semibold text-white/70">
          Response Time — Last 24 Hours
        </h2>
        <ResponseChart checks={checks} />
      </div>

      {/* Recent Checks */}
      <div className="mb-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <h2 className="mb-4 text-sm font-semibold text-white/70">
          Recent Checks
        </h2>
        {checks.length === 0 ? (
          <p className="text-sm text-white/30">No checks recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-xs text-white/40">
                  <th className="pb-2 pr-4 font-medium">Time</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 pr-4 font-medium">Response</th>
                  <th className="pb-2 font-medium">Code</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {[...checks]
                  .reverse()
                  .slice(0, 20)
                  .map((check) => (
                    <tr key={check.id}>
                      <td className="py-2 pr-4 text-white/50">
                        {formatDate(check.checked_at)}
                      </td>
                      <td className="py-2 pr-4">
                        <StatusBadge
                          responseTimeMs={check.response_time_ms}
                          isUp={check.is_up}
                          size="sm"
                        />
                      </td>
                      <td className="py-2 pr-4 font-mono tabular-nums text-white/60">
                        {check.response_time_ms !== null
                          ? `${check.response_time_ms}ms`
                          : "—"}
                      </td>
                      <td className="py-2 font-mono tabular-nums text-white/60">
                        {check.status_code ?? "—"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Incident History */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <h2 className="mb-4 text-sm font-semibold text-white/70">
          Incident History
        </h2>
        {incidents.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-emerald-400/70">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            No incidents recorded
          </div>
        ) : (
          <div className="space-y-2">
            {incidents.map((incident) => (
              <div
                key={incident.id}
                className="flex items-center justify-between rounded-lg border border-red-500/10 bg-red-500/[0.03] px-4 py-2.5"
              >
                <div>
                  <div className="text-sm text-red-400">
                    {incident.error || `HTTP ${incident.status_code}`}
                  </div>
                  <div className="mt-0.5 text-xs text-white/30">
                    {formatDate(incident.checked_at)}
                  </div>
                </div>
                {incident.response_time_ms !== null && (
                  <span className="font-mono text-xs text-white/40">
                    {incident.response_time_ms}ms
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
