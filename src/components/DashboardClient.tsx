"use client";

import { useState, useEffect, useCallback } from "react";
import EndpointCard from "./EndpointCard";
import AddEndpointModal from "./AddEndpointModal";

interface EndpointWithLatestCheck {
  id: number;
  name: string;
  url: string;
  check_interval: number;
  expected_status: number;
  created_at: string;
  updated_at: string;
  latest_status_code: number | null;
  latest_response_time_ms: number | null;
  latest_is_up: number | null;
  latest_checked_at: string | null;
}

export default function DashboardClient() {
  const [endpoints, setEndpoints] = useState<EndpointWithLatestCheck[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchEndpoints = useCallback(async () => {
    try {
      const res = await fetch("/api/endpoints");
      if (res.ok) {
        const data = await res.json();
        setEndpoints(data);
      }
    } catch (err) {
      console.error("Failed to fetch endpoints:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const triggerChecks = useCallback(async () => {
    setIsChecking(true);
    try {
      await fetch("/api/checks", { method: "POST" });
      setLastRefresh(new Date());
      await fetchEndpoints();
    } catch (err) {
      console.error("Failed to trigger checks:", err);
    } finally {
      setIsChecking(false);
    }
  }, [fetchEndpoints]);

  useEffect(() => {
    fetchEndpoints();
  }, [fetchEndpoints]);

  // Auto-trigger checks on mount and every 30 seconds
  useEffect(() => {
    triggerChecks();
    const interval = setInterval(triggerChecks, 30000);
    return () => clearInterval(interval);
  }, [triggerChecks]);

  const handleAdd = async (endpoint: {
    name: string;
    url: string;
    check_interval: number;
    expected_status: number;
  }) => {
    const res = await fetch("/api/endpoints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(endpoint),
    });
    if (res.ok) {
      await triggerChecks();
    }
  };

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/endpoints/${id}`, { method: "DELETE" });
    if (res.ok) {
      setEndpoints((prev) => prev.filter((e) => e.id !== id));
    }
  };

  const upCount = endpoints.filter((e) => e.latest_is_up === 1).length;
  const degradedCount = endpoints.filter(
    (e) =>
      e.latest_is_up === 1 &&
      e.latest_response_time_ms !== null &&
      e.latest_response_time_ms > 200
  ).length;
  const downCount = endpoints.filter(
    (e) => e.latest_is_up !== null && e.latest_is_up === 0
  ).length;

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white/95 tracking-tight">
            API Health Dashboard
          </h1>
          <p className="mt-1 text-sm text-white/40">
            Monitoring {endpoints.length} endpoint{endpoints.length !== 1 ? "s" : ""}
            {lastRefresh && (
              <span className="ml-2">
                &middot; Last checked {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={triggerChecks}
            disabled={isChecking}
            className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white/90 disabled:opacity-50"
          >
            <svg
              className={`h-4 w-4 ${isChecking ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {isChecking ? "Checking..." : "Check Now"}
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-400"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Endpoint
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="text-2xl font-bold tabular-nums text-emerald-400">
            {upCount}
          </div>
          <div className="mt-0.5 text-xs font-medium text-white/40">
            Healthy
          </div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="text-2xl font-bold tabular-nums text-amber-400">
            {degradedCount}
          </div>
          <div className="mt-0.5 text-xs font-medium text-white/40">
            Degraded
          </div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="text-2xl font-bold tabular-nums text-red-400">
            {downCount}
          </div>
          <div className="mt-0.5 text-xs font-medium text-white/40">Down</div>
        </div>
      </div>

      {/* Endpoint Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02]"
            />
          ))}
        </div>
      ) : endpoints.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] py-16">
          <svg
            className="mb-4 h-12 w-12 text-white/20"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-sm text-white/40">No endpoints yet</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-3 text-sm font-medium text-indigo-400 hover:text-indigo-300"
          >
            Add your first endpoint
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {endpoints.map((endpoint) => (
            <EndpointCard
              key={endpoint.id}
              id={endpoint.id}
              name={endpoint.name}
              url={endpoint.url}
              latestStatusCode={endpoint.latest_status_code}
              latestResponseTimeMs={endpoint.latest_response_time_ms}
              latestIsUp={endpoint.latest_is_up}
              latestCheckedAt={endpoint.latest_checked_at}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <AddEndpointModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAdd}
      />
    </div>
  );
}
