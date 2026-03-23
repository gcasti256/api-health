"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface Check {
  id: number;
  endpoint_id: number;
  status_code: number | null;
  response_time_ms: number | null;
  is_up: number;
  error: string | null;
  checked_at: string;
}

interface ResponseChartProps {
  checks: Check[];
}

interface ChartDataPoint {
  time: string;
  responseTime: number | null;
  timestamp: number;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr + "Z");
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number | null; payload: ChartDataPoint }>;
  label?: string;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0];
  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#18181b] px-3 py-2 shadow-xl">
      <p className="text-xs text-white/40">{data.payload.time}</p>
      <p className="mt-0.5 text-sm font-medium text-white/90">
        {data.value !== null ? `${data.value}ms` : "Failed"}
      </p>
    </div>
  );
}

export default function ResponseChart({ checks }: ResponseChartProps) {
  if (checks.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <p className="text-sm text-white/30">No check data available yet</p>
      </div>
    );
  }

  const data: ChartDataPoint[] = checks.map((check) => ({
    time: formatTime(check.checked_at),
    responseTime: check.response_time_ms,
    timestamp: new Date(check.checked_at + "Z").getTime(),
  }));

  const responseTimes = checks
    .map((c) => c.response_time_ms)
    .filter((t): t is number => t !== null);
  const maxTime = responseTimes.length > 0 ? Math.max(...responseTimes) : 1000;
  const yMax = Math.ceil(maxTime * 1.2 / 100) * 100;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />
          <XAxis
            dataKey="time"
            tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
            domain={[0, yMax]}
            tickFormatter={(value: number) => `${value}ms`}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={200}
            stroke="rgba(16,185,129,0.3)"
            strokeDasharray="3 3"
            label={{
              value: "200ms",
              fill: "rgba(16,185,129,0.4)",
              fontSize: 10,
              position: "right",
            }}
          />
          <ReferenceLine
            y={1000}
            stroke="rgba(239,68,68,0.3)"
            strokeDasharray="3 3"
            label={{
              value: "1000ms",
              fill: "rgba(239,68,68,0.4)",
              fontSize: 10,
              position: "right",
            }}
          />
          <Line
            type="monotone"
            dataKey="responseTime"
            stroke="#6366f1"
            strokeWidth={2}
            dot={false}
            activeDot={{
              r: 4,
              fill: "#6366f1",
              stroke: "#818cf8",
              strokeWidth: 2,
            }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
