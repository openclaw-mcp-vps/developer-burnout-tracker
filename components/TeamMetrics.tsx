"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { RepositoryMetrics } from "@/lib/github-analyzer";

interface TeamMetricsProps {
  metrics: RepositoryMetrics;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function TeamMetrics({ metrics }: TeamMetricsProps) {
  const stressData = [
    {
      name: "Late-night",
      value: Math.round(metrics.lateNightCommitRatio * 100),
    },
    {
      name: "Weekend",
      value: Math.round(metrics.weekendCommitRatio * 100),
    },
    {
      name: "Rushed",
      value: Math.round(metrics.rushedCommitRatio * 100),
    },
    {
      name: "Quality drift",
      value: Math.round(metrics.qualityDropSignal * 100),
    },
  ];

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle>Team Metrics</CardTitle>
        <CardDescription>
          Repository: {metrics.repository} ({metrics.windowDays}-day window)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-[#30363d] bg-[#0d1117] p-3">
            <p className="text-xs text-[#8b949e]">Commits / Day</p>
            <p className="text-xl font-semibold text-[#f0f6fc]">{metrics.commitFrequencyPerDay}</p>
          </div>
          <div className="rounded-lg border border-[#30363d] bg-[#0d1117] p-3">
            <p className="text-xs text-[#8b949e]">Late-night commits</p>
            <p className="text-xl font-semibold text-[#f0f6fc]">
              {formatPercent(metrics.lateNightCommitRatio)}
            </p>
          </div>
          <div className="rounded-lg border border-[#30363d] bg-[#0d1117] p-3">
            <p className="text-xs text-[#8b949e]">Avg review delay</p>
            <p className="text-xl font-semibold text-[#f0f6fc]">
              {metrics.averageReviewDelayHours === null
                ? "N/A"
                : `${Math.round(metrics.averageReviewDelayHours)}h`}
            </p>
          </div>
          <div className="rounded-lg border border-[#30363d] bg-[#0d1117] p-3">
            <p className="text-xs text-[#8b949e]">Review coverage</p>
            <p className="text-xl font-semibold text-[#f0f6fc]">
              {metrics.reviewCoverageRatio === null
                ? "N/A"
                : formatPercent(metrics.reviewCoverageRatio)}
            </p>
          </div>
        </div>

        <div className="h-64 rounded-lg border border-[#30363d] bg-[#0d1117] p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stressData}>
              <CartesianGrid stroke="#30363d" strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="#8b949e" tick={{ fill: "#8b949e", fontSize: 12 }} />
              <YAxis stroke="#8b949e" tick={{ fill: "#8b949e", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#161b22",
                  border: "1px solid #30363d",
                  color: "#c9d1d9",
                }}
              />
              <Bar dataKey="value" fill="#2f81f7" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {metrics.dataWarnings.length > 0 ? (
          <div className="space-y-2 rounded-lg border border-[#30363d] bg-[#0d1117] p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[#e3b341]">
              Data caveats
            </p>
            {metrics.dataWarnings.map((warning) => (
              <p key={warning} className="text-xs text-[#8b949e]">
                {warning}
              </p>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
