import { NextResponse, type NextRequest } from "next/server";
import { sb } from "@/lib/supabase";

/** Daftar kamar milik organisasi pemilik (RLS melindungi). */
export async function GET(_req: NextRequest) {
  const client = await sb();
  if (!client) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 500 });
  }
  const { data, error } = await client
    .from("rooms")
    .select("id, name, price_idr")
    .order("name");

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, rooms: (data as { id: string; name: string; price_idr: number }[]) ?? [] });
}
