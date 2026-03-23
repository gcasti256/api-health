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
  threshold_degraded: number;
  threshold_down: number;
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

interface Alert {
  id: number;
  endpoint_id: number;
  type: string;
  destination: string;
  enabled: number;
  last_triggered_at: string | null;
  created_at: string;
}

export const dynamic = "force-dynamic";

type ChartRange = "24h" | "7d" | "30d";

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
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartRange, setChartRange] = useState<ChartRange>("24h");
  const [showSettings, setShowSettings] = useState(false);
  const [showAddAlert, setShowAddAlert] = useState(false);
  const [alertType, setAlertType] = useState<"webhook" | "email">("webhook");
  const [alertDest, setAlertDest] = useState("");
  const [editInterval, setEditInterval] = useState(60);
  const [editThresholdDegraded, setEditThresholdDegraded] = useState(200);
  const [editThresholdDown, setEditThresholdDown] = useState(1000);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [endpointRes, checksRes, incidentsRes, alertsRes] = await Promise.all([
        fetch(`/api/endpoints/${endpointId}`),
        fetch(`/api/checks/${endpointId}?range=${chartRange}`),
        fetch(`/api/checks/${endpointId}?type=incidents`),
        fetch(`/api/alerts?endpointId=${endpointId}`),
      ]);

      if (!endpointRes.ok) {
        setError("Endpoint not found");
        return;
      }

      const [endpointData, checksData, incidentsData, alertsData] = await Promise.all([
        endpointRes.json(),
        checksRes.json(),
        incidentsRes.json(),
        alertsRes.json(),
      ]);

      setEndpoint(endpointData);
      setChecks(checksData);
      setIncidents(incidentsData);
      setAlerts(alertsData);
      setEditInterval(endpointData.check_interval);
      setEditThresholdDegraded(endpointData.threshold_degraded);
      setEditThresholdDown(endpointData.threshold_down);
    } catch (err) {
      console.error("Failed to fetch endpoint data:", err);
      setError("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, [endpointId, chartRange]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      await fetch(`/api/endpoints/${endpointId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          check_interval: editInterval,
          threshold_degraded: editThresholdDegraded,
          threshold_down: editThresholdDown,
        }),
      });
      setShowSettings(false);
      fetchData();
    } finally {
      setIsSaving(false);
    }
  };

  const addAlert = async () => {
    if (!alertDest.trim()) return;
    await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint_id: Number(endpointId),
        type: alertType,
        destination: alertDest,
      }),
    });
    setAlertDest("");
    setShowAddAlert(false);
    fetchData();
  };

  const deleteAlert = async (id: number) => {
    await fetch(`/api/alerts/${id}`, { method: "DELETE" });
    fetchData();
  };

  const toggleAlert = async (id: number, enabled: boolean) => {
    await fetch(`/api/alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    fetchData();
  };

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
                thresholdDegraded={endpoint.threshold_degraded}
                thresholdDown={endpoint.threshold_down}
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
            <span>Degraded: &gt;{endpoint.threshold_degraded}ms</span>
            <span>Down: &gt;{endpoint.threshold_down}ms</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white/80"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </button>
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
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-6 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.03] p-5">
          <h3 className="mb-4 text-sm font-semibold text-white/80">Endpoint Settings</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">Check Interval</label>
              <select
                value={editInterval}
                onChange={(e) => setEditInterval(Number(e.target.value))}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/90 outline-none"
              >
                <option value={15}>15 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={60}>1 minute</option>
                <option value={300}>5 minutes</option>
                <option value={600}>10 minutes</option>
                <option value={1800}>30 minutes</option>
                <option value={3600}>1 hour</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-amber-400/70">Degraded threshold (ms)</label>
              <input
                type="number"
                value={editThresholdDegraded}
                onChange={(e) => setEditThresholdDegraded(Number(e.target.value))}
                min={50}
                className="w-full rounded-lg border border-amber-500/20 bg-amber-500/[0.03] px-3 py-2 text-sm text-white/90 outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-red-400/70">Down threshold (ms)</label>
              <input
                type="number"
                value={editThresholdDown}
                onChange={(e) => setEditThresholdDown(Number(e.target.value))}
                min={100}
                className="w-full rounded-lg border border-red-500/20 bg-red-500/[0.03] px-3 py-2 text-sm text-white/90 outline-none"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setShowSettings(false)}
              className="rounded-lg px-3 py-1.5 text-sm text-white/50 hover:text-white/70"
            >
              Cancel
            </button>
            <button
              onClick={saveSettings}
              disabled={isSaving}
              className="rounded-lg bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}

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

      {/* Response Time Chart with Range Selector */}
      <div className="mb-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white/70">
            Response Time
          </h2>
          <div className="flex rounded-lg border border-white/[0.08] bg-white/[0.02]">
            {(["24h", "7d", "30d"] as ChartRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setChartRange(range)}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                  chartRange === range
                    ? "bg-indigo-500 text-white"
                    : "text-white/40 hover:text-white/60"
                } ${range === "24h" ? "rounded-l-md" : range === "30d" ? "rounded-r-md" : ""}`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
        <ResponseChart checks={checks} />
      </div>

      {/* Alerts */}
      <div className="mb-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white/70">
            Alerts
          </h2>
          <button
            onClick={() => setShowAddAlert(!showAddAlert)}
            className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
          >
            + Add Alert
          </button>
        </div>

        {showAddAlert && (
          <div className="mb-4 rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
            <div className="mb-3 flex gap-3">
              <div className="flex-shrink-0">
                <label className="mb-1.5 block text-xs font-medium text-white/50">Type</label>
                <select
                  value={alertType}
                  onChange={(e) => setAlertType(e.target.value as "webhook" | "email")}
                  className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/90 outline-none"
                >
                  <option value="webhook">Webhook</option>
                  <option value="email">Email</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="mb-1.5 block text-xs font-medium text-white/50">
                  {alertType === "webhook" ? "Webhook URL" : "Email Address"}
                </label>
                <input
                  type={alertType === "email" ? "email" : "url"}
                  value={alertDest}
                  onChange={(e) => setAlertDest(e.target.value)}
                  placeholder={alertType === "webhook" ? "https://hooks.slack.com/..." : "alerts@example.com"}
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/90 placeholder-white/30 outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowAddAlert(false); setAlertDest(""); }}
                className="rounded-lg px-3 py-1.5 text-xs text-white/50"
              >
                Cancel
              </button>
              <button
                onClick={addAlert}
                className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-400"
              >
                Add Alert
              </button>
            </div>
          </div>
        )}

        {alerts.length === 0 && !showAddAlert ? (
          <p className="text-sm text-white/30">No alerts configured. Add one to get notified when this endpoint goes down.</p>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    alert.type === "webhook"
                      ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                      : "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                  }`}>
                    {alert.type}
                  </span>
                  <span className="text-sm text-white/70 font-mono truncate max-w-[300px]">
                    {alert.destination}
                  </span>
                  {alert.last_triggered_at && (
                    <span className="text-xs text-white/30">
                      Last fired: {formatDate(alert.last_triggered_at)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleAlert(alert.id, !alert.enabled)}
                    className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                      alert.enabled
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-white/[0.04] text-white/30"
                    }`}
                  >
                    {alert.enabled ? "Active" : "Paused"}
                  </button>
                  <button
                    onClick={() => deleteAlert(alert.id)}
                    className="rounded-lg p-1 text-white/20 hover:text-red-400 transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
                          thresholdDegraded={endpoint.threshold_degraded}
                          thresholdDown={endpoint.threshold_down}
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
