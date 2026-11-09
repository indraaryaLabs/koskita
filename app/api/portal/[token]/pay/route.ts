import { NextResponse, type NextRequest } from "next/server";
import { sbAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Pencatatan bukti bayar dari portal penghuni (validasi token server) → RPC security definer. */
export async function POST(req: NextRequest, route: { params: Promise<{ token: string }> }) {
  const { token } = await route.params;
  const admin = sbAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "Belum terpasang." }, { status: 500 });

  let body: { invoice_id?: string; amount?: number; method?: string; proof_path?: string; paid_on?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Data tidak valid." }, { status: 400 });
  }

  const { invoice_id, amount, method, proof_path, paid_on } = body;
  if (!invoice_id || !proof_path) {
    return NextResponse.json({ ok: false, error: "Data tidak lengkap." }, { status: 400 });
  }

  const { data: id, error } = await admin.rpc("portal_insert_payment", {
    p_token: token,
    p_invoice: invoice_id,
    p_amount: amount ?? 0,
    p_method: method ?? "transfer",
    p_paid_on: paid_on ?? new Date().toISOString().slice(0, 10),
    p_proof_path: proof_path,
  });

  if (error) {
    const friendly =
      error.message.includes("TAUTAN_TIDAK_VALID")
        ? "Tautan tidak berlaku."
        : error.message.includes("TAGIHAN_TIDAK_SESUAI")
          ? "Tagihan sudah lunas atau sudah ada bukti menunggu."
          : error.message.includes("NOMINAL_TIDAK_VALID")
            ? "Nominal harus lebih dari 0."
            : "Gagal menyimpan bukti.";
    return NextResponse.json({ ok: false, error: friendly, detail: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, payment_id: id });
}
