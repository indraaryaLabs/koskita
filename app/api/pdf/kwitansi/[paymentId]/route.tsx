import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { sbAdmin, sb, missingEnv } from "@/lib/supabase";
import { KwitansiDoc } from "@/lib/pdf-docs";
import { uploadPrivateFileProxy } from "@/app/actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Kwitansi PDF (F7). Akses:
 *  - pemilik yang login (RLS), atau
 *  - penghuni lewat tautan portal: route /portal/[token]/kwitansi/[paymentId] memanggil
 *    logika yang sama setelah memvalidasi token.
 */
async function buildKwitansiForPayment(paymentId: string, viewerPortalToken: string | null) {
  if (missingEnv()) return { err: "Belum dikonfigurasi Supabase." };

  // Untuk viewer portal: gunakan service-role dengan validasi token manual.
  const admin = sbAdmin();
  if (!admin) return { err: "Storage/database belum siap." };

  const { data: payment, error: payErr } = await admin
    .from("payments")
    .select(
      `amount_idr, paid_on, method, receipt_number, status,
       invoice:invoices(id, number, period_start, period_end, total_idr, paid_idr, lease:leases(tenant:tenants(name, portal_token), room:rooms(name)), property:properties(name, address, org_id))`,
    )
    .eq("id", paymentId)
    .maybeSingle();

  if (payErr || !payment) return { err: "Pembayaran tidak ditemukan." };
  if (payment.status !== "verified") return { err: "Pembayaran belum diverifikasi." };

  const inv = (payment.invoice as unknown as Record<string, unknown>) ?? {};
  const lease = (inv.lease as unknown as Record<string, unknown>) ?? {};
  const tenant = (lease.tenant as unknown as Record<string, unknown>) ?? {};
  const room = (lease.room as unknown as Record<string, unknown>) ?? {};
  const property = (inv.property as unknown as Record<string, unknown>) ?? {};

  const portalToken = (tenant.portal_token as string) ?? "";
  if (viewerPortalToken !== null && portalToken !== viewerPortalToken) {
    return { err: "forbidden" };
  }
  if (viewerPortalToken === null) {
    // pemilik: pastikan user ini anggota organisasi properti
    const client = await sb();
    const ctx = await getOwnerContext();
    if (!client || !ctx?.org) return { err: "Silakan login." };
    if (property.org_id !== ctx.org.orgId) return { err: "forbidden" };
  }

  const { data: items } = await admin
    .from("invoice_items")
    .select("description, amount_idr")
    .eq("invoice_id", inv.id as string);

  const doc = (
    <KwitansiDoc
      data={{
        receiptNumber: (payment.receipt_number as string) ?? "-",
        paidOn: payment.paid_on as string,
        method: payment.method as string,
        amount: payment.amount_idr as number,
        invoiceNumber: inv.number as string,
        period: `${String((inv.period_start as string).slice(0, 7))}`,
        tenantName: tenant.name as string,
        roomName: room.name as string,
        propertyName: property.name as string,
        propertyAddress: property.address as string,
        items: (items ?? []) as { description: string; amount: number }[],
        totalInvoice: inv.total_idr as number,
        paidTotal: inv.paid_idr as number,
      }}
    />
  );

  const buffer = await renderToBuffer(doc);
  return { buffer, filename: `kwitansi-${payment.receipt_number}.pdf` };
}

export async function GET(_req: NextRequest, ctxRoute: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await ctxRoute.params;
  const res = await buildKwitansiForPayment(paymentId, null);
  if ("err" in res) {
    return NextResponse.json({ ok: false, error: res.err }, { status: res.err === "forbidden" ? 403 : 400 });
  }
  return new NextResponse(new Uint8Array(res.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${res.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

// Simpan juga salinan ke storage supaya bisa diakses ulang dari portal
export const POST = async function (req: NextRequest, ctxRoute: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await ctxRoute.params;
  const res = await buildKwitansiForPayment(paymentId, null);
  if ("err" in res) {
    return NextResponse.json({ ok: false, error: res.err }, { status: 400 });
  }
  const path = await uploadPrivateFileProxy(
    new File([new Uint8Array(res.buffer)], res.filename, { type: "application/pdf" }),
    (await getOwnerContext())?.org?.orgId ?? "",
  );
  return NextResponse.json(path);
};
