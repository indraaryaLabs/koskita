import { NextResponse, type NextRequest } from "next/server";
import { sbAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORIES = ["kamar", "listrik", "air", "pintu_jendela", "kamar_mandi", "lainnya"];

/** Laporan kerusakan dari portal (token divalidasi lewat RPC security definer). */
export async function POST(req: NextRequest, route: { params: Promise<{ token: string }> }) {
  const { token } = await route.params;
  const admin = sbAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "Belum terpasang." }, { status: 500 });

  let body: { category?: string; description?: string; photo_path?: string | null };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Data tidak valid." }, { status: 400 });
  }

  const { category, description, photo_path } = body;
  if (!CATEGORIES.includes(category ?? "") || !description?.trim()) {
    return NextResponse.json({ ok: false, error: "Isi jenis dan deskripsi kerusakan." }, { status: 400 });
  }

  const { data: id, error } = await admin.rpc("portal_insert_ticket", {
    p_token: token,
    p_category: category,
    p_description: description.trim().slice(0, 1000),
    p_photo_path: photo_path ?? null,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: "Gagal menyimpan laporan." }, { status: 400 });
  }
  return NextResponse.json({ ok: true, ticket_id: id });
}
