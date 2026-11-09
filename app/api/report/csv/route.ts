import { NextResponse, type NextRequest } from "next/server";
import { sb, getOwnerContext, missingEnv } from "@/lib/supabase";
import { monthlySeries, arrearsAging } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Export Excel: CSV standar yang terbuka di Excel (dipisah titik-komma utk locale id). */
export async function GET(_req: NextRequest) {
  if (missingEnv()) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 500 });
  const client = await sb();
  const ctx = await getOwnerContext();
  if (!client || !ctx?.org) return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });

  const today = new Date().toISOString().slice(0, 10);
  const [series, aging] = await Promise.all([monthlySeries(client, 12), arrearsAging(client, today)]);

  const rows: string[][] = [
    ["Laporan KosKita — " + ctx.org.orgName],
    ["Periode", "Pemasukan (Rp)", "Pengeluaran (Rp)", "Laba bersih (Rp)"],
    ...series.map((s) => [s.month, String(s.income), String(s.expense), String(s.net)]),
    [],
    ["Tunggakan per " + today],
    ["Penghuni", "Kamar", "Tagihan", "Total", "Dibayar", "Telat (hari)", "Sisa (Rp)"],
    ...aging.details.map(({ row, days }) => [
      row.tenant_name,
      row.room_name,
      row.number,
      String(row.total_idr),
      String(row.paid_idr),
      String(days),
      String(row.total_idr - row.paid_idr),
    ]),
    [],
    ["Ringkasan umur tunggakan"],
    ["0-30 hari", "31-60 hari", ">60 hari"],
    [String(aging.buckets.b30), String(aging.buckets.b60), String(aging.buckets.bmore)],
  ];

  const csv = rows.map((r) => r.map((c) => (c?.includes(";") ? `"${c}"` : c ?? "")).join(";")).join("\r\n");

  return new NextResponse("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="laporan-koskita-${today}.csv"`,
    },
  });
}
