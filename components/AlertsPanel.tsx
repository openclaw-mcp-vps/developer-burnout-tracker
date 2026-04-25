import { AlertTriangle, BellDot, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { BurnoutAlert } from "@/lib/burnout-detector";

interface AlertsPanelProps {
  alerts: BurnoutAlert[];
  interventions: string[];
}

function severityBadge(
  severity: BurnoutAlert["severity"],
): "danger" | "warning" | "info" {
  if (severity === "critical") {
    return "danger";
  }
  if (severity === "warning") {
    return "warning";
  }
  return "info";
}

function AlertIcon({ severity }: { severity: BurnoutAlert["severity"] }) {
  if (severity === "critical") {
    return <AlertTriangle className="h-4 w-4 text-[#f85149]" />;
  }
  if (severity === "warning") {
    return <BellDot className="h-4 w-4 text-[#e3b341]" />;
  }
  return <ShieldCheck className="h-4 w-4 text-[#58a6ff]" />;
}

export function AlertsPanel({ alerts, interventions }: AlertsPanelProps) {
  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle>Prioritized Alerts</CardTitle>
        <CardDescription>
          Focus these actions first to lower burnout risk without stalling delivery.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="space-y-2 rounded-lg border border-[#30363d] bg-[#0d1117] p-4"
            >
              <div className="flex items-center gap-2">
                <AlertIcon severity={alert.severity} />
                <p className="font-medium text-[#f0f6fc]">{alert.title}</p>
                <Badge variant={severityBadge(alert.severity)} className="ml-auto">
                  {alert.severity.toUpperCase()}
                </Badge>
              </div>
              <p className="text-sm text-[#8b949e]">{alert.evidence}</p>
              <p className="text-sm text-[#c9d1d9]">{alert.recommendation}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3 rounded-lg border border-[#30363d] bg-[#0d1117] p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[#58a6ff]">
            Manager Intervention Plan
          </p>
          {interventions.map((intervention) => (
            <p key={intervention} className="text-sm text-[#c9d1d9]">
              {intervention}
            </p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
