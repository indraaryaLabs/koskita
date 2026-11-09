export const APP_NAME = "KosKita";
export const APP_TAGLINE = "Kelola kos Anda dengan tenang";

/* Status tagihan yang tersimpan di database */
export type InvoiceStatus = "draft" | "issued" | "partially_paid" | "paid";

/* Label sehari-hari (PRD): "Sudah bayar", "Belum bayar", "Telat 5 hari" */
export function invoiceDisplay(
  status: InvoiceStatus,
  dueDate: string, // ISO date
  total: number,
  paid: number,
  today: string,
): { label: string; tone: "paid" | "due" | "late" | "draft" | "vacant" } {
  if (status === "draft") return { label: "Draft", tone: "vacant" };
  if (status === "paid") return { label: "Lunas", tone: "paid" };
  if (status === "partially_paid" && paid > 0)
    return { label: `Sisa ${formatRupiah(total - paid)}`, tone: "due" };
  const diffMs = Date.parse(dueDate) - Date.parse(today);
  const diffDays = Math.round(diffMs / 86_400_000);
  if (diffDays >= 0 && paid === 0) return { label: "Belum bayar", tone: "due" };
  if (diffDays >= 0) return { label: "Belum bayar", tone: "due" };
  if (diffDays === -1) return { label: "Telat 1 hari", tone: "late" };
  return { label: `Telat ${Math.abs(diffDays)} hari`, tone: "late" };
}

export function formatRupiah(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "Rp0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Format tanggal standar Indonesia: 9 Nov 2026 */
export function formatTanggal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00Z` : iso);
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/* Warna status kamar (dengan teks, tidak hanya warna — PRD F2) */
export const ROOM_STATUS_LABEL: Record<string, string> = {
  kosong: "Kosong",
  terisi: "Terisi",
  dipesan: "Dipesan",
  perbaikan: "Perbaikan",
};

/* Kategori pengeluaran (F8) */
export const EXPENSE_CATEGORIES = [
  "listrik_pln",
  "air",
  "wifi",
  "kebersihan",
  "perbaikan",
  "pajak",
  "gaji_penjaga",
  "lainnya",
] as const;

export const EXPENSE_LABEL: Record<string, string> = {
  listrik_pln: "Listrik PLN",
  air: "Air",
  wifi: "WiFi",
  kebersihan: "Kebersihan",
  perbaikan: "Perbaikan",
  pajak: "Pajak",
  gaji_penjaga: "Gaji Penjaga",
  lainnya: "Lainnya",
};

/* Kategori kerusakan (F9) */
export const TICKET_CATEGORIES = [
  "kamar",
  "listrik",
  "air",
  "pintu_jendela",
  "kamar_mandi",
  "lainnya",
] as const;

export const TICKET_LABEL: Record<string, string> = {
  kamar: "Kamar",
  listrik: "Listrik",
  air: "Air",
  pintu_jendela: "Pintu/Jendela",
  kamar_mandi: "Kamar Mandi",
  lainnya: "Lainnya",
};
