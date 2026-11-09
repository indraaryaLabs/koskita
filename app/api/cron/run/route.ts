import type { NextRequest, NextResponse as _N } from "next/server";
import { NextResponse } from "next/server";
import { sbAdmin, missingEnv } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cadangan penjadwal (jika pg_cron tidak tersedia):
 * dipanggil GitHub Actions harian dengan header CRON_SECRET, memanggil
 * generate_invoices(current_date) lalu apply_late_fees(current_date).
 */
export async function POST(_req: NextRequest): Promise<ReturnType<typeof NextResponse.json> | _N> {
  if (missingEnv()) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 500 });

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET belum diatur" }, { status: 500 });
  }

  const admin = sbAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "database tidak siap" }, { status: 500 });

  const { data: invRes, error: invErr } = await admin.rpc("generate_invoices", {
    p_date: new Date().toISOString().slice(0, 10),
  });
  if (invErr) return NextResponse.json({ ok: false, error: invErr.message }, { status: 500 });

  const { data: feeRes, error: feeErr } = await admin.rpc("apply_late_fees", {
    p_date: new Date().toISOString().slice(0, 10),
  });
  if (feeErr) return NextResponse.json({ ok: false, error: feeErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, generated: invRes, fees_changed: feeRes });
}
