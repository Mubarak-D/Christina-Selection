import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signedUrls } from "@/lib/public-set";
import { PieceThumb, thumbOf } from "@/components/PieceThumb";
import { formatPrice } from "@/lib/format";

export default async function CataloguePage() {
  const supabase = await createClient();
  const { data: pieces } = await supabase
    .from("pieces")
    .select("id,title,price,piece_media(path,kind,sort)")
    .eq("in_catalogue", true)
    .order("created_at", { ascending: false });

  const thumbs = (pieces ?? []).map((p) => thumbOf(p.piece_media));
  const urls = await signedUrls(thumbs.flatMap((t) => (t ? [t.path] : [])));

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl">Catalogue</h1>
        <Link href="/catalogue/new" className="btn btn-primary">Add piece</Link>
      </div>
      {!pieces?.length && <p>No pieces yet.</p>}
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {pieces?.map((p, i) => (
          <li key={p.id}>
            <Link href={`/catalogue/${p.id}`} className="block">
              <div className="aspect-square overflow-hidden rounded bg-line/40">
                <PieceThumb media={thumbs[i]} url={thumbs[i] && urls[thumbs[i]!.path]} />
              </div>
              <span className="mt-1 block">{p.title}</span>
              <span className="block text-sm text-muted">{formatPrice(p.price)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
