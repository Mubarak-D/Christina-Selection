// Storage path for a new upload. Random name; the extension is reduced to a safe token
// so a crafted filename can't add path segments.
export function mediaPath(pieceId: string, fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  const ext = dot > 0 ? fileName.slice(dot + 1).toLowerCase() : "";
  return `${pieceId}/${crypto.randomUUID()}.${/^[a-z0-9]{1,5}$/.test(ext) ? ext : "bin"}`;
}
