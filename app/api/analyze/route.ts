import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

import { detectBurnout } from "@/lib/burnout-detector";
import {
  listAnalysesForEmail,
  saveAnalysis,
  validateAccessSession,
} from "@/lib/database";
import { analyzeRepositoryActivity } from "@/lib/github-analyzer";
import { ACCESS_COOKIE_NAME } from "@/lib/lemon-squeezy";

const metricsSchema = z.object({
  provider: z.enum(["github", "gitlab"]),
  repository: z.string(),
  collectedAt: z.string(),
  windowDays: z.number().int().min(1),
  totalCommits: z.number().int().min(0),
  activeContributors: z.number().int().min(0),
  commitFrequencyPerDay: z.number().min(0),
  lateNightCommitRatio: z.number().min(0).max(1),
  weekendCommitRatio: z.number().min(0).max(1),
  rushedCommitRatio: z.number().min(0).max(1),
  commitMessageQualityScore: z.number().min(0).max(100),
  medianCommitSize: z.number().min(0),
  totalCodeChurn: z.number().min(0),
  totalPullRequests: z.number().int().min(0),
  mergedPullRequests: z.number().int().min(0),
  averagePrCycleHours: z.number().nullable(),
  averageReviewDelayHours: z.number().nullable(),
  reviewedPullRequests: z.number().int().min(0),
  reviewCoverageRatio: z.number().min(0).max(1).nullable(),
  mergedPrRate: z.number().min(0).max(1).nullable(),
  qualityDropSignal: z.number().min(0).max(1),
  dataWarnings: z.array(z.string()),
});

const requestSchema = z
  .object({
    provider: z.enum(["github", "gitlab"]).default("github"),
    owner: z.string().min(1).optional(),
    repo: z.string().min(1).optional(),
    token: z.string().optional(),
    sinceDays: z.coerce.number().int().min(7).max(365).default(30),
    metrics: metricsSchema.optional(),
  })
  .superRefine((value, context) => {
    if (!value.metrics && (!value.owner || !value.repo)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "owner and repo are required when metrics are not provided.",
        path: ["owner"],
      });
    }
  });

async function requireSession(): Promise<{ email: string } | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  return validateAccessSession(accessToken);
}

export async function POST(request: Request): Promise<NextResponse> {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json(
      { message: "Paid access required." },
      { status: 401 },
    );
  }

  try {
    const payload = requestSchema.parse(await request.json());
    const metrics =
      payload.metrics ??
      (await analyzeRepositoryActivity({
        provider: payload.provider,
        owner: payload.owner as string,
        repo: payload.repo as string,
        token: payload.token,
        sinceDays: payload.sinceDays,
      }));

    const analysis = detectBurnout(metrics);
    await saveAnalysis(session.email, analysis);

    return NextResponse.json({ analysis });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid request body.", errors: error.issues },
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : "Could not complete analysis.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function GET(): Promise<NextResponse> {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json(
      { message: "Paid access required." },
      { status: 401 },
    );
  }

  const records = await listAnalysesForEmail(session.email, 20);
  return NextResponse.json({
    analyses: records.map((record) => record.analysis),
  });
}
