import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicSet } from "@/lib/public-set";
import { SelectionForm } from "./SelectionForm";

export const metadata: Metadata = {
  title: "Your selection | Christina Jewellers",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function CustomerSetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const set = await getPublicSet(token);
  if (!set) notFound();
  return <SelectionForm token={token} set={set} />;
}
