import { createHmac, timingSafeEqual } from "node:crypto";

export const ACCESS_COOKIE_NAME = "burnout_access";

export interface StripeEventObject {
  id?: string;
  object?: string;
  customer_email?: string;
  customer_details?: {
    email?: string | null;
  };
  metadata?: {
    email?: string;
  };
}

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: StripeEventObject;
  };
}

function secureCompareHex(expectedHex: string, actualHex: string): boolean {
  const expected = Buffer.from(expectedHex, "hex");
  const actual = Buffer.from(actualHex, "hex");

  if (expected.length !== actual.length || expected.length === 0) {
    return false;
  }

  return timingSafeEqual(expected, actual);
}

export function verifyStripeWebhookSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader) {
    return false;
  }

  const parts = signatureHeader.split(",").map((part) => part.trim());
  const timestampPart = parts.find((part) => part.startsWith("t="));
  const signatureParts = parts.filter((part) => part.startsWith("v1="));

  if (!timestampPart || signatureParts.length === 0) {
    return false;
  }

  const timestamp = timestampPart.replace("t=", "");
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const parsedTimestamp = Number(timestamp);

  if (Number.isNaN(parsedTimestamp)) {
    return false;
  }

  // Reject payloads older than five minutes.
  if (Math.abs(nowInSeconds - parsedTimestamp) > 300) {
    return false;
  }

  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  return signatureParts.some((part) =>
    secureCompareHex(expectedSignature, part.replace("v1=", "")),
  );
}

export function parseStripeEvent(payload: string): StripeWebhookEvent {
  return JSON.parse(payload) as StripeWebhookEvent;
}

export function extractCustomerEmail(event: StripeWebhookEvent): string | null {
  const candidate =
    event.data.object.customer_details?.email ??
    event.data.object.customer_email ??
    event.data.object.metadata?.email ??
    null;

  if (!candidate) {
    return null;
  }

  const normalized = candidate.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function accessCookieOptions(maxAgeSeconds = 60 * 60 * 24 * 30): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
