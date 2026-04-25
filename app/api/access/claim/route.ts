import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createAccessSession,
  hasPurchaseForEmail,
  validateAccessSession,
} from "@/lib/database";
import { ACCESS_COOKIE_NAME, accessCookieOptions } from "@/lib/lemon-squeezy";

const requestSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const payload = requestSchema.parse(await request.json());

    const purchaseExists = await hasPurchaseForEmail(payload.email);
    if (!purchaseExists) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No completed subscription was found for this email yet. Wait for webhook processing and try again.",
        },
        { status: 403 },
      );
    }

    const token = await createAccessSession(payload.email, 30);
    const response = NextResponse.json({
      success: true,
      message: "Access confirmed. Redirecting to your dashboard.",
    });

    response.cookies.set(ACCESS_COOKIE_NAME, token, accessCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Please provide a valid email address.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, message: "Could not claim access right now." },
      { status: 500 },
    );
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  const cookieHeader = request.headers.get("cookie");
  const token = cookieHeader
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${ACCESS_COOKIE_NAME}=`))
    ?.split("=")
    .slice(1)
    .join("=");

  const session = await validateAccessSession(token);
  return NextResponse.json({ authenticated: Boolean(session), email: session?.email ?? null });
}
