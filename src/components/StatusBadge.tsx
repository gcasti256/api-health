"use client";

interface StatusBadgeProps {
  responseTimeMs: number | null;
  isUp: number | null;
  size?: "sm" | "md";
}

export default function StatusBadge({
  responseTimeMs,
  isUp,
  size = "md",
}: StatusBadgeProps) {
  let status: "up" | "degraded" | "down";
  let label: string;

  if (isUp === null || isUp === undefined) {
    status = "down";
    label = "Unknown";
  } else if (isUp === 0) {
    status = "down";
    label = "Down";
  } else if (responseTimeMs !== null && responseTimeMs > 1000) {
    status = "degraded";
    label = "Degraded";
  } else if (responseTimeMs !== null && responseTimeMs > 200) {
    status = "degraded";
    label = "Slow";
  } else {
    status = "up";
    label = "Healthy";
  }

  const colors = {
    up: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    degraded: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    down: "bg-red-500/15 text-red-400 border-red-500/30",
  };

  const dotColors = {
    up: "bg-emerald-400",
    degraded: "bg-amber-400",
    down: "bg-red-400",
  };

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${colors[status]} ${sizeClasses[size]}`}
    >
      <span
        className={`inline-block rounded-full ${dotColors[status]} ${size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2"}`}
      />
      {label}
    </span>
  );
}
