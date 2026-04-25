import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { BurnoutAnalysisResult, RiskLevel } from "@/lib/burnout-detector";

interface BurnoutScoreProps {
  analysis: BurnoutAnalysisResult;
}

const riskVariant: Record<RiskLevel, "success" | "warning" | "danger" | "info"> = {
  low: "success",
  moderate: "info",
  high: "warning",
  critical: "danger",
};

const ringColor: Record<RiskLevel, string> = {
  low: "#3fb950",
  moderate: "#58a6ff",
  high: "#e3b341",
  critical: "#f85149",
};

export function BurnoutScore({ analysis }: BurnoutScoreProps) {
  const ringProgress = Math.max(0, Math.min(analysis.score, 100));

  return (
    <Card className="glass-panel">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Burnout Risk Score</CardTitle>
          <CardDescription>
            Last analyzed {format(new Date(analysis.generatedAt), "MMM d, yyyy HH:mm")}
          </CardDescription>
        </div>
        <Badge variant={riskVariant[analysis.riskLevel]}>
          {analysis.riskLevel.toUpperCase()} RISK
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-[180px_1fr] md:items-center">
        <div className="flex items-center justify-center">
          <div
            className="relative h-36 w-36 rounded-full"
            style={{
              background: `conic-gradient(${ringColor[analysis.riskLevel]} ${ringProgress}%, #30363d ${ringProgress}% 100%)`,
            }}
          >
            <div className="absolute inset-[12px] flex items-center justify-center rounded-full border border-[#30363d] bg-[#0d1117]">
              <div className="text-center">
                <p className="text-3xl font-bold text-[#f0f6fc]">{analysis.score}</p>
                <p className="text-xs text-[#8b949e]">out of 100</p>
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-[#c9d1d9]">{analysis.summary}</p>
          <p className="text-xs text-[#8b949e]">
            Confidence: {analysis.confidence}% based on commit and PR sample depth.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
