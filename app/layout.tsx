import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";

import "@/app/globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://developer-burnout-tracker.com"),
  title: {
    default: "Developer Burnout Tracker | Monitor Team Burnout Through Code Patterns",
    template: "%s | Developer Burnout Tracker",
  },
  description:
    "Detect burnout early with objective engineering signals: late-night commits, review delays, and quality drift. Help managers prevent costly attrition before it starts.",
  keywords: [
    "developer burnout",
    "engineering management",
    "team health analytics",
    "github analytics",
    "burnout detection",
  ],
  openGraph: {
    title: "Developer Burnout Tracker",
    description:
      "Monitor code patterns and PR signals to catch burnout risk early and act before attrition hits.",
    url: "https://developer-burnout-tracker.com",
    siteName: "Developer Burnout Tracker",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Developer Burnout Tracker",
    description:
      "Objective burnout detection for engineering teams through commit and review intelligence.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
