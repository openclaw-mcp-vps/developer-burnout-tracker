import { NextResponse } from "next/server";

import { recordPurchase } from "@/lib/database";
import {
  extractCustomerEmail,
  parseStripeEvent,
  verifyStripeWebhookSignature,
} from "@/lib/lemon-squeezy";

export const runtime = "nodejs";

const PURCHASE_EVENT_TYPES = new Set([
  "checkout.session.completed",
  "invoice.paid",
  "customer.subscription.created",
  "customer.subscription.updated",
]);

export async function POST(request: Request): Promise<NextResponse> {
  const rawPayload = await request.text();
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (secret && !verifyStripeWebhookSignature(rawPayload, signature, secret)) {
    return NextResponse.json({ message: "Invalid Stripe signature." }, { status: 400 });
  }

  try {
    const event = parseStripeEvent(rawPayload);

    if (!PURCHASE_EVENT_TYPES.has(event.type)) {
      return NextResponse.json({ received: true, ignored: true });
    }

    const email = extractCustomerEmail(event);
    if (!email) {
      return NextResponse.json(
        {
          received: true,
          ignored: true,
          message: "No customer email found in event payload.",
        },
        { status: 200 },
      );
    }

    await recordPurchase({
      email,
      sessionId: event.data.object.id ?? event.id,
      source: "stripe",
      createdAt: new Date().toISOString(),
      rawEventType: event.type,
    });

    return NextResponse.json({ received: true, email });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook payload.";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    ok: true,
    message:
      "This endpoint is named for legacy Lemon Squeezy routing but currently processes Stripe webhook events.",
  });
}
