import { Octokit } from "@octokit/rest";
import { subDays } from "date-fns";

export type SupportedProvider = "github" | "gitlab";

export interface AnalyzeRepositoryInput {
  provider?: SupportedProvider;
  owner: string;
  repo: string;
  token?: string;
  sinceDays?: number;
}

interface AnalyzedCommit {
  message: string;
  date: string;
  author: string;
  isLateNight: boolean;
  isWeekend: boolean;
  isRushed: boolean;
}

interface PullRequestSummary {
  number: number;
  createdAt: string;
  mergedAt: string | null;
}

export interface RepositoryMetrics {
  provider: SupportedProvider;
  repository: string;
  collectedAt: string;
  windowDays: number;
  totalCommits: number;
  activeContributors: number;
  commitFrequencyPerDay: number;
  lateNightCommitRatio: number;
  weekendCommitRatio: number;
  rushedCommitRatio: number;
  commitMessageQualityScore: number;
  medianCommitSize: number;
  totalCodeChurn: number;
  totalPullRequests: number;
  mergedPullRequests: number;
  averagePrCycleHours: number | null;
  averageReviewDelayHours: number | null;
  reviewedPullRequests: number;
  reviewCoverageRatio: number | null;
  mergedPrRate: number | null;
  qualityDropSignal: number;
  dataWarnings: string[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

function round(value: number, precision = 2): number {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}

function computeCommitMessageQuality(message: string): number {
  const normalized = message.trim();
  if (normalized.length === 0) {
    return 0;
  }

  let score = 50;
  const hasContext = /(#\d+|[A-Z]{2,}-\d+)/.test(normalized);
  const hasVerb =
    /^(add|fix|refactor|improve|remove|update|revert|document|test|optimize)/i.test(
      normalized,
    );

  if (normalized.length >= 28) {
    score += 25;
  }
  if (normalized.length >= 48) {
    score += 10;
  }
  if (hasContext) {
    score += 8;
  }
  if (hasVerb) {
    score += 7;
  }
  if (/\b(wip|temp|quick|hotfix|oops|try)\b/i.test(normalized)) {
    score -= 24;
  }

  return clamp(score, 0, 100);
}

function isRushedCommit(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  if (normalized.length < 20) {
    return true;
  }
  return /\b(wip|temp|quick fix|hotfix|oops|fix typo|minor|small fix)\b/.test(
    normalized,
  );
}

function hoursBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  return (end - start) / (1000 * 60 * 60);
}

async function analyzeGitHubRepository(
  input: AnalyzeRepositoryInput,
): Promise<RepositoryMetrics> {
  const sinceDays = clamp(input.sinceDays ?? 30, 7, 365);
  const sinceDate = subDays(new Date(), sinceDays);
  const warnings: string[] = [];

  const octokit = new Octokit({
    auth: input.token || process.env.GITHUB_TOKEN,
    userAgent: "developer-burnout-tracker/1.0.0",
  });

  const commitItems = (await octokit.paginate(octokit.repos.listCommits, {
    owner: input.owner,
    repo: input.repo,
    since: sinceDate.toISOString(),
    per_page: 100,
  })) as Array<{
    sha: string;
    author: { login?: string | null } | null;
    commit: {
      message: string;
      author: { date?: string | null; name?: string | null } | null;
      committer: { date?: string | null; name?: string | null } | null;
    };
  }>;

  const commits: AnalyzedCommit[] = commitItems
    .map((commitItem) => {
      const date =
        commitItem.commit.author?.date ?? commitItem.commit.committer?.date ?? null;
      if (!date) {
        return null;
      }

      const dateObj = new Date(date);
      if (Number.isNaN(dateObj.getTime())) {
        return null;
      }

      const hour = dateObj.getUTCHours();
      const day = dateObj.getUTCDay();
      const message = commitItem.commit.message.split("\n")[0] ?? "";

      return {
        message,
        date,
        author:
          commitItem.author?.login ||
          commitItem.commit.author?.name ||
          commitItem.commit.committer?.name ||
          "unknown",
        isLateNight: hour >= 22 || hour < 6,
        isWeekend: day === 0 || day === 6,
        isRushed: isRushedCommit(message),
      };
    })
    .filter((commit): commit is AnalyzedCommit => commit !== null);

  const commitShas = commitItems.slice(0, 40).map((commitItem) => commitItem.sha);
  const commitSizes: number[] = [];
  let totalCodeChurn = 0;

  await Promise.all(
    commitShas.map(async (sha) => {
      try {
        const details = (await octokit.repos.getCommit({
          owner: input.owner,
          repo: input.repo,
          ref: sha,
        })) as {
          data: {
            stats?: {
              additions?: number;
              deletions?: number;
              total?: number;
            };
          };
        };

        const additions = details.data.stats?.additions ?? 0;
        const deletions = details.data.stats?.deletions ?? 0;
        const total = details.data.stats?.total ?? additions + deletions;

        if (total > 0) {
          commitSizes.push(total);
        }

        totalCodeChurn += additions + deletions;
      } catch {
        warnings.push(`Could not load details for commit ${sha.slice(0, 7)}.`);
      }
    }),
  );

  const prItems = (await octokit.paginate(octokit.pulls.list, {
    owner: input.owner,
    repo: input.repo,
    state: "closed",
    sort: "updated",
    direction: "desc",
    per_page: 100,
  })) as Array<{
    number: number;
    created_at: string;
    merged_at: string | null;
  }>;

  const pullRequests: PullRequestSummary[] = prItems
    .filter((pr) => new Date(pr.created_at).getTime() >= sinceDate.getTime())
    .map((pr) => ({
      number: pr.number,
      createdAt: pr.created_at,
      mergedAt: pr.merged_at,
    }));

  const mergedPulls = pullRequests.filter((pullRequest) => pullRequest.mergedAt !== null);
  const prCycleTimes = mergedPulls
    .map((pullRequest) =>
      hoursBetween(pullRequest.createdAt, pullRequest.mergedAt as string),
    )
    .filter((value) => Number.isFinite(value) && value >= 0);

  const reviewDelaySamples: number[] = [];
  let reviewedPullRequests = 0;

  await Promise.all(
    mergedPulls.slice(0, 20).map(async (pullRequest) => {
      try {
        const reviewsResponse = (await octokit.pulls.listReviews({
          owner: input.owner,
          repo: input.repo,
          pull_number: pullRequest.number,
          per_page: 100,
        })) as {
          data: Array<{
            state?: string;
            submitted_at?: string | null;
            created_at?: string;
          }>;
        };

        const reviews = reviewsResponse.data
          .filter((review) => review.state !== "PENDING")
          .map((review) => review.submitted_at ?? review.created_at)
          .filter((date): date is string => Boolean(date))
          .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

        if (reviews.length === 0) {
          return;
        }

        const firstReviewAt = reviews[0];
        const delay = hoursBetween(pullRequest.createdAt, firstReviewAt);

        if (Number.isFinite(delay) && delay >= 0) {
          reviewDelaySamples.push(delay);
          reviewedPullRequests += 1;
        }
      } catch {
        warnings.push(
          `Could not load review data for PR #${pullRequest.number.toString()}.`,
        );
      }
    }),
  );

  const commitCount = commits.length;
  const lateNightCount = commits.filter((commit) => commit.isLateNight).length;
  const weekendCount = commits.filter((commit) => commit.isWeekend).length;
  const rushedCount = commits.filter((commit) => commit.isRushed).length;
  const messageQualityScores = commits.map((commit) =>
    computeCommitMessageQuality(commit.message),
  );
  const commitMessageQualityScore = average(messageQualityScores);

  const contributors = new Set(commits.map((commit) => commit.author));

  const sortedCommits = [...commits].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const midpoint = Math.floor(sortedCommits.length / 2);

  const older = sortedCommits.slice(0, midpoint);
  const recent = sortedCommits.slice(midpoint);
  const olderRushed = older.length
    ? older.filter((commit) => commit.isRushed).length / older.length
    : 0;
  const recentRushed = recent.length
    ? recent.filter((commit) => commit.isRushed).length / recent.length
    : 0;
  const olderLate = older.length
    ? older.filter((commit) => commit.isLateNight).length / older.length
    : 0;
  const recentLate = recent.length
    ? recent.filter((commit) => commit.isLateNight).length / recent.length
    : 0;

  const olderQuality = older.length
    ? average(older.map((commit) => computeCommitMessageQuality(commit.message)))
    : commitMessageQualityScore;
  const recentQuality = recent.length
    ? average(recent.map((commit) => computeCommitMessageQuality(commit.message)))
    : commitMessageQualityScore;

  const qualityDropSignal = clamp(
    (recentRushed - olderRushed) * 1.8 +
      (recentLate - olderLate) * 1.4 +
      Math.max(0, (olderQuality - recentQuality) / 100),
    0,
    1,
  );

  const sampleReviewCount = Math.min(20, mergedPulls.length);

  if (commitCount < 20) {
    warnings.push(
      "Commit sample is small; burnout trend confidence is lower than normal.",
    );
  }
  if (pullRequests.length < 8) {
    warnings.push("PR sample is small; review latency may be noisy.");
  }

  return {
    provider: "github",
    repository: `${input.owner}/${input.repo}`,
    collectedAt: new Date().toISOString(),
    windowDays: sinceDays,
    totalCommits: commitCount,
    activeContributors: contributors.size,
    commitFrequencyPerDay: round(commitCount / sinceDays),
    lateNightCommitRatio: round(commitCount > 0 ? lateNightCount / commitCount : 0, 3),
    weekendCommitRatio: round(commitCount > 0 ? weekendCount / commitCount : 0, 3),
    rushedCommitRatio: round(commitCount > 0 ? rushedCount / commitCount : 0, 3),
    commitMessageQualityScore: round(commitMessageQualityScore, 1),
    medianCommitSize: round(median(commitSizes), 1),
    totalCodeChurn: totalCodeChurn,
    totalPullRequests: pullRequests.length,
    mergedPullRequests: mergedPulls.length,
    averagePrCycleHours: prCycleTimes.length ? round(average(prCycleTimes), 2) : null,
    averageReviewDelayHours: reviewDelaySamples.length
      ? round(average(reviewDelaySamples), 2)
      : null,
    reviewedPullRequests,
    reviewCoverageRatio:
      sampleReviewCount > 0
        ? round(reviewedPullRequests / sampleReviewCount, 3)
        : null,
    mergedPrRate:
      pullRequests.length > 0
        ? round(mergedPulls.length / pullRequests.length, 3)
        : null,
    qualityDropSignal: round(qualityDropSignal, 3),
    dataWarnings: warnings,
  };
}

interface GitLabCommit {
  id: string;
  title: string;
  created_at: string;
  author_name: string;
}

interface GitLabMergeRequest {
  created_at: string;
  merged_at: string | null;
}

async function fetchGitLabJson<T>(url: string, token: string | undefined): Promise<T> {
  const response = await fetch(url, {
    headers: token ? { "PRIVATE-TOKEN": token } : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitLab API error (${response.status}): ${body}`);
  }

  return (await response.json()) as T;
}

async function analyzeGitLabRepository(
  input: AnalyzeRepositoryInput,
): Promise<RepositoryMetrics> {
  const sinceDays = clamp(input.sinceDays ?? 30, 7, 365);
  const sinceDate = subDays(new Date(), sinceDays);
  const token = input.token || process.env.GITLAB_TOKEN;
  const projectPath = encodeURIComponent(`${input.owner}/${input.repo}`);
  const warnings: string[] = [
    "GitLab review timing metrics are estimated because GitLab review events are not fully exposed in this endpoint.",
  ];

  const commitsUrl = `https://gitlab.com/api/v4/projects/${projectPath}/repository/commits?since=${encodeURIComponent(
    sinceDate.toISOString(),
  )}&per_page=100`;

  const mergeRequestsUrl = `https://gitlab.com/api/v4/projects/${projectPath}/merge_requests?state=all&updated_after=${encodeURIComponent(
    sinceDate.toISOString(),
  )}&per_page=100`;

  const [commits, mergeRequests] = await Promise.all([
    fetchGitLabJson<GitLabCommit[]>(commitsUrl, token),
    fetchGitLabJson<GitLabMergeRequest[]>(mergeRequestsUrl, token),
  ]);

  const analyzedCommits = commits.map((commit) => {
    const dateObj = new Date(commit.created_at);
    const hour = dateObj.getUTCHours();
    const day = dateObj.getUTCDay();

    return {
      message: commit.title,
      date: commit.created_at,
      author: commit.author_name,
      isLateNight: hour >= 22 || hour < 6,
      isWeekend: day === 0 || day === 6,
      isRushed: isRushedCommit(commit.title),
    };
  });

  const commitCount = analyzedCommits.length;
  const lateNightCount = analyzedCommits.filter((commit) => commit.isLateNight).length;
  const weekendCount = analyzedCommits.filter((commit) => commit.isWeekend).length;
  const rushedCount = analyzedCommits.filter((commit) => commit.isRushed).length;

  const mergedPullRequests = mergeRequests.filter((mr) => mr.merged_at).length;
  const prCycleTimes = mergeRequests
    .filter((mr): mr is GitLabMergeRequest & { merged_at: string } => Boolean(mr.merged_at))
    .map((mr) => hoursBetween(mr.created_at, mr.merged_at));

  const contributors = new Set(analyzedCommits.map((commit) => commit.author));

  const messageQualityScore = average(
    analyzedCommits.map((commit) => computeCommitMessageQuality(commit.message)),
  );

  return {
    provider: "gitlab",
    repository: `${input.owner}/${input.repo}`,
    collectedAt: new Date().toISOString(),
    windowDays: sinceDays,
    totalCommits: commitCount,
    activeContributors: contributors.size,
    commitFrequencyPerDay: round(commitCount / sinceDays),
    lateNightCommitRatio: round(commitCount > 0 ? lateNightCount / commitCount : 0, 3),
    weekendCommitRatio: round(commitCount > 0 ? weekendCount / commitCount : 0, 3),
    rushedCommitRatio: round(commitCount > 0 ? rushedCount / commitCount : 0, 3),
    commitMessageQualityScore: round(messageQualityScore, 1),
    medianCommitSize: 0,
    totalCodeChurn: 0,
    totalPullRequests: mergeRequests.length,
    mergedPullRequests,
    averagePrCycleHours: prCycleTimes.length ? round(average(prCycleTimes), 2) : null,
    averageReviewDelayHours: null,
    reviewedPullRequests: 0,
    reviewCoverageRatio: null,
    mergedPrRate:
      mergeRequests.length > 0
        ? round(mergedPullRequests / mergeRequests.length, 3)
        : null,
    qualityDropSignal: 0,
    dataWarnings: warnings,
  };
}

export async function analyzeRepositoryActivity(
  input: AnalyzeRepositoryInput,
): Promise<RepositoryMetrics> {
  if ((input.provider ?? "github") === "gitlab") {
    return analyzeGitLabRepository(input);
  }

  return analyzeGitHubRepository(input);
}
