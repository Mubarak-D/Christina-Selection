import "server-only";
import { createServiceClient } from "./supabase/service";

const TTL_SECONDS = 3600;

// Short-lived URLs for objects in the private "media" bucket, keyed by path.
export async function signedUrls(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data, error } = await createServiceClient().storage.from("media").createSignedUrls(paths, TTL_SECONDS);
  if (error) throw error;
  const urls: Record<string, string> = {};
  for (const d of data) if (d.path && d.signedUrl) urls[d.path] = d.signedUrl;
  return urls;
}

export type PublicItem = {
  pieceId: string; title: string; price: number | null; metal: string | null; karat: string | null;
  weightG: number | null; stones: string | null; description: string | null;
  status: "pending" | "chosen" | "dismissed";
  media: { kind: "image" | "video"; url: string }[];
};
export type PublicSet = {
  title: string | null; firstName: string; submitted: boolean; locked: boolean; items: PublicItem[];
};

const TOKEN = /^[A-Za-z0-9_-]{32}$/;

// Everything the customer page may see, and nothing else: no phone, notes or other sets.
export async function getPublicSet(token: string): Promise<PublicSet | null> {
  if (!TOKEN.test(token)) return null;
  const { data: set } = await createServiceClient()
    .from("selection_sets")
    .select(`title, submitted_at, handled_at, customers(name),
      set_items(status, pieces(id, title, price, metal, karat, weight_g, stones, description, piece_media(path, kind, sort)))`)
    .eq("token", token)
    .maybeSingle();
  if (!set || !set.customers) return null;

  const pieces = set.set_items.filter((i) => i.pieces);
  const paths = pieces.flatMap((i) => i.pieces!.piece_media.map((m) => m.path));
  const urls = await signedUrls(paths);

  return {
    title: set.title,
    firstName: set.customers.name.split(/\s+/)[0],
    submitted: !!set.submitted_at,
    locked: !!set.handled_at,
    items: pieces
      .map(({ status, pieces: p }) => ({
        pieceId: p!.id, title: p!.title, price: p!.price, metal: p!.metal, karat: p!.karat,
        weightG: p!.weight_g, stones: p!.stones, description: p!.description,
        status: status as PublicItem["status"],
        media: [...p!.piece_media].sort((a, b) => a.sort - b.sort)
          .filter((m) => urls[m.path])
          .map((m) => ({ kind: m.kind as "image" | "video", url: urls[m.path] })),
      }))
      .sort((a, b) => a.title.localeCompare(b.title)),
  };
}
