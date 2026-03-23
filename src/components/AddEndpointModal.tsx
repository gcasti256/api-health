"use client";

import { useState } from "react";

interface AddEndpointModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (endpoint: {
    name: string;
    url: string;
    check_interval: number;
    expected_status: number;
    threshold_degraded: number;
    threshold_down: number;
  }) => void;
}

export default function AddEndpointModal({
  isOpen,
  onClose,
  onAdd,
}: AddEndpointModalProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [checkInterval, setCheckInterval] = useState(60);
  const [expectedStatus, setExpectedStatus] = useState(200);
  const [thresholdDegraded, setThresholdDegraded] = useState(200);
  const [thresholdDown, setThresholdDown] = useState(1000);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onAdd({
        name,
        url,
        check_interval: checkInterval,
        expected_status: expectedStatus,
        threshold_degraded: thresholdDegraded,
        threshold_down: thresholdDown,
      });
      setName("");
      setUrl("");
      setCheckInterval(60);
      setExpectedStatus(200);
      setThresholdDegraded(200);
      setThresholdDown(1000);
      setShowAdvanced(false);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#111113] p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white/90">
            Add Endpoint
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/60"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/60">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My API"
              required
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/90 placeholder-white/30 outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/60">
              URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.example.com/health"
              required
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm font-mono text-white/90 placeholder-white/30 outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/60">
                Check Interval
              </label>
              <select
                value={checkInterval}
                onChange={(e) => setCheckInterval(Number(e.target.value))}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/90 outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
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
              <label className="mb-1.5 block text-sm font-medium text-white/60">
                Expected Status
              </label>
              <input
                type="number"
                value={expectedStatus}
                onChange={(e) => setExpectedStatus(Number(e.target.value))}
                min={100}
                max={599}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/90 outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
              />
            </div>
          </div>

          {/* Advanced: Thresholds */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-xs font-medium text-white/40 hover:text-white/60 transition-colors"
            >
              <svg
                className={`h-3 w-3 transition-transform ${showAdvanced ? "rotate-90" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              Response time thresholds
            </button>

            {showAdvanced && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-amber-400/70">
                    Degraded above (ms)
                  </label>
                  <input
                    type="number"
                    value={thresholdDegraded}
                    onChange={(e) => setThresholdDegraded(Number(e.target.value))}
                    min={50}
                    max={10000}
                    className="w-full rounded-lg border border-amber-500/20 bg-amber-500/[0.03] px-3 py-2 text-sm text-white/90 outline-none transition-colors focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-red-400/70">
                    Down above (ms)
                  </label>
                  <input
                    type="number"
                    value={thresholdDown}
                    onChange={(e) => setThresholdDown(Number(e.target.value))}
                    min={100}
                    max={30000}
                    className="w-full rounded-lg border border-red-500/20 bg-red-500/[0.03] px-3 py-2 text-sm text-white/90 outline-none transition-colors focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white/80"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-400 disabled:opacity-50"
            >
              {isSubmitting ? "Adding..." : "Add Endpoint"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
