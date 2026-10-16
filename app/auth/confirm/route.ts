import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Target of invite and password-reset emails: exchanges the token for a session,
// then sends the staff member to set their password.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const token_hash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const to = request.nextUrl.clone();
  to.search = "";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      to.pathname = "/account/password";
      return NextResponse.redirect(to);
    }
  }
  to.pathname = "/login";
  return NextResponse.redirect(to);
}
