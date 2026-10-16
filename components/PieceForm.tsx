import { SubmitButton } from "./SubmitButton";

export type Piece = {
  id?: string; title?: string; price?: number | null; metal?: string | null; karat?: string | null;
  weight_g?: number | null; stones?: string | null; description?: string | null;
};

const field = "flex flex-col gap-1";
const input = "w-full";

// Shared by the catalogue (new/edit) and one-off pieces added while building a set.
export function PieceForm({
  action, piece = {}, inCatalogue = true, submitLabel = "Save piece", name,
}: {
  action: (fd: FormData) => void | Promise<void>; piece?: Piece; inCatalogue?: boolean; submitLabel?: string;
  name?: string;
}) {
  return (
    <form action={action} aria-label={name} className="grid gap-4 sm:grid-cols-2">
      <PieceFields piece={piece} inCatalogue={inCatalogue} />
      <SubmitButton className="btn btn-primary sm:col-span-2"
        pendingLabel={submitLabel === "Save piece" ? "Saving…" : "Adding…"}>{submitLabel}</SubmitButton>
    </form>
  );
}

// The piece's detail fields, shared with NewPieceForm.
export function PieceFields({ piece = {}, inCatalogue = true }: { piece?: Piece; inCatalogue?: boolean }) {
  return (
    <>
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
    </>
  );
}
