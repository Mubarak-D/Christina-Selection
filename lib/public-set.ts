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
