import Link from "next/link";
import {
  AlarmClockCheck,
  ArrowRight,
  BrainCircuit,
  ChartColumnIncreasing,
  HeartPulse,
  ShieldAlert,
  Timer,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const problemPoints = [
  {
    title: "Burnout appears after damage is done",
    description:
      "Managers typically discover burnout after missed deadlines, resignations, or a major incident. By then, trust and throughput are already eroding.",
    icon: ShieldAlert,
  },
  {
    title: "Signals are hidden in engineering systems",
    description:
      "Late-night commit spikes, PR queue delays, and rushed code patterns are visible in Git activity, but almost never tracked as health indicators.",
    icon: Timer,
  },
  {
    title: "Attrition is expensive and preventable",
    description:
      "Replacing one senior engineer can exceed $125,000 in recruiting, onboarding, and opportunity cost. Early intervention is far cheaper.",
    icon: HeartPulse,
  },
];

const solutionPillars = [
  {
    title: "Repository Pattern Analysis",
    description:
      "Connect GitHub or GitLab and continuously score late-night commits, weekend load, PR cycle times, and review coverage.",
    icon: ChartColumnIncreasing,
  },
  {
    title: "Burnout Risk Scoring",
    description:
      "A weighted scoring model combines workload pressure and quality drift to produce a clear burnout risk level per team.",
    icon: BrainCircuit,
  },
  {
    title: "Manager Interventions",
    description:
      "Get concrete actions to reduce load, rebalance ownership, and stabilize delivery quality before burnout escalates.",
    icon: AlarmClockCheck,
  },
];

const faqs = [
  {
    question: "What data does Developer Burnout Tracker analyze?",
    answer:
      "We analyze commit timing, commit-message quality, PR throughput, and review responsiveness from connected repositories. We do not inspect private HR records, chat logs, or personal health data.",
  },
  {
    question: "Is this replacing 1:1 conversations with engineers?",
    answer:
      "No. This product is an early warning layer, not a replacement for leadership conversations. It helps managers spot risk patterns quickly and prioritize where to check in.",
  },
  {
    question: "Can we start with one team before rolling out company-wide?",
    answer:
      "Yes. Most customers start with one engineering team, validate the signal quality over 2-4 weeks, and then expand coverage across additional repos.",
  },
  {
    question: "How quickly can we get actionable insights?",
    answer:
      "You can connect a repo and generate your first burnout risk report in minutes. As data accumulates, trend confidence improves week over week.",
  },
];

export default function HomePage() {
  const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;

  return (
    <main className="min-h-screen">
      <section className="relative overflow-hidden px-6 pb-24 pt-16 md:px-10 lg:px-16">
        <div className="absolute inset-0 -z-10 grid-overlay opacity-25" />
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-12">
          <div className="reveal flex flex-col gap-6">
            <Badge variant="info" className="w-fit">
              Health Tracking for Engineering Teams
            </Badge>
            <h1 className="max-w-4xl text-4xl font-bold leading-tight md:text-6xl">
              Monitor team burnout through code patterns
            </h1>
            <p className="max-w-3xl text-lg leading-relaxed text-[#8b949e] md:text-xl">
              Developer Burnout Tracker detects early burnout indicators from real
              engineering behavior, including after-hours coding, review bottlenecks,
              and quality drift, so managers can intervene before top performers leave.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <a href={paymentLink} target="_blank" rel="noreferrer">
                <Button size="lg" className="w-full sm:w-auto">
                  Start Monitoring for $19/mo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
              <Link href="/dashboard">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  Open Dashboard
                </Button>
              </Link>
            </div>
            <p className="mono text-xs text-[#6e7681]">
              Hosted checkout via Stripe Payment Link. No custom payment form required.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {problemPoints.map((point) => (
              <Card key={point.title} className="glass-panel reveal">
                <CardHeader className="space-y-4">
                  <point.icon className="h-7 w-7 text-[#58a6ff]" />
                  <CardTitle>{point.title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {point.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#30363d] bg-[#0f141b]/70 px-6 py-20 md:px-10 lg:px-16">
        <div className="mx-auto grid w-full max-w-6xl gap-8 md:grid-cols-3">
          {solutionPillars.map((pillar) => (
            <Card key={pillar.title} className="glass-panel">
              <CardHeader className="space-y-4">
                <pillar.icon className="h-7 w-7 text-[#3fb950]" />
                <CardTitle>{pillar.title}</CardTitle>
                <CardDescription className="leading-relaxed">
                  {pillar.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="px-6 py-20 md:px-10 lg:px-16">
        <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[2fr_1fr]">
          <Card className="glass-panel">
            <CardHeader>
              <Badge variant="warning" className="mb-3 w-fit">
                Pricing
              </Badge>
              <CardTitle className="text-3xl">$19 per manager / month</CardTitle>
              <CardDescription className="max-w-2xl text-base leading-relaxed">
                One flat monthly plan for engineering leaders who want objective team
                health visibility without deploying invasive monitoring software.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 text-sm text-[#8b949e]">
              <p>
                Includes repository analytics, burnout scoring, alert prioritization, and
                manager intervention recommendations.
              </p>
              <p>
                Ideal for engineering managers, directors, and CTOs overseeing delivery
                pressure across fast-moving product teams.
              </p>
              <a href={paymentLink} target="_blank" rel="noreferrer">
                <Button size="lg">Subscribe with Stripe Checkout</Button>
              </a>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader>
              <Badge variant="success" className="mb-3 w-fit">
                Typical Outcome
              </Badge>
              <CardTitle>Intervene weeks earlier</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-[#8b949e]">
              <p>
                Teams using objective workload signals identify burnout risk before it
                appears in retention metrics.
              </p>
              <p>
                Earlier intervention improves sprint stability and reduces emergency
                staffing decisions.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="border-t border-[#30363d] px-6 py-20 md:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-4xl space-y-6">
          <h2 className="text-3xl font-bold">Frequently asked questions</h2>
          <div className="grid gap-4">
            {faqs.map((faq) => (
              <Card key={faq.question} className="glass-panel">
                <CardHeader>
                  <CardTitle className="text-lg">{faq.question}</CardTitle>
                  <CardDescription className="leading-relaxed text-[#8b949e]">
                    {faq.answer}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
