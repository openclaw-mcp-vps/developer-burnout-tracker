import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type { BurnoutAnalysisResult } from "@/lib/burnout-detector";

const DATA_DIR = path.join(process.cwd(), "data");
const PURCHASES_PATH = path.join(DATA_DIR, "purchases.json");
const SESSIONS_PATH = path.join(DATA_DIR, "access-sessions.json");
const ANALYSES_PATH = path.join(DATA_DIR, "analyses.json");

export interface PurchaseRecord {
  email: string;
  sessionId: string;
  source: "stripe";
  createdAt: string;
  rawEventType?: string;
}

interface PurchaseStore {
  purchases: PurchaseRecord[];
}

interface AccessSession {
  tokenHash: string;
  email: string;
  createdAt: string;
  expiresAt: string;
  lastSeenAt: string;
}

interface AccessSessionStore {
  sessions: AccessSession[];
}

export interface AnalysisRecord {
  id: string;
  email: string;
  repository: string;
  provider: "github" | "gitlab";
  score: number;
  riskLevel: string;
  confidence: number;
  createdAt: string;
  analysis: BurnoutAnalysisResult;
}

interface AnalysisStore {
  analyses: AnalysisRecord[];
}

const DEFAULT_PURCHASE_STORE: PurchaseStore = { purchases: [] };
const DEFAULT_SESSION_STORE: AccessSessionStore = { sessions: [] };
const DEFAULT_ANALYSIS_STORE: AnalysisStore = { analyses: [] };

async function ensureDataDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

async function readStore<T>(filePath: string, fallback: T): Promise<T> {
  await ensureDataDir();
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return JSON.parse(JSON.stringify(fallback)) as T;
  }
}

async function writeStore<T>(filePath: string, value: T): Promise<void> {
  await ensureDataDir();
  const tempPath = `${filePath}.tmp`;
  await writeFile(tempPath, JSON.stringify(value, null, 2), "utf8");
  await rename(tempPath, filePath);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashAccessToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function nowIso(): string {
  return new Date().toISOString();
}

function pruneExpiredSessions(sessions: AccessSession[]): AccessSession[] {
  const now = Date.now();
  return sessions.filter((session) => new Date(session.expiresAt).getTime() > now);
}

export async function listPurchases(): Promise<PurchaseRecord[]> {
  const store = await readStore(PURCHASES_PATH, DEFAULT_PURCHASE_STORE);
  return store.purchases;
}

export async function recordPurchase(record: PurchaseRecord): Promise<void> {
  const normalizedRecord: PurchaseRecord = {
    ...record,
    email: normalizeEmail(record.email),
  };

  const store = await readStore(PURCHASES_PATH, DEFAULT_PURCHASE_STORE);
  const alreadyExists = store.purchases.some(
    (purchase) => purchase.sessionId === normalizedRecord.sessionId,
  );

  if (alreadyExists) {
    return;
  }

  store.purchases.unshift(normalizedRecord);
  store.purchases = store.purchases.slice(0, 5000);
  await writeStore(PURCHASES_PATH, store);
}

export async function hasPurchaseForEmail(email: string): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email);
  const store = await readStore(PURCHASES_PATH, DEFAULT_PURCHASE_STORE);
  return store.purchases.some((purchase) => purchase.email === normalizedEmail);
}

export async function createAccessSession(
  email: string,
  ttlDays = 30,
): Promise<string> {
  const normalizedEmail = normalizeEmail(email);
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashAccessToken(token);
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();

  const store = await readStore(SESSIONS_PATH, DEFAULT_SESSION_STORE);
  const activeSessions = pruneExpiredSessions(store.sessions);

  activeSessions.push({
    tokenHash,
    email: normalizedEmail,
    createdAt,
    expiresAt,
    lastSeenAt: createdAt,
  });

  await writeStore(SESSIONS_PATH, { sessions: activeSessions.slice(-10000) });
  return token;
}

export interface ValidSession {
  email: string;
  createdAt: string;
  expiresAt: string;
}

export async function validateAccessSession(
  token: string | undefined,
): Promise<ValidSession | null> {
  if (!token) {
    return null;
  }

  const tokenHash = hashAccessToken(token);
  const store = await readStore(SESSIONS_PATH, DEFAULT_SESSION_STORE);
  const sessions = pruneExpiredSessions(store.sessions);

  let validatedSession: ValidSession | null = null;
  const now = nowIso();

  const updatedSessions = sessions.map((session) => {
    if (session.tokenHash !== tokenHash) {
      return session;
    }

    validatedSession = {
      email: session.email,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    };

    return {
      ...session,
      lastSeenAt: now,
    };
  });

  await writeStore(SESSIONS_PATH, { sessions: updatedSessions });
  return validatedSession;
}

export async function revokeAccessSession(token: string | undefined): Promise<void> {
  if (!token) {
    return;
  }

  const tokenHash = hashAccessToken(token);
  const store = await readStore(SESSIONS_PATH, DEFAULT_SESSION_STORE);
  const sessions = pruneExpiredSessions(store.sessions).filter(
    (session) => session.tokenHash !== tokenHash,
  );
  await writeStore(SESSIONS_PATH, { sessions });
}

export async function saveAnalysis(
  email: string,
  analysis: BurnoutAnalysisResult,
): Promise<void> {
  const store = await readStore(ANALYSES_PATH, DEFAULT_ANALYSIS_STORE);
  const record: AnalysisRecord = {
    id: randomBytes(16).toString("hex"),
    email: normalizeEmail(email),
    repository: analysis.metrics.repository,
    provider: analysis.metrics.provider,
    score: analysis.score,
    riskLevel: analysis.riskLevel,
    confidence: analysis.confidence,
    createdAt: nowIso(),
    analysis,
  };

  store.analyses.unshift(record);
  store.analyses = store.analyses.slice(0, 1000);
  await writeStore(ANALYSES_PATH, store);
}

export async function listAnalysesForEmail(
  email: string,
  limit = 20,
): Promise<AnalysisRecord[]> {
  const normalizedEmail = normalizeEmail(email);
  const store = await readStore(ANALYSES_PATH, DEFAULT_ANALYSIS_STORE);
  return store.analyses
    .filter((analysis) => analysis.email === normalizedEmail)
    .slice(0, limit);
}
