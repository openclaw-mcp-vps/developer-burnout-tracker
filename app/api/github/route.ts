import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

import { analyzeRepositoryActivity } from "@/lib/github-analyzer";
import { validateAccessSession } from "@/lib/database";
import { ACCESS_COOKIE_NAME } from "@/lib/lemon-squeezy";

const requestSchema = z.object({
  provider: z.enum(["github", "gitlab"]).default("github"),
  owner: z.string().min(1),
  repo: z.string().min(1),
  token: z.string().optional(),
  sinceDays: z.coerce.number().int().min(7).max(365).default(30),
});

export async function POST(request: Request): Promise<NextResponse> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  const session = await validateAccessSession(token);

  if (!session) {
    return NextResponse.json(
      { message: "Paid access required." },
      { status: 401 },
    );
  }

  try {
    const payload = requestSchema.parse(await request.json());
    const metrics = await analyzeRepositoryActivity(payload);

    return NextResponse.json({
      metrics,
      authenticatedEmail: session.email,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid request body.", errors: error.issues },
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : "Could not analyze repository.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
