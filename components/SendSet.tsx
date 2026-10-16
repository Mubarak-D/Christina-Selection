"use client";

import { useState } from "react";
import { markSent } from "@/app/(staff)/sets/actions";
import { toast } from "./Toaster";

// Send buttons for whichever contact the customer has; any of them marks the set as sent.
export function SendSet({ setId, url, whatsappHref, emailHref }: {
  setId: string; url: string; whatsappHref: string | null; emailHref: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const sent = () => {
    markSent(setId);
    toast("Marked as sent");
  };
  return (
    <div className="flex flex-wrap items-center gap-3">
      {whatsappHref && (
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" onClick={sent} className="btn btn-primary">
          Send on WhatsApp
        </a>
      )}
      {emailHref && (
        <a href={emailHref} onClick={sent} className={`btn ${whatsappHref ? "btn-outline" : "btn-primary"}`}>
          Send by email
        </a>
      )}
      <button type="button" className="underline" onClick={async () => {
        await navigator.clipboard.writeText(url);
        markSent(setId);
        toast("Link copied");
        setCopied(true);
      }}>
        {copied ? "Link copied" : "Copy link"}
      </button>
    </div>
  );
}
