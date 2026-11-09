import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

type CookieList = { name: string; value: string; options?: Record<string, unknown> }[];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anon) {
    try {
      const supabase = createServerClient(url, anon, {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet: CookieList) => {
            for (const { name, value, options } of cookiesToSet) {
              try {
                request.cookies.set(name, value);
              } catch {
                /* diabaikan di middleware */
              }
              supabaseResponse.cookies.set(name, value, options);
            }
          },
        },
      });

      await supabase.auth.getUser();
    } catch {
      /* env belum diisi — halaman akan menampilkan panduan setup */
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/portal|auth/callback|portal|design|api/pdf).*)",
  ],
};
