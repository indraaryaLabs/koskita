import { NextResponse, type NextRequest } from "next/server";
import { sbAdmin, missingEnv } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Penjadwal tagihan harian untuk Vercel Schedules atau GitHub Actions.
 * Kedua pemanggil wajib mengirim Authorization: Bearer CRON_SECRET.
 */
async function runCron(request: NextRequest): Promise<NextResponse> {
  if (missingEnv()) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 500 });
  }

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET belum diatur" }, { status: 500 });
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const admin = sbAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "database tidak siap" }, { status: 500 });
  }

  const p_date = new Date().toISOString().slice(0, 10);
  const { data: invRes, error: invErr } = await admin.rpc("generate_invoices", { p_date });
  if (invErr) return NextResponse.json({ ok: false, error: invErr.message }, { status: 500 });

  const { data: feeRes, error: feeErr } = await admin.rpc("apply_late_fees", { p_date });
  if (feeErr) return NextResponse.json({ ok: false, error: feeErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, generated: invRes, fees_changed: feeRes });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return runCron(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return runCron(request);
}