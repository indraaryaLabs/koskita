import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// Re-export primitif supaya modul render (lib/pdf-render.tsx) bisa menulis JSX dokumen sendiri.
export { Document, Page, Text, View, StyleSheet };
import { formatRupiah, formatTanggal } from "@/lib/constants";

/* Dokumen PDF: kwitansi (F7), rincian check-out (F10), laporan (F8). */

const C = {
  ink: "#1F2933",
  muted: "#6B7280",
  border: "#E9E2D8",
  primary: "#C2410C",
  paid: "#15803D",
  bgSoft: "#FAF7F2",
};

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 11, fontFamily: "Helvetica", color: C.ink },
  h1: { fontSize: 20, fontWeight: "bold", color: C.primary },
  h2: { fontSize: 13, fontWeight: "bold", marginTop: 18, marginBottom: 6 },
  muted: { color: C.muted, fontSize: 9 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  tableHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingBottom: 4,
    marginTop: 8,
  },
  total: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.ink },
  brand: { marginTop: 24, fontSize: 9, color: C.muted, textAlign: "center" },
  box: { borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 12, marginTop: 12, backgroundColor: C.bgSoft },
});

export type KwitansiData = {
  receiptNumber: string;
  paidOn: string;
  method: string;
  amount: number;
  invoiceNumber: string;
  period: string;
  tenantName: string;
  roomName: string;
  propertyName: string;
  propertyAddress: string;
  items: { description: string; amount: number }[];
  totalInvoice: number;
  paidTotal: number;
};

export function KwitansiDoc({ data }: { data: KwitansiData }) {
  return (
    <Document title={`Kwitansi ${data.receiptNumber}`}>
      <Page size="A4" style={s.page}>
        <Text style={s.h1}>Kwitansi — {data.propertyName}</Text> {data.propertyAddress ? <Text style={s.muted}>{data.propertyAddress}</Text> : null}
        <View style={{ marginTop: 12, flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 13, fontWeight: "bold" }}>No. {data.receiptNumber}</Text>
          <Text style={s.muted}>Dibayar tanggal {formatTanggal(data.paidOn)}</Text>
        </View>

        <View style={s.box}>
          <View style={s.row}>
            <Text>Diterima dari</Text>
            <Text style={{ fontWeight: "bold" }}>{data.tenantName} (Kamar {data.roomName})</Text>
          </View>
          <View style={s.row}>
            <Text>Untuk tagihan</Text>
            <Text style={{ fontWeight: "bold" }}>{data.invoiceNumber} — {data.period}</Text>
          </View>
        </View>

        <Text style={s.h2}>Rincian</Text>
        <View style={s.tableHead}>
          <Text>Rincian</Text>
          <Text>Jumlah</Text>
        </View>
        {data.items.map((it, i) => (
          <View key={i} style={s.row}>
            <Text>{it.description}</Text>
            <Text>{formatRupiah(it.amount)}</Text>
          </View>
        ))}
        <View style={s.total}>
          <Text style={{ fontWeight: "bold" }}>Dibayar (metode {data.method})</Text>
          <Text style={{ fontWeight: "bold", color: C.paid }}>{formatRupiah(data.amount)}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.muted}>Sisa tagihan</Text>
          <Text style={s.muted}>{formatRupiah(Math.max(data.totalInvoice - data.paidTotal, 0))}</Text>
        </View>

        <Text style={s.brand}>Kwitansi dibuat otomatis oleh KosKita — kelola kos Anda dengan KosKita</Text>
      </Page>
    </Document>
  );
}

export type CheckoutData = {
  roomName: string;
  tenantName: string;
  startDate: string;
  checkoutDate: string;
  finalMeter: number | null;
  deductions: { reason: string; amount_idr: number }[];
  unpaidInvoices: { number: string; total: number; paid: number }[];
  deposit: number;
  refund: number;
  propertyName: string;
};

export function CheckoutDoc({ data }: { data: CheckoutData }) {
  const deductionsTotal = data.deductions.reduce((a, d) => a + d.amount_idr, 0);
  const unpaidTotal = data.unpaidInvoices.reduce((a, i) => a + (i.total - i.paid), 0);
  return (
    <Document title="Rincian Check-out">
      <Page size="A4" style={s.page}>
        <Text style={s.h1}>Rincian Check-out — {data.propertyName}</Text>
        <View style={{ marginTop: 12 }}>
          <View style={s.row}><Text>Penghuni</Text><Text style={{ fontWeight: "bold" }}>{data.tenantName}</Text></View>
          <View style={s.row}><Text>Kamar</Text><Text style={{ fontWeight: "bold" }}>{data.roomName}</Text></View>
          <View style={s.row}><Text>Tanggal masuk</Text><Text>{formatTanggal(data.startDate)}</Text></View>
          <View style={s.row}><Text>Tanggal keluar</Text><Text>{formatTanggal(data.checkoutDate)}</Text></View>
          {data.finalMeter != null && (
            <View style={s.row}><Text>Meteran listrik akhir</Text><Text>{data.finalMeter}</Text></View>
          )}
        </View>

        <Text style={s.h2}>Deposit</Text>
        <View style={s.row}><Text>Deposit tercatat</Text><Text>{formatRupiah(data.deposit)}</Text></View>
        {data.deductions.map((d, i) => (
          <View key={i} style={s.row}>
            <Text>Potongan: {d.reason}</Text>
            <Text>-{formatRupiah(d.amount_idr)}</Text>
          </View>
        ))}
        <View style={s.row}>
          <Text>Tagihan belum lunas</Text>
          <Text>-{formatRupiah(unpaidTotal)}</Text>
        </View>
        <View style={s.total}>
          <Text style={{ fontWeight: "bold" }}>Dikembalikan ke penghuni</Text>
          <Text style={{ fontWeight: "bold", color: C.paid }}>{formatRupiah(data.refund)}</Text>
        </View>
        <Text style={s.muted}>
          (Potongan kerusakan {formatRupiah(deductionsTotal)} sudah termasuk dalam perhitungan pengembalian di atas.)
        </Text>

        <Text style={s.brand}>Dokumen dibuat otomatis oleh KosKita — kelola kos Anda dengan KosKita</Text>
      </Page>
    </Document>
  );
}
