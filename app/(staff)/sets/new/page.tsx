import { createClient } from "@/lib/supabase/server";
import { signedUrls } from "@/lib/public-set";
import { formatPrice } from "@/lib/format";
import { createSetAndOpen } from "../actions";

export default async function NewSetPage({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  const { customer } = await searchParams;
  const supabase = await createClient();
  const [{ data: customers }, { data: pieces }] = await Promise.all([
    supabase.from("customers").select("id,name,phone").order("name"),
    supabase.from("pieces").select("id,title,price,piece_media(path,kind,sort)")
      .eq("in_catalogue", true).order("created_at", { ascending: false }),
  ]);
  const thumbs = (pieces ?? []).map((p) =>
    p.piece_media.filter((m) => m.kind === "image").sort((a, b) => a.sort - b.sort)[0]?.path);
  const urls = await signedUrls(thumbs.filter((t): t is string => !!t));

  return (
    <>
      <h1 className="mb-4 text-2xl">New set</h1>
      <form action={createSetAndOpen} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">Customer
          <select name="customer_id" required defaultValue={customer ?? ""}>
            <option value="" disabled>Choose a customer</option>
            {customers?.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">Set title
          <input name="title" placeholder="e.g. Wedding rings" />
        </label>
        <fieldset>
          <legend className="mb-2">Pieces from the catalogue</legend>
          {!pieces?.length && <p className="text-sm text-muted">The catalogue is empty. You can add one-off pieces after creating the set.</p>}
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {pieces?.map((p, i) => (
              <li key={p.id}>
                <label className="flex cursor-pointer flex-col gap-1 rounded border p-2 has-[:checked]:border-black">
                  <div className="aspect-square overflow-hidden rounded bg-line/40">
                    {thumbs[i] && urls[thumbs[i]!] && (
                      // eslint-disable-next-line @next/next/no-img-element -- signed URLs expire; skip the image optimizer
                      <img src={urls[thumbs[i]!]} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <span className="flex items-center gap-2">
                    <input type="checkbox" name="piece" value={p.id} />
                    {p.title}
                  </span>
                  <span className="text-sm text-muted">{formatPrice(p.price)}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
        <button className="btn btn-primary">Create set</button>
      </form>
    </>
  );
}
