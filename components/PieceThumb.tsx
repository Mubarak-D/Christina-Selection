type Media = { path: string; kind: string; sort: number };

// The tile shown for a piece: its first photo, or its video's first frame if it only has video.
export function thumbOf(media: Media[]): Media | undefined {
  const sorted = [...media].sort((a, b) => a.sort - b.sort);
  return sorted.find((m) => m.kind === "image") ?? sorted.find((m) => m.kind === "video");
}

export function PieceThumb({ media, url }: { media?: Media; url?: string }) {
  if (!media || !url) return null;
  return media.kind === "video" ? (
    // #t=0.1 asks the browser for a frame just after the start, so the tile isn't black.
    <video src={`${url}#t=0.1`} muted playsInline preload="metadata" aria-hidden className="h-full w-full object-cover" />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element -- signed URLs expire; skip the image optimizer
    <img src={url} alt="" className="h-full w-full object-cover" />
  );
}
