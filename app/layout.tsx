import type { Metadata } from "next";
import { Cormorant, Montserrat } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant({ variable: "--font-cormorant", subsets: ["latin"], weight: ["400", "500"] });
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "Christina Jewellers",
  description: "Selections from Christina Jewellers",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${cormorant.variable} ${montserrat.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
