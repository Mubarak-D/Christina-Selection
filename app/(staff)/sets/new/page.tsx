import { BackLink } from "@/components/BackLink";
import { createClient } from "@/lib/supabase/server";
import { signedUrls } from "@/lib/public-set";
import { PieceThumb, thumbOf } from "@/components/PieceThumb";
import { formatPrice } from "@/lib/format";
import { SubmitButton } from "@/components/SubmitButton";
import { createSetAndOpen } from "../actions";

export default async function NewSetPage({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  const { customer } = await searchParams;
  const supabase = await createClient();
  const [{ data: customers }, { data: pieces }] = await Promise.all([
    supabase.from("customers").select("id,name,phone,email").order("name"),
    supabase.from("pieces").select("id,title,price,piece_media(path,kind,sort)")
      .eq("in_catalogue", true).order("created_at", { ascending: false }),
  ]);
  const thumbs = (pieces ?? []).map((p) => thumbOf(p.piece_media));
  const urls = await signedUrls(thumbs.flatMap((t) => (t ? [t.path] : [])));

  return (
    <>
      <BackLink href={customer ? `/customers/${customer}` : "/"} label="Back" />
      <h1 className="mb-4 text-2xl">New set</h1>
      <form action={createSetAndOpen} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">Customer
          <select name="customer_id" required defaultValue={customer ?? ""}>
            <option value="" disabled>Choose a customer</option>
            {customers?.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.phone ?? c.email})</option>)}
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
                    <PieceThumb media={thumbs[i]} url={thumbs[i] && urls[thumbs[i]!.path]} />
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
        <SubmitButton pendingLabel="Creating set…">Create set</SubmitButton>
      </form>
    </>
  );
}
