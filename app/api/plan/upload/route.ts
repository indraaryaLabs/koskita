import { NextResponse, type NextRequest } from "next/server";
import { sbAdmin, getOwnerContext } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX = 5 * 1024 * 1024;
const ALLOWED = /^image\/(png|jpe?g|webp)$|^application\/pdf$/;

/** Unggah bukti langganan oleh pemilik yang login — path ditentukan server. */
export async function POST(req: NextRequest) {
  const ctx = await getOwnerContext();
  const admin = sbAdmin();
  if (!ctx?.org || !admin) {
    return NextResponse.json({ ok: false, error: "Silakan login." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Kirim sebagai form-data." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "File tidak ditemukan." }, { status: 400 });
  }
  if (file.size > MAX) {
    return NextResponse.json({ ok: false, error: "Ukuran maksimal 5 MB." }, { status: 400 });
  }
  if (!ALLOWED.test(file.type)) {
    return NextResponse.json({ ok: false, error: "Hanya JPG, PNG, WebP, atau PDF." }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const ext = file.type === "application/pdf" ? "pdf" : "jpg";
  const path = `${ctx.org.orgId}/plan-proofs/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await admin.storage.from("private-files").upload(path, bytes, { contentType: file.type });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, path });
}
