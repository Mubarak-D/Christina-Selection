"use client";

import { useState } from "react";

// Stamps the print first (so later edits become a new revision), then opens the print dialog.
export function PrintButton({ markPrinted }: { markPrinted: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" className="btn btn-primary print:hidden" disabled={busy} aria-busy={busy}
      onClick={async () => {
        setBusy(true);
        try { await markPrinted(); } finally { setBusy(false); }
        window.print();
      }}>
      {busy ? "Preparing…" : "Print"}
    </button>
  );
}
