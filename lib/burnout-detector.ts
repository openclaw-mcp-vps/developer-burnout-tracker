import type { RepositoryMetrics } from "@/lib/github-analyzer";

export type RiskLevel = "low" | "moderate" | "high" | "critical";
export type AlertSeverity = "info" | "warning" | "critical";

export interface BurnoutAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  evidence: string;
  recommendation: string;
}

export interface BurnoutAnalysisResult {
  generatedAt: string;
  score: number;
  riskLevel: RiskLevel;
  confidence: number;
  summary: string;
  interventions: string[];
  alerts: BurnoutAlert[];
  metrics: RepositoryMetrics;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function inverseBandScore(value: number, healthy: number, concerning: number): number {
  if (value <= healthy) {
    return 0;
  }
  if (value >= concerning) {
    return 1;
  }
  return (value - healthy) / (concerning - healthy);
}

function directBandScore(value: number, concerning: number, severe: number): number {
  if (value <= concerning) {
    return 0;
  }
  if (value >= severe) {
    return 1;
  }
  return (value - concerning) / (severe - concerning);
}

function severityFromScore(score: number): AlertSeverity {
  if (score >= 0.85) {
    return "critical";
  }
  if (score >= 0.55) {
    return "warning";
  }
  return "info";
}

function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 75) {
    return "critical";
  }
  if (score >= 55) {
    return "high";
  }
  if (score >= 35) {
    return "moderate";
  }
  return "low";
}

function confidenceFromSample(metrics: RepositoryMetrics): number {
  const commitConfidence = clamp(metrics.totalCommits / 80, 0.2, 1);
  const prConfidence = clamp(metrics.totalPullRequests / 25, 0.2, 1);
  const reviewConfidence =
    metrics.reviewCoverageRatio === null
      ? 0.45
      : clamp(metrics.reviewedPullRequests / 12, 0.25, 1);

  const confidence =
    commitConfidence * 0.5 + prConfidence * 0.3 + reviewConfidence * 0.2;
  return Math.round(confidence * 100);
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function detectBurnout(metrics: RepositoryMetrics): BurnoutAnalysisResult {
  const lateNightPressure = directBandScore(metrics.lateNightCommitRatio, 0.14, 0.32);
  const weekendPressure = directBandScore(metrics.weekendCommitRatio, 0.16, 0.34);
  const rushedCodePressure = directBandScore(metrics.rushedCommitRatio, 0.2, 0.45);
  const reviewDelayPressure =
    metrics.averageReviewDelayHours === null
      ? 0.35
      : directBandScore(metrics.averageReviewDelayHours, 20, 72);
  const reviewCoveragePressure =
    metrics.reviewCoverageRatio === null
      ? 0.35
      : inverseBandScore(metrics.reviewCoverageRatio, 0.75, 0.35);
  const qualityDropPressure = clamp(metrics.qualityDropSignal, 0, 1);
  const messageQualityPressure = inverseBandScore(
    metrics.commitMessageQualityScore,
    72,
    42,
  );

  const weightedScore =
    lateNightPressure * 0.2 +
    weekendPressure * 0.12 +
    rushedCodePressure * 0.2 +
    reviewDelayPressure * 0.14 +
    reviewCoveragePressure * 0.12 +
    qualityDropPressure * 0.14 +
    messageQualityPressure * 0.08;

  const score = Math.round(clamp(weightedScore, 0, 1) * 100);
  const confidence = confidenceFromSample(metrics);
  const riskLevel = riskLevelFromScore(score);

  const alerts: BurnoutAlert[] = [];

  if (metrics.lateNightCommitRatio >= 0.18) {
    alerts.push({
      id: "late-night-commits",
      severity: severityFromScore(lateNightPressure),
      title: "Late-night coding load is elevated",
      evidence: `${formatPercent(metrics.lateNightCommitRatio)} of commits were made between 10pm and 6am UTC in the last ${metrics.windowDays} days.`,
      recommendation:
        "Cap after-hours production work, add a rotating incident backup, and enforce next-day recovery time after overnight push windows.",
    });
  }

  if (metrics.weekendCommitRatio >= 0.2) {
    alerts.push({
      id: "weekend-throughput",
      severity: severityFromScore(weekendPressure),
      title: "Weekend effort is replacing weekday capacity",
      evidence: `${formatPercent(metrics.weekendCommitRatio)} of commits landed on weekends.`,
      recommendation:
        "Move roadmap scope out of the sprint, and make weekend work opt-in with explicit compensatory time off.",
    });
  }

  if (metrics.rushedCommitRatio >= 0.26) {
    alerts.push({
      id: "rushed-code",
      severity: severityFromScore(rushedCodePressure),
      title: "Rushed commit signature is increasing",
      evidence: `${formatPercent(metrics.rushedCommitRatio)} of commit messages match rushed patterns (short context or "WIP" style wording).`,
      recommendation:
        "Reduce concurrent priorities per engineer and require issue-linked commit messages for critical services.",
    });
  }

  if (metrics.averageReviewDelayHours !== null && metrics.averageReviewDelayHours >= 28) {
    alerts.push({
      id: "review-lag",
      severity: severityFromScore(reviewDelayPressure),
      title: "PR review turnaround is slowing",
      evidence: `Average first review time is ${Math.round(
        metrics.averageReviewDelayHours,
      )} hours, indicating reviewer overload.`,
      recommendation:
        "Create protected review blocks on calendars and rotate a dedicated \"review captain\" each sprint.",
    });
  }

  if (metrics.reviewCoverageRatio !== null && metrics.reviewCoverageRatio <= 0.55) {
    alerts.push({
      id: "review-coverage",
      severity: severityFromScore(reviewCoveragePressure),
      title: "Code review coverage is thinning",
      evidence: `Only ${formatPercent(
        metrics.reviewCoverageRatio,
      )} of sampled merged PRs received substantive review before merge.`,
      recommendation:
        "Tighten branch protection to require at least one non-author review for medium/high-risk repositories.",
    });
  }

  if (metrics.qualityDropSignal >= 0.35) {
    alerts.push({
      id: "quality-drop",
      severity: severityFromScore(qualityDropPressure),
      title: "Recent activity indicates quality fatigue",
      evidence:
        "Recent commits have a worse rushed/late-night profile than earlier commits in the same analysis window.",
      recommendation:
        "Add a short stabilization sprint focused on tech debt, test reliability, and work-in-progress limits.",
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: "stable",
      severity: "info",
      title: "No acute burnout indicators",
      evidence:
        "Current repository signals are in a manageable range. Continue monitoring leading indicators weekly.",
      recommendation:
        "Maintain current review SLAs and keep meeting-free focus blocks in place to preserve recovery capacity.",
    });
  }

  const severityOrder: Record<AlertSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };

  alerts.sort((left, right) => severityOrder[left.severity] - severityOrder[right.severity]);

  const interventions = [
    "Run a 15-minute weekly burnout review in engineering leadership using trend deltas instead of single-point values.",
    "Flag services with sustained late-night work for ownership redistribution or on-call staffing adjustments.",
    "Set an explicit PR review SLA (e.g., first response in <24h) and measure adherence at team level.",
  ];

  if (riskLevel === "high" || riskLevel === "critical") {
    interventions.unshift(
      "Immediately reduce in-flight roadmap scope for the next sprint and protect at least one no-meeting block per engineer.",
    );
  }

  const summary =
    riskLevel === "critical"
      ? "Critical burnout risk is present. Workload and review bottlenecks are likely unsustainable without immediate intervention."
      : riskLevel === "high"
        ? "Burnout risk is high. Multiple leading indicators suggest sustained pressure and declining engineering hygiene."
        : riskLevel === "moderate"
          ? "Burnout risk is moderate. Early warning signals are emerging and should be corrected before they compound."
          : "Burnout risk is currently low. Continue weekly monitoring and preserve existing recovery-friendly practices.";

  return {
    generatedAt: new Date().toISOString(),
    score,
    riskLevel,
    confidence,
    summary,
    interventions,
    alerts,
    metrics,
  };
}
