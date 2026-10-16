import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signedUrls } from "@/lib/public-set";
import { formatPrice } from "@/lib/format";

export default async function CataloguePage() {
  const supabase = await createClient();
  const { data: pieces } = await supabase
    .from("pieces")
    .select("id,title,price,piece_media(path,kind,sort)")
    .eq("in_catalogue", true)
    .order("created_at", { ascending: false });

  const thumbs = (pieces ?? []).map((p) =>
    p.piece_media.filter((m) => m.kind === "image").sort((a, b) => a.sort - b.sort)[0]?.path);
  const urls = await signedUrls(thumbs.filter((t): t is string => !!t));

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl">Catalogue</h1>
        <Link href="/catalogue/new" className="rounded bg-black px-4 py-2 text-white">Add piece</Link>
      </div>
      {!pieces?.length && <p>No pieces yet.</p>}
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {pieces?.map((p, i) => (
          <li key={p.id}>
            <Link href={`/catalogue/${p.id}`} className="block">
              <div className="aspect-square overflow-hidden rounded bg-neutral-100">
                {thumbs[i] && urls[thumbs[i]!] && (
                  // eslint-disable-next-line @next/next/no-img-element -- signed URLs expire; skip the image optimizer
                  <img src={urls[thumbs[i]!]} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <span className="mt-1 block">{p.title}</span>
              <span className="block text-sm opacity-70">{formatPrice(p.price)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
