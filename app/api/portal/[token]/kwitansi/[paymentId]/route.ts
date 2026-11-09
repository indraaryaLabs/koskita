import { NextResponse, type NextRequest } from "next/server";
import { kwitansiForPayment } from "@/lib/pdf-render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Kwitansi untuk penghuni lewat tautan portal (token divalidasi server). */
export async function GET(
  _req: NextRequest,
  route: { params: Promise<{ token: string; paymentId: string }> },
) {
  const { token, paymentId } = await route.params;
  const res = await kwitansiForPayment(paymentId, token);
  if ("err" in res) {
    return NextResponse.json({ ok: false, error: res.err }, { status: res.status ?? 400 });
  }
  return new NextResponse(new Uint8Array(res.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${res.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
