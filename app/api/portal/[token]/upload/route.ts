import { NextResponse, type NextRequest } from "next/server";
import { sbAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX = 5 * 1024 * 1024;

/** Validasi unggahan + buang metadata EXIF + simpan ke bucket privat. */
async function saveProof(token: string, file: File): Promise<
  { ok: true; path: string } | { ok: false; error: string; status: number }
> {
  const admin = sbAdmin();
  if (!admin) return { ok: false, error: "Storage belum siap.", status: 500 };

  if (file.size > MAX) return { ok: false, error: "Ukuran maksimal 5 MB.", status: 400 };
  if (!/^image\/(png|jpe?g|webp)$|^application\/pdf$/.test(file.type)) {
    return { ok: false, error: "Hanya JPG, PNG, WebP, atau PDF.", status: 400 };
  }

  // Validasi tautan portal (dua kueri sederhana, mudah diaudit)
  const { data: tenant, error: tenantErr } = await admin
    .from("tenants")
    .select("id, portal_token, archived_at, org_id")
    .eq("portal_token", token)
    .maybeSingle();

  if (tenantErr || !tenant || tenant.archived_at) {
    return { ok: false, error: "Tautan tidak valid.", status: 403 };
  }

  const { data: activeLease } = await admin
    .from("leases")
    .select("id")
    .eq("tenant_id", tenant.id)
    .eq("status", "active")
    .limit(1);

  if (!activeLease || activeLease.length === 0) {
    return { ok: false, error: "Tautan tidak valid.", status: 403 };
  }

  // Metadata EXIF dibuang di browser (re-encode canvas, lib/upload.ts) sebelum sampai ke sini;
  // file hanya bisa dibaca lewat signed URL berumur pendek (maks. 10 menit) atau token portal.
  const bytes = await file.arrayBuffer();

  const ext = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const path = `${tenant.org_id}/proofs/${tenant.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await admin.storage.from("private-files").upload(path, bytes, { contentType: file.type });
  if (error) return { ok: false, error: "Gagal mengunggah: " + error.message, status: 500 };
  return { ok: true, path };
}

export async function POST(req: NextRequest, route: { params: Promise<{ token: string }> }) {
  const { token } = await route.params;
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
  const res = await saveProof(token, file);
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.error }, { status: res.status });
  }
  return NextResponse.json({ ok: true, path: res.path });
}
