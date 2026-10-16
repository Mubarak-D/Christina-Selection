import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signedUrls } from "@/lib/public-set";
import { PieceForm } from "@/components/PieceForm";
import { MediaUploader } from "@/components/MediaUploader";
import { deleteMedia, savePiece } from "../actions";

export default async function PiecePage({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ set?: string }> }) {
  const { id } = await params;
  const { set } = await searchParams;
  const supabase = await createClient();
  const { data: piece } = await supabase
    .from("pieces").select("*,piece_media(id,path,kind,sort)").eq("id", id).maybeSingle();
  if (!piece) notFound();

  const media = [...piece.piece_media].sort((a, b) => a.sort - b.sort);
  const urls = await signedUrls(media.map((m) => m.path));

  async function save(fd: FormData) {
    "use server";
    await savePiece(fd);
  }

  return (
    <>
      {set && <Link href={`/sets/${set}`} className="mb-4 inline-block underline">Back to set</Link>}
      <h1 className="mb-4 text-2xl">{piece.title}</h1>
      <PieceForm action={save} piece={piece} inCatalogue={piece.in_catalogue} />

      <h2 className="mb-2 mt-8 text-xl">Photos & videos</h2>
      <ul aria-label="Media" className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {media.map((m) => (
          <li key={m.id} className="flex flex-col gap-1">
            {m.kind === "video" ? (
              <video src={urls[m.path]} controls playsInline preload="metadata" className="aspect-square w-full rounded bg-black object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- signed URLs expire; skip the image optimizer
              <img src={urls[m.path]} alt={piece.title} className="aspect-square w-full rounded object-cover" />
            )}
            <form action={deleteMedia.bind(null, m.id)}>
              <button className="text-sm text-red-700">Remove</button>
            </form>
          </li>
        ))}
      </ul>
      <MediaUploader pieceId={piece.id} nextSort={media.length} />
    </>
  );
}
