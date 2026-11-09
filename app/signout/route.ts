import { NextResponse, type NextRequest } from "next/server";
import { sb } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const client = await sb();
  if (!client) return NextResponse.redirect(new URL("/login", req.url));
  await client.auth.signOut();
  return NextResponse.redirect(new URL("/", req.url));
}
