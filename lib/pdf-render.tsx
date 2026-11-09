import { renderToBuffer } from "@react-pdf/renderer";
import { KwitansiDoc, CheckoutDoc, type KwitansiData, type CheckoutData, Document, Page, Text, View, StyleSheet } from "@/lib/pdf-docs";
import { sbAdmin, sb, getOwnerContext } from "@/lib/supabase";

export async function kwitansiBuffer(data: KwitansiData): Promise<Buffer> {
  return renderToBuffer(<KwitansiDoc data={data} />);
}

export async function checkoutBuffer(data: CheckoutData): Promise<Buffer> {
  return renderToBuffer(<CheckoutDoc data={data} />);
}

/* Laporan bulanan PDF (F8) */
const reportS = StyleSheet.create({
  page: { padding: 36, fontSize: 11, fontFamily: "Helvetica", color: "#1F2933" },
  h1: { fontSize: 18, fontWeight: "bold", color: "#C2410C" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#E9E2D8",
  },
  m: { color: "#6B7280", fontSize: 9 },
});

export type ReportData = {
  orgName: string;
  series: { month: string; income: number; expense: number; net: number }[];
  arrears: { tenant: string; room: string; remain: number; days: number }[];
  today: string;
};

export async function reportBuffer(data: ReportData): Promise<Buffer> {
  return renderToBuffer(
    <Document title="Laporan KosKita">
      <Page size="A4" style={reportS.page}>
        <Text style={reportS.h1}>Laporan — {data.orgName}</Text>
        <Text style={reportS.m}>Dibuat {data.today} lewat KosKita</Text>
        <Text style={{ marginTop: 14, fontWeight: "bold" }}>Pemasukan & Pengeluaran (12 bulan)</Text>
        {data.series.map((se) => (
          <View key={se.month} style={reportS.row}>
            <Text>{se.month}</Text>
            <Text>+{se.income.toLocaleString("id-ID")}</Text>
            <Text>-{se.expense.toLocaleString("id-ID")}</Text>
            <Text>Laba {se.net.toLocaleString("id-ID")}</Text>
          </View>
        ))}
        <Text style={{ marginTop: 16, fontWeight: "bold" }}>Tunggakan</Text>
        {data.arrears.map((a, i) => (
          <View key={i} style={reportS.row}>
            <Text>
              {a.tenant} · Kamar {a.room}
            </Text>
            <Text>
              Sisa {a.remain.toLocaleString("id-ID")} · terlambat {a.days} hari
            </Text>
          </View>
        ))}
        <Text style={{ marginTop: 24, fontSize: 9, color: "#6B7280", textAlign: "center" }}>
          Laporan dibuat otomatis oleh KosKita — kelola kos Anda dengan KosKita
        </Text>
      </Page>
    </Document>,
  );
}

/* Ambil data & validasi akses kwitansi: viewerPortalToken = null → harus login pemilik. */
export async function kwitansiForPayment(
  paymentId: string,
  viewerPortalToken: string | null,
): Promise<
  { err: string; status?: number } | { buffer: Buffer; filename: string }
> {
  const admin = sbAdmin();
  if (!admin) return { err: "Database/storage belum siap." };

  const { data: payment, error: payErr } = await admin
    .from("payments")
    .select(
      `amount_idr, paid_on, method, receipt_number, status,
       invoice:invoices!inner(id, number, period_start, period_end, total_idr, paid_idr,
         lease:leases!inner(tenant:tenants!inner(name, portal_token), room:rooms!inner(name)),
         property:properties!inner(name, address, org_id))`,
    )
    .eq("id", paymentId)
    .eq("status", "verified")
    .maybeSingle();

  if (payErr || !payment) return { err: "Kwitansi tidak ditemukan.", status: 404 };

  type Joined = {
    amount_idr: number;
    paid_on: string;
    method: string;
    receipt_number: string;
    invoice: {
      id: string;
      number: string;
      period_start: string;
      total_idr: number;
      paid_idr: number;
      lease: { tenant: { name: string; portal_token: string }; room: { name: string } };
      property: { name: string; address: string; org_id: string };
    };
  };
  const pay = payment as unknown as Joined;
  const inv = pay.invoice;

  if (viewerPortalToken !== null) {
    if (inv.lease.tenant.portal_token !== viewerPortalToken) {
      return { err: "forbidden", status: 403 };
    }
  } else {
    const client = await sb();
    const ctx = await getOwnerContext();
    if (!client || !ctx) return { err: "Silakan login.", status: 401 };
    if (!ctx.org || inv.property.org_id !== ctx.org.orgId) {
      return { err: "forbidden", status: 403 };
    }
  }

  const { data: items, error: itemsErr } = await admin
    .from("invoice_items")
    .select("description, amount_idr")
    .eq("invoice_id", inv.id);

  if (itemsErr) return { err: itemsErr.message };

  const buffer = await kwitansiBuffer({
    receiptNumber: pay.receipt_number ?? "-",
    paidOn: pay.paid_on,
    method: pay.method,
    amount: pay.amount_idr,
    invoiceNumber: inv.number,
    period: inv.period_start.slice(0, 7),
    tenantName: inv.lease.tenant.name,
    roomName: inv.lease.room.name,
    propertyName: inv.property.name,
    propertyAddress: inv.property.address,
    items: (items ?? []) as unknown as { description: string; amount: number }[],
    totalInvoice: inv.total_idr,
    paidTotal: inv.paid_idr,
  });

  return {
    buffer,
    filename: `kwitansi-${pay.receipt_number ?? "-"}.pdf`,
  };
}
