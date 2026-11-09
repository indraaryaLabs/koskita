import { NextResponse, type NextRequest } from "next/server";
import { checkoutBuffer } from "@/lib/pdf-render";
import { sb, sbAdmin, getOwnerContext, missingEnv } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PDF rincian check-out (F10): dipanggil pemilik dari halaman check-out
 * dengan id checkout. Menampilkan deposit, potongan, sisa tagihan, refund.
 */
export async function GET(_req: NextRequest, route: { params: Promise<{ checkoutId: string }> }) {
  if (missingEnv()) {
    return NextResponse.json({ ok: false, error: "Belum dikonfigurasi Supabase." }, { status: 500 });
  }

  const ctx = await getOwnerContext();
  const client = await sb();
  if (!client || !ctx) {
    return NextResponse.json({ ok: false, error: "Silakan login." }, { status: 401 });
  }

  const { checkoutId } = await route.params;
  const admin = sbAdmin(); // hanya untuk mengambil data lintas-RL — divalidasi manual di bawah

  const { data: coRaw, error } = await (admin as NonNullable<typeof admin>)
    .from("checkouts")
    .select(
      `id, checkout_date, final_meter, deductions, deposit_refund_idr,
       lease:leases!inner(id, start_date, deposit_idr,
         tenant:tenants!inner(name),
         room:rooms!inner(name, property_id),
         property:properties!inner(name, org_id))`,
    )
    .eq("id", checkoutId)
    .maybeSingle();

  if (error || !coRaw) {
    return NextResponse.json({ ok: false, error: "Data check-out tidak ditemukan." }, { status: 404 });
  }

  type Joined = {
    id: string;
    checkout_date: string;
    final_meter: number | null;
    deductions: { reason: string; amount_idr: number }[];
    deposit_refund_idr: number;
    lease: {
      id: string;
      start_date: string;
      deposit_idr: number;
      tenant: { name: string };
      room: { name: string };
      property: { name: string; org_id: string };
    };
  };
  const co = coRaw as unknown as Joined;

  // Hanya anggota organisasi properti tersebut
  if (!ctx.org || co.lease.property.org_id !== ctx.org.orgId) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  // Tagihan belum lunas milik kontrak ini (independen dari tabel checkout)
  const { data: unpaid } = await client
    .from("invoices")
    .select("number, total_idr, paid_idr")
    .eq("lease_id", co.lease.id)
    .neq("status", "paid");

  const buffer = await checkoutBuffer({
    roomName: co.lease.room.name,
    tenantName: co.lease.tenant.name,
    startDate: co.lease.start_date,
    checkoutDate: co.checkout_date,
    finalMeter: co.final_meter,
    deductions: co.deductions ?? [],
    unpaidInvoices: (unpaid ?? []).map((i) => ({
      number: i.number as string,
      total: i.total_idr as number,
      paid: i.paid_idr as number,
    })),
    deposit: co.lease.deposit_idr,
    refund: co.deposit_refund_idr,
    propertyName: co.lease.property.name,
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="checkout-${co.checkout_date}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
