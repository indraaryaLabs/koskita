import { NextResponse, type NextRequest } from "next/server";
import { sb } from "@/lib/supabase";
import { listOpenInvoices } from "@/lib/data";

/** Daftar tagihan terbuka milik organisasi (untuk membebankan biaya kerusakan). */
export async function GET(_req: NextRequest) {
  const client = await sb();
  if (!client) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 500 });
  const rows = await listOpenInvoices(client);
  return NextResponse.json({
    ok: true,
    invoices: rows.map((r) => ({
      id: r.invoice_id,
      label: `${r.tenant_name} · Kamar ${r.room_name} · ${r.number}`,
    })),
  });
}
