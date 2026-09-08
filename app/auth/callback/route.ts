import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.user) {
      const email = data.user.email ?? "";
      // Strict institutional domain check: must end with @iitbbs.ac.in
      if (!email.toLowerCase().endsWith("@iitbbs.ac.in")) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=unauthorized_domain`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return to login with error if OAuth exchange failed
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
