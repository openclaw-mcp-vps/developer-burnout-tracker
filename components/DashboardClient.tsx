"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";

import { AlertsPanel } from "@/components/AlertsPanel";
import { BurnoutScore } from "@/components/BurnoutScore";
import { TeamMetrics } from "@/components/TeamMetrics";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { BurnoutAnalysisResult } from "@/lib/burnout-detector";

interface DashboardClientProps {
  userEmail: string;
  initialAnalyses: BurnoutAnalysisResult[];
}

interface AnalyzeResponse {
  analysis: BurnoutAnalysisResult;
}

export function DashboardClient({
  userEmail,
  initialAnalyses,
}: DashboardClientProps) {
  const [provider, setProvider] = useState<"github" | "gitlab">("github");
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [token, setToken] = useState("");
  const [sinceDays, setSinceDays] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<BurnoutAnalysisResult[]>(initialAnalyses);

  const activeAnalysis = history[0] ?? null;

  const uniqueRepositories = useMemo(() => {
    const seen = new Set<string>();
    return history.filter((entry) => {
      if (seen.has(entry.metrics.repository)) {
        return false;
      }
      seen.add(entry.metrics.repository);
      return true;
    });
  }, [history]);

  async function handleAnalyze(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);

    if (!owner.trim() || !repo.trim()) {
      setError("Owner and repository are required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider,
          owner: owner.trim(),
          repo: repo.trim(),
          token: token.trim() || undefined,
          sinceDays,
        }),
      });

      const payload = (await response.json()) as AnalyzeResponse & { message?: string };

      if (!response.ok) {
        setError(payload.message || "Analysis request failed.");
        return;
      }

      setHistory((previous) => [payload.analysis, ...previous].slice(0, 10));
    } catch {
      setError("Request failed due to a network error.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Run Burnout Analysis</CardTitle>
          <CardDescription>
            Signed in as {userEmail}. Connect a repository to generate objective burnout
            risk insights for your engineering team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleAnalyze}>
            <label className="space-y-2 text-sm text-[#8b949e]">
              Provider
              <select
                className="h-10 w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 text-sm text-[#c9d1d9]"
                value={provider}
                onChange={(event) => setProvider(event.target.value as "github" | "gitlab")}
              >
                <option value="github">GitHub</option>
                <option value="gitlab">GitLab</option>
              </select>
            </label>
            <label className="space-y-2 text-sm text-[#8b949e]">
              Analysis Window (Days)
              <Input
                type="number"
                min={7}
                max={365}
                value={sinceDays}
                onChange={(event) => setSinceDays(Number(event.target.value))}
              />
            </label>
            <label className="space-y-2 text-sm text-[#8b949e]">
              Owner / Group
              <Input
                value={owner}
                onChange={(event) => setOwner(event.target.value)}
                placeholder="vercel"
                required
              />
            </label>
            <label className="space-y-2 text-sm text-[#8b949e]">
              Repository Name
              <Input
                value={repo}
                onChange={(event) => setRepo(event.target.value)}
                placeholder="next.js"
                required
              />
            </label>
            <label className="space-y-2 text-sm text-[#8b949e] md:col-span-2">
              API Token (optional for private repos)
              <Input
                type="password"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder={provider === "github" ? "ghp_..." : "glpat-..."}
              />
            </label>
            <div className="md:col-span-2 flex flex-col gap-3">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Analyzing repository..." : "Analyze Repository"}
              </Button>
              {error ? <p className="text-sm text-[#f85149]">{error}</p> : null}
            </div>
          </form>
        </CardContent>
      </Card>

      {activeAnalysis ? (
        <div className="space-y-6">
          <BurnoutScore analysis={activeAnalysis} />
          <div className="grid gap-6 xl:grid-cols-2">
            <TeamMetrics metrics={activeAnalysis.metrics} />
            <AlertsPanel
              alerts={activeAnalysis.alerts}
              interventions={activeAnalysis.interventions}
            />
          </div>

          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Recent Reports</CardTitle>
              <CardDescription>
                Compare risk movement across repositories and analysis runs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {history.map((entry) => (
                <div
                  key={`${entry.generatedAt}-${entry.metrics.repository}`}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-[#30363d] bg-[#0d1117] p-3 text-sm"
                >
                  <p className="font-medium text-[#f0f6fc]">{entry.metrics.repository}</p>
                  <p className="text-[#8b949e]">
                    {format(new Date(entry.generatedAt), "MMM d, yyyy HH:mm")}
                  </p>
                  <p className="ml-auto text-[#c9d1d9]">
                    Score {entry.score} ({entry.riskLevel})
                  </p>
                </div>
              ))}
              {uniqueRepositories.length === 0 ? (
                <p className="text-sm text-[#8b949e]">
                  Run your first analysis to build historical trend context.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>No reports yet</CardTitle>
            <CardDescription>
              Run your first analysis above to get an objective burnout risk score.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
