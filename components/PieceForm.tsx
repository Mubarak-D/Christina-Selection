type Piece = {
  id?: string; title?: string; price?: number | null; metal?: string | null; karat?: string | null;
  weight_g?: number | null; stones?: string | null; description?: string | null;
};

const field = "flex flex-col gap-1";
const input = "rounded border px-3 py-2";

// Shared by the catalogue (new/edit) and one-off pieces added while building a set.
export function PieceForm({
  action, piece = {}, inCatalogue = true, submitLabel = "Save piece",
}: {
  action: (fd: FormData) => void | Promise<void>; piece?: Piece; inCatalogue?: boolean; submitLabel?: string;
}) {
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {piece.id && <input type="hidden" name="id" value={piece.id} />}
      <input type="hidden" name="in_catalogue" value={String(inCatalogue)} />
      <label className={`${field} sm:col-span-2`}>Title
        <input name="title" required defaultValue={piece.title ?? ""} className={input} />
      </label>
      <label className={field}>Price
        <input name="price" type="number" step="0.01" min="0" inputMode="decimal" defaultValue={piece.price ?? ""} className={input} />
      </label>
      <label className={field}>Metal
        <input name="metal" placeholder="Gold, platinum…" defaultValue={piece.metal ?? ""} className={input} />
      </label>
      <label className={field}>Karat
        <input name="karat" placeholder="22K" defaultValue={piece.karat ?? ""} className={input} />
      </label>
      <label className={field}>Weight (g)
        <input name="weight_g" type="number" step="0.01" min="0" inputMode="decimal" defaultValue={piece.weight_g ?? ""} className={input} />
      </label>
      <label className={`${field} sm:col-span-2`}>Stones
        <input name="stones" placeholder="0.5ct diamond, 2 sapphires" defaultValue={piece.stones ?? ""} className={input} />
      </label>
      <label className={`${field} sm:col-span-2`}>Description
        <textarea name="description" rows={3} defaultValue={piece.description ?? ""} className={input} />
      </label>
      <button className="rounded bg-black px-4 py-2 text-white sm:col-span-2">{submitLabel}</button>
    </form>
  );
}
