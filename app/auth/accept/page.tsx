"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

// Landing page for Supabase's default invite email: the session arrives in the URL
// fragment (#access_token=…), which only the browser can read.
export default function AcceptInvitePage() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    history.replaceState(null, "", window.location.pathname); // don't leave tokens in the address bar
    if (!access_token || !refresh_token) {
      setFailed(true);
      return;
    }
    createBrowserClient().auth.setSession({ access_token, refresh_token }).then(({ error }) => {
      if (error) setFailed(true);
      else router.replace("/account/password");
    });
  }, [router]);

  return (
    <main className="mx-auto mt-24 w-full max-w-sm px-6 text-center">
      <p className="wordmark mb-16">Christina Jewellers</p>
      {failed ? (
        <>
          <h1 className="display text-[1.75rem]">This invite link has expired</h1>
          <p className="mt-4 text-muted">Ask the shop to send you a new invite.</p>
        </>
      ) : (
        <p className="text-muted">Signing you in…</p>
      )}
    </main>
  );
}
