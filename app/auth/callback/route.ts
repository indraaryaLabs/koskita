import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!url || !anon) {
    return NextResponse.redirect(`${origin}/login?err=setup`);
  }

  const response = NextResponse.redirect(`${origin}${next.startsWith("http") ? "/" : next}`);

  try {
    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (tocookie: { name: string; value: string; options?: Record<string, unknown> }[]) => {
          for (const { name, value, options } of tocookie) {
            response.cookies.set(name, value, options);
          }
        },
      },
    });
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        return NextResponse.redirect(`${origin}/login?err=auth`);
      }
    }
  } catch {
    return NextResponse.redirect(`${origin}/login?err=auth`);
  }

  return response;
}
