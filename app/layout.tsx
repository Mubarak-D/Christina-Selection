import type { Metadata } from "next";
import { Cormorant, Montserrat } from "next/font/google";
import { Suspense } from "react";
import { NavProgress } from "@/components/NavProgress";
import "./globals.css";

const cormorant = Cormorant({ variable: "--font-cormorant", subsets: ["latin"], weight: ["400", "500"] });
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"], weight: ["400", "500"] });

// Every page renders per request so Next.js can stamp each response's CSP nonce on its scripts
// (see proxy.ts). Nearly all pages are per-user anyway.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Christina Jewellers",
  description: "Selections from Christina Jewellers",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${cormorant.variable} ${montserrat.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {/* useSearchParams needs a Suspense boundary */}
        <Suspense fallback={null}><NavProgress /></Suspense>
        {children}
      </body>
    </html>
  );
}
