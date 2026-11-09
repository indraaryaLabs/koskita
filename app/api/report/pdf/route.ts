import { NextResponse, type NextRequest } from "next/server";
import { reportBuffer } from "@/lib/pdf-render";
import { sb, getOwnerContext, missingEnv } from "@/lib/supabase";
import { monthlySeries, arrearsAging } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  if (missingEnv()) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 500 });
  const client = await sb();
  const ctx = await getOwnerContext();
  if (!client || !ctx?.org) return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });

  const today = new Date().toISOString().slice(0, 10);
  const [series, aging] = await Promise.all([monthlySeries(client, 12), arrearsAging(client, today)]);

  const buffer = await reportBuffer({
    orgName: ctx.org.orgName,
    series,
    arrears: aging.details.map(({ row, days }) => ({
      tenant: row.tenant_name,
      room: row.room_name,
      remain: row.total_idr - row.paid_idr,
      days,
    })),
    today,
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="laporan-koskita-${today}.pdf"`,
    },
  });
}
