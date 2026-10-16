import { BackLink } from "@/components/BackLink";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signedUrls } from "@/lib/public-set";
import { PieceForm } from "@/components/PieceForm";
import { MediaUploader } from "@/components/MediaUploader";
import { SubmitButton } from "@/components/SubmitButton";
import { PreviewTile, type ViewerItem } from "@/components/MediaViewer";
import { deleteMedia, deletePiece, savePiece } from "../actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { flash } from "@/lib/flash";

export default async function PiecePage({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ set?: string }> }) {
  const { id } = await params;
  const { set } = await searchParams;
  const supabase = await createClient();
  const [{ data: piece }, { count: inSets }] = await Promise.all([
    supabase.from("pieces").select("*,piece_media(id,path,kind,sort)").eq("id", id).maybeSingle(),
    supabase.from("set_items").select("*", { count: "exact", head: true }).eq("piece_id", id),
  ]);
  if (!piece) notFound();

  const media = [...piece.piece_media].sort((a, b) => a.sort - b.sort);
  const urls = await signedUrls(media.map((m) => m.path));
  const items: ViewerItem[] = media.filter((m) => urls[m.path])
    .map((m) => ({ kind: m.kind as ViewerItem["kind"], url: urls[m.path] }));

  async function save(fd: FormData) {
    "use server";
    await savePiece(fd);
    await flash("Piece saved");
  }

  return (
    <>
      {set ? <BackLink href={`/sets/${set}`} label="Back to set" /> : <BackLink href="/catalogue" label="Catalogue" />}
      <h1 className="mb-4 text-2xl">{piece.title}</h1>
      <PieceForm action={save} piece={piece} inCatalogue={piece.in_catalogue} />

      <h2 className="mb-2 mt-8 text-xl">Photos & videos</h2>
      <ul aria-label="Media" className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {media.map((m, i) => (
          <li key={m.id} className="flex flex-col gap-1">
            <PreviewTile items={items} title={piece.title} index={i}>
              {m.kind === "video" ? (
                <video src={urls[m.path]} muted playsInline preload="metadata" className="aspect-square w-full rounded bg-ink object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- signed URLs expire; skip the image optimizer
                <img src={urls[m.path]} alt={piece.title} className="aspect-square w-full rounded object-cover" />
              )}
            </PreviewTile>
            <form action={deleteMedia.bind(null, m.id)}>
              <SubmitButton className="text-sm text-danger" pendingLabel="Removing…">Remove</SubmitButton>
            </form>
          </li>
        ))}
      </ul>
      <MediaUploader pieceId={piece.id} nextSort={media.length} />

      <div className="mt-12 border-t border-line pt-6">
        <ConfirmButton action={deletePiece.bind(null, piece.id, set ? `/sets/${set}` : "/catalogue")} label="Delete piece"
          title={`Delete ${piece.title}?`}
          message={`Its photos and videos are deleted too.${inSets ? ` It will be removed from ${inSets} ${inSets === 1 ? "set" : "sets"}.` : ""} This can't be undone.`} />
      </div>
    </>
  );
}
