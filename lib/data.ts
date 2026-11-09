import { invoiceDisplay, type InvoiceStatus } from "@/lib/constants";
import type { SupabaseClient } from "@supabase/supabase-js";

/* Query di sini selalu dilindungi RLS; token portal tidak menembus apa pun di file ini. */

export type PropertyRow = {
  id: string;
  org_id: string;
  name: string;
  code: string;
  address: string;
  type: string;
  billing_settings: Record<string, unknown>;
  rules_text: string;
};

export async function getPrimaryProperty(client: SupabaseClient): Promise<PropertyRow | null> {
  const { data } = await client
    .from("properties")
    .select("id, org_id, name, code, address, type, billing_settings, rules_text")
    .limit(1)
    .maybeSingle();
  return (data as PropertyRow) ?? null;
}

export async function listProperties(client: SupabaseClient): Promise<PropertyRow[]> {
  const { data } = await client
    .from("properties")
    .select("id, org_id, name, code, address, type, billing_settings, rules_text")
    .order("created_at");
  return (data as PropertyRow[]) ?? [];
}

/* ================= Hari ini (F5) ================= */

export type TodayRow = {
  invoice_id: string;
  lease_id: string;
  number: string;
  due_date: string;
  total_idr: number;
  paid_idr: number;
  status: InvoiceStatus;
  tenant_name: string;
  tenant_phone: string;
  tenant_token: string;
  room_name: string;
  late_fee_idr: number;
};

export async function listOpenInvoices(client: SupabaseClient): Promise<TodayRow[]> {
  const { data, error } = await client
    .from("invoices")
    .select(
      `id, lease_id, number, due_date, total_idr, paid_idr, status, late_fee_idr,
       lease:leases!inner(tenant:tenants!inner(name, phone_e164, portal_token), room:rooms!inner(name))`,
    )
    .neq("status", "draft")
    .neq("status", "paid")
    .order("due_date");

  if (error) {
    console.error("listOpenInvoices", error.message);
    return [];
  }
  return (data ?? []).map((i: Record<string, unknown>) => {
    const lease = i.lease as Record<string, unknown> | null;
    const tenant = lease?.tenant as Record<string, unknown> | null;
    const room = lease?.room as Record<string, unknown> | null;
    return {
      invoice_id: i.id as string,
      lease_id: i.lease_id as string,
      number: i.number as string,
      due_date: i.due_date as string,
      total_idr: i.total_idr as number,
      paid_idr: i.paid_idr as number,
      status: i.status as InvoiceStatus,
      late_fee_idr: (i.late_fee_idr as number) ?? 0,
      tenant_name: (tenant?.name as string) ?? "",
      tenant_phone: (tenant?.phone_e164 as string) ?? "",
      tenant_token: (tenant?.portal_token as string) ?? "",
      room_name: (room?.name as string) ?? "",
    };
  });
}

/** Kelompok "Hari ini" sesuai F5: dalam 3 hari, hari ini, terlambat */
export function groupForToday(
  rows: TodayRow[],
  today: string,
): { dueSoon: TodayRow[]; dueToday: TodayRow[]; late: TodayRow[] } {
  const todayMs = Date.parse(today + "T00:00:00Z");
  const res = { dueSoon: [] as TodayRow[], dueToday: [] as TodayRow[], late: [] as TodayRow[] };
  for (const r of rows) {
    const d = Date.parse(r.due_date + "T00:00:00Z");
    const diff = Math.round((d - todayMs) / 86_400_000);
    if (diff < 0) res.late.push(r);
    else if (diff === 0) res.dueToday.push(r);
    else if (diff <= 3) res.dueSoon.push(r);
  }
  return res;
}

export function displayFor(row: TodayRow, today: string) {
  return invoiceDisplay(row.status, row.due_date, row.total_idr, row.paid_idr, today);
}

/* ================= Kamar (F2) ================= */

export type RoomOverview = {
  id: string;
  name: string;
  floor: number;
  room_type: string;
  price_idr: number;
  facilities: string[];
  under_maintenance: boolean;
  status: "kosong" | "terisi" | "dipesan" | "perbaikan";
  tenant_name: string | null;
  tenant_token: string | null;
  invoice_status: { label: string; tone: string } | null;
};

export async function listRoomOverview(client: SupabaseClient, today: string): Promise<RoomOverview[]> {
  const { data: rooms } = await client
    .from("rooms")
    .select("id, name, floor, room_type, price_idr, facilities, under_maintenance")
    .order("name");

  const { data: leases } = await client
    .from("leases")
    .select("id, room_id, status, start_date, tenant:tenants(name, portal_token, id)")
    .eq("status", "active");

  const { data: invoices } = await client
    .from("invoices")
    .select("id, lease_id, due_date, status, total_idr, paid_idr")
    .neq("status", "draft")
    .order("due_date", { ascending: false });

  type RawLease = {
    id: string;
    room_id: string;
    status: string;
    start_date: string;
    tenant: { name: string; portal_token: string; id: string }[] | { name: string; portal_token: string; id: string } | null;
  };
  type RawInvoice = {
    id: string;
    lease_id: string;
    due_date: string;
    status: string;
    total_idr: number;
    paid_idr: number;
  };

  const leaseRows = ((leases ?? []) as unknown as RawLease[]);
  const invoiceRows = ((invoices ?? []) as unknown as RawInvoice[]);

  const leaseByRoom = new Map<string, RawLease>();
  for (const l of leaseRows) leaseByRoom.set(l.room_id, l);

  const byLease = new Map<string, RawInvoice[]>();
  for (const inv of invoiceRows) {
    const arr = byLease.get(inv.lease_id) ?? [];
    arr.push(inv);
    byLease.set(inv.lease_id, arr);
  }

  const todayMs = Date.parse(today + "T00:00:00Z");
  type RawRoom = {
    id: string;
    name: string;
    floor: number;
    room_type: string;
    price_idr: number;
    facilities: string[] | null;
    under_maintenance: boolean | null;
  };
  const raw = ((rooms ?? []) as RawRoom[]);
  return raw.map((r: RawRoom) => {
    const lease = leaseByRoom.get(r.id as string);
    let status: RoomOverview["status"] = lease ? "terisi" : "kosong";
    if (r.under_maintenance) status = "perbaikan";
    else if (lease && Date.parse(lease.start_date as string) > todayMs) status = "dipesan";

    let tenantName: string | null = null;
    let tenantToken: string | null = null;
    let invoiceStatus: RoomOverview["invoice_status"] = null;
    if (lease) {
      const t = lease.tenant as unknown as { name: string; portal_token: string } | null;
      tenantName = t?.name ?? null;
      tenantToken = t?.portal_token ?? null;
      const invs = byLease.get(lease.id as string) ?? [];
      const current = invs.find(
        (i) =>
          i.status !== "paid" ||
          Date.parse(i.due_date as string) >= todayMs - 30 * 86400000,
      );
      if (current && current.status !== "paid") {
        invoiceStatus = invoiceDisplay(
          current.status as InvoiceStatus,
          current.due_date as string,
          current.total_idr as number,
          current.paid_idr as number,
          today,
        );
      } else if (current) {
        invoiceStatus = { label: "Lunas", tone: "paid" };
      }
    }
    return {
      id: r.id as string,
      name: r.name as string,
      floor: r.floor as number,
      room_type: r.room_type as string,
      price_idr: r.price_idr as number,
      facilities: (r.facilities as string[]) ?? [],
      under_maintenance: !!r.under_maintenance,
      status,
      tenant_name: tenantName,
      tenant_token: tenantToken,
      invoice_status: invoiceStatus,
    };
  });
}

/* ================= Laporan (F8) ================= */

export type MonthlyReport = {
  month: string; // YYYY-MM
  income: number;
  expense: number;
  net: number;
  occupancy: number; // 0..1
};

export async function monthlySeries(client: SupabaseClient, months = 12): Promise<MonthlyReport[]> {
  const now = new Date();
  const monthsList: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    monthsList.push(d.toISOString().slice(0, 7));
  }

  const { data: pays } = await client
    .from("payments")
    .select("amount_idr, paid_on")
    .eq("status", "verified");
  const { data: expenses } = await client.from("expenses").select("amount_idr, spent_on");
  const { count: roomsCount } = await client.from("rooms").select("id", { count: "exact", head: true });
  const { count: activeCount } = await client
    .from("leases")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");

  const totalRooms = roomsCount ?? 0;
  const occupancy = totalRooms > 0 ? (activeCount ?? 0) / totalRooms : 0;

  return monthsList.map((month) => {
    const income = (pays ?? [])
      .filter((p) => (p.paid_on as string).startsWith(month))
      .reduce((a, p) => a + p.amount_idr, 0);
    const expense = (expenses ?? [])
      .filter((p) => (p.spent_on as string).startsWith(month))
      .reduce((a, p) => a + p.amount_idr, 0);
    return { month, income, expense, net: income - expense, occupancy };
  });
}

/** Tunggakan berdasarkan umur: 0–30, 31–60, >60 hari */
export async function arrearsAging(client: SupabaseClient, today: string) {
  const rows = await listOpenInvoices(client);
  const todayMs = Date.parse(today + "T00:00:00Z");
  const buckets = { b30: 0, b60: 0, bmore: 0 };
  const details: { row: TodayRow; days: number }[] = [];
  for (const r of rows) {
    if (r.paid_idr >= r.total_idr) continue;
    const days = Math.round((todayMs - Date.parse(r.due_date + "T00:00:00Z")) / 86400000);
    if (days <= 0) continue; // jatuh tempo belum tiba
    const unpaid = r.total_idr - r.paid_idr;
    if (days <= 30) buckets.b30 += unpaid;
    else if (days <= 60) buckets.b60 += unpaid;
    else buckets.bmore += unpaid;
    details.push({ row: r, days });
  }
  return { buckets, details };
}

/* ================= WhatsApp (F5, F7) ================= */

export function buildWaLink(phoneE164: string, message: string): string {
  let phone = phoneE164.replace(/[^\d+]/g, "");
  if (phone.startsWith("+")) phone = phone.slice(1);
  if (phone.startsWith("0") && phone.length >= 9) {
    phone = "62" + phone.slice(1);
  }
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function fillTemplate(
  template: string,
  vars: { nama: string; kos: string; periode: string; tanggal: string; total: string; portal_url: string; telat: string },
): string {
  return template
    .replaceAll("{nama}", vars.nama)
    .replaceAll("{kos}", vars.kos)
    .replaceAll("{periode}", vars.periode)
    .replaceAll("{tanggal}", vars.tanggal)
    .replaceAll("{total}", vars.total)
    .replaceAll("{portal_url}", vars.portal_url)
    .replaceAll("{telat}", vars.telat);
}

export const DEFAULT_TEMPLATES: Record<string, string> = {
  ramah:
    "Halo {nama}, ini dari {kos}!\n\nMohon maaf mengingatkan — sewa kamar Anda jatuh tempo tanggal {tanggal} sebesar {total}.\nRincian & cara bayar ada di sini ya: {portal_url}\n\nTerima kasih banyak!",
  pengingat:
    "Halo {nama}, sewa kamar Anda ({kos}) jatuh tempo hari ini, {tanggal}, sebesar {total}.\nSilakan bayar lewat rekening/QRIS di sini: {portal_url}\n\nKwitansi otomatis keluar setelah pembayaran diterima. Terima kasih!",
  tegas:
    "Halo {nama}, sewa kamar Anda ({kos}) dengan ini tercatat terlambat {telat} dari tanggal {tanggal}, senilai {total}.\nMohon segera dilunasi lewat: {portal_url}\n\nJika sudah bayar, mohon maklumi — buktinya bisa dipasang di tautan itu supaya kami bisa verifikasi. Terima kasih.",
};
