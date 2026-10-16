"use client";

import { useState } from "react";
import { markSent } from "@/app/(staff)/sets/actions";

export function SendOnWhatsApp({ setId, href, url }: { setId: string; href: string; url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <a href={href} target="_blank" rel="noopener noreferrer" onClick={() => markSent(setId)}
        className="rounded bg-green-700 px-4 py-2 text-white">
        Send on WhatsApp
      </a>
      <button type="button" className="underline" onClick={async () => {
        await navigator.clipboard.writeText(url);
        markSent(setId);
        setCopied(true);
      }}>
        {copied ? "Link copied" : "Copy link"}
      </button>
    </div>
  );
}
