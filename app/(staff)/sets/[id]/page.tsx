import { BackLink } from "@/components/BackLink";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signedUrls } from "@/lib/public-set";
import { formatPrice } from "@/lib/format";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { buildEmailLink } from "@/lib/email";
import { SITE_URL } from "@/lib/config";
import { NewPieceForm } from "@/components/NewPieceForm";
import { SendSet } from "@/components/SendSet";
import { SubmitButton } from "@/components/SubmitButton";
import { PreviewTile, type ViewerItem } from "@/components/MediaViewer";
import { addOneOff, markHandled, markSeen, reopen } from "../actions";

const ORDER = { chosen: 0, pending: 1, dismissed: 2 } as const;

export default async function SetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await markSeen(id);
  const supabase = await createClient();
  const { data: set } = await supabase
    .from("selection_sets")
    .select("*, customers(id,name,phone,email), set_items(status, pieces(id,title,price,piece_media(path,kind,sort)))")
    .eq("id", id)
    .maybeSingle();
  if (!set || !set.customers) notFound();

  const customer = set.customers;
  const items = [...set.set_items].sort(
    (a, b) => ORDER[a.status as keyof typeof ORDER] - ORDER[b.status as keyof typeof ORDER]);
  const urls = await signedUrls(items.flatMap((i) => i.pieces?.piece_media.map((m) => m.path) ?? []));
  // Every photo/video per piece, in order, for the full-screen preview; the tile shows the first photo.
  const viewer = items.map((i): ViewerItem[] =>
    [...(i.pieces?.piece_media ?? [])].sort((a, b) => a.sort - b.sort).filter((m) => urls[m.path])
      .map((m) => ({ kind: m.kind as ViewerItem["kind"], url: urls[m.path] })));
  const thumbIndex = viewer.map((v) => Math.max(0, v.findIndex((m) => m.kind === "image")));

  const link = `${SITE_URL}/s/${set.token}`;
  const firstName = customer.name.split(/\s+/)[0];
  const status = set.handled_at ? "Handled" : set.submitted_at ? "Customer has chosen" : set.sent_at ? "Waiting for customer" : "Not sent yet";

  return (
    <>
      <BackLink href={`/customers/${customer.id}`} label={customer.name} />
      <p className="mb-1 text-sm text-muted">{status}</p>
      <h1 className="mb-4 text-2xl">{set.title || "Selection"}</h1>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <SendSet setId={set.id} url={link}
          whatsappHref={customer.phone ? buildWhatsAppLink(customer.phone, link, firstName) : null}
          emailHref={customer.email ? buildEmailLink(customer.email, link, firstName) : null} />
        <form action={(set.handled_at ? reopen : markHandled).bind(null, set.id)}>
          <SubmitButton className="btn btn-outline" pendingLabel="Saving…">{set.handled_at ? "Reopen" : "Mark handled"}</SubmitButton>
        </form>
      </div>

      <ul className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item, i) => item.pieces && (
          <li key={item.pieces.id}>
            <div className={`aspect-square overflow-hidden rounded bg-line/40 ${item.status === "chosen" ? "ring-4 ring-gold" : ""} ${item.status === "dismissed" ? "opacity-40 grayscale" : ""}`}>
              {viewer[i].length > 0 && (
                <PreviewTile items={viewer[i]} title={item.pieces.title} index={thumbIndex[i]} className="h-full">
                  {viewer[i][thumbIndex[i]].kind === "video" ? (
                    <video src={viewer[i][thumbIndex[i]].url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- signed URLs expire; skip the image optimizer
                    <img src={viewer[i][thumbIndex[i]].url} alt={item.pieces.title} className="h-full w-full object-cover" />
                  )}
                </PreviewTile>
              )}
            </div>
            <Link href={`/catalogue/${item.pieces.id}?set=${set.id}`} className="block">
              <span className="mt-1 block underline-offset-4 hover:underline">{item.pieces.title}</span>
              <span className="block text-sm text-muted">
                {formatPrice(item.pieces.price)}
                {item.status === "chosen" && <span className="text-gold-ink"> · Chosen</span>}
                {item.status === "dismissed" && " · Set aside"}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <details className="rounded-lg border border-line bg-pearl p-4">
        <summary className="cursor-pointer">Add a one-off piece to this set</summary>
        <p className="my-3 text-sm text-muted">It won&apos;t appear in the catalogue.</p>
        <NewPieceForm save={addOneOff.bind(null, set.id)} destination={`/sets/${set.id}`} inCatalogue={false}
          name="Add one-off piece" submitLabel="Add one-off piece" />
      </details>
    </>
  );
}
