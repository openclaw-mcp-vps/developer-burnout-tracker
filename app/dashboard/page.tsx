import Link from "next/link";
import { cookies } from "next/headers";

import { AccessClaimForm } from "@/components/AccessClaimForm";
import { DashboardClient } from "@/components/DashboardClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listAnalysesForEmail, validateAccessSession } from "@/lib/database";
import { ACCESS_COOKIE_NAME } from "@/lib/lemon-squeezy";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  const session = await validateAccessSession(accessToken);
  const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;

  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-16">
        <Card className="glass-panel w-full">
          <CardHeader className="space-y-4">
            <Badge variant="warning" className="w-fit">
              Subscription Required
            </Badge>
            <CardTitle className="text-3xl">Unlock the burnout dashboard</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              The analytics engine is paywalled. Subscribe via Stripe Checkout, then
              verify the same purchase email to receive a secure access cookie.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <a href={paymentLink} target="_blank" rel="noreferrer">
                <Button className="w-full">Buy for $19/mo</Button>
              </a>
              <Link href="/">
                <Button variant="secondary" className="w-full">
                  Back to Landing Page
                </Button>
              </Link>
            </div>
            <div className="space-y-3 rounded-lg border border-[#30363d] bg-[#0d1117] p-4">
              <p className="text-sm font-medium text-[#f0f6fc]">
                Purchased already? Verify access below.
              </p>
              <AccessClaimForm />
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  const analysisHistory = await listAnalysesForEmail(session.email, 8);

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl space-y-8 px-6 py-12 md:px-10 lg:px-12">
      <div className="space-y-3">
        <Badge variant="info" className="w-fit">
          Burnout Intelligence Dashboard
        </Badge>
        <h1 className="text-4xl font-bold">Engineering Team Health Command Center</h1>
        <p className="max-w-3xl text-[#8b949e]">
          Detect rising burnout risk from code delivery behavior before it becomes
          attrition, incidents, or sustained team fatigue.
        </p>
      </div>

      <DashboardClient
        userEmail={session.email}
        initialAnalyses={analysisHistory.map((record) => record.analysis)}
      />
    </main>
  );
}
