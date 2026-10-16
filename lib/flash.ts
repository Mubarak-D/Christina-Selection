import "server-only";
import { cookies } from "next/headers";

// One-shot success message from a server action; the Toaster shows it after the next render
// and clears the cookie. Not httpOnly so the browser can clear it.
export async function flash(message: string) {
  (await cookies()).set("flash", JSON.stringify({ id: Date.now(), message }), { path: "/", maxAge: 30, sameSite: "lax" });
}
