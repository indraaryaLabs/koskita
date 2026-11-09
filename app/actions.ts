"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sb, sbAdmin, missingEnv, getOwnerContext, PLAN_LIMITS, type OrgContext } from "@/lib/supabase";
import { expandRoomNames } from "@/lib/room-names";

/* ---------- util ---------- */

function fail(msg: string): { ok: false; error: string } {
  return { ok: false, error: msg };
}

function ok(data: unknown = true): { ok: true; data: unknown } {
  return { ok: true, data };
}

async function requireOwner(): Promise<{ org: OrgContext; client: NonNullable<Awaited<ReturnType<typeof sb>>> } | { err: string }> {
  if (missingEnv()) return { err: "Belum dikonfigurasi Supabase." };
  const client = await sb();
  if (!client) return { err: "Koneksi database gagal." };
  const ctx = await getOwnerContext();
  if (!ctx) return { err: "Silakan login kembali." };
  if (!ctx.org) return { err: "Belum ada organisasi. Selesaikan onboarding." };
  if (ctx.org.role !== "owner") return { err: "Hanya pemilik yang bisa melakukan aksi ini." };
  return { org: ctx.org, client };
}

/* ---------- F0: onboarding & organisasi ---------- */

const onboardingSchema = z.object({
  kosName: z.string().min(2, "Nama kos minimal 2 huruf"),
  address: z.string().min(2, "Alamat minimal 2 huruf"),
  type: z.enum(["putra", "putri", "campur"]),
  rooms: z.string().optional().default(""),
  roomPrice: z.string().optional().default(""),
});

export async function onboardingAction(formData: FormData) {
  const client = await sb();
  if (!client) return fail("Belum dikonfigurasi Supabase.");
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return fail("Silakan login terlebih dahulu.");

  const parsed = onboardingSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Data tidak valid");
  }

  // Sudah punya organisasi?
  const { data: existing } = await client
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1);
  if (existing && existing.length > 0) return ok({ created: false });

  const { data: org, error: orgErr } = await client
    .from("organizations")
    .insert({ name: parsed.data.kosName, plan: "gratis" })
    .select()
    .single();
  if (orgErr || !org) return fail("Gagal membuat organisasi: " + orgErr?.message);

  await client
    .from("org_members")
    .insert({ org_id: org.id, user_id: user.id, role: "owner" });

  const code = (parsed.data.kosName.replace(/[^A-Za-z]/g, "TISKIT").toUpperCase().slice(0, 2) || "KS")
    .slice(0, 3)
    .padEnd(3, "X") + (Math.floor(Math.random() * 8) + 1);

  const { data: prop, error: propErr } = await client
    .from("properties")
    .insert({
      org_id: org.id,
      name: parsed.data.kosName,
      code,
      address: parsed.data.address,
      type: parsed.data.type,
      billing_settings: {
        billing_mode: "anniversary",
        issue_days: 7,
        grace_days: 3,
        prorata_fixed_first: true,
        late_fee: { enabled: false, mode: "flat", amount_idr: 0, max_idr: 0 },
      },
    })
    .select()
    .single();
  if (propErr || !prop) return fail("Gagal membuat properti: " + propErr?.message);

  // Tambah kamar sekaligus: "101-114" / daftar dipisah koma
  const price = Number(parsed.data.roomPrice.replace(/[^\d]/g, "")) || 0;
  const names = expandRoomNames(parsed.data.rooms || "");
  if (names.length > 0) {
    const rows = names.slice(0, PLAN_LIMITS.gratis.rooms).map((name, i) => ({
      property_id: prop.id,
      name,
      floor: 1,
      price_idr: price,
      facilities: [] as string[],
    }));
    await client.from("rooms").insert(rows);
  }

  redirect("/?selesai=1");
}

/* ---------- F2: kamar ---------- */

export async function addRoomsAction(formData: FormData) {
  const res = await requireOwner();
  if ("err" in res) return fail(res.err);
  const { org, client } = res;

  const propertyId = String(formData.get("property_id") ?? "");
  const rawNames = String(formData.get("names") ?? "");
  const price = Number(String(formData.get("price_idr") ?? "").replace(/[^\d]/g, "")) || 0;
  if (!propertyId) return fail("Pilih properti.");

  const names = expandRoomNames(rawNames);
  if (names.length === 0) return fail("Tulis nomor kamar, contoh: 101-110.");

  // Batas paket
  const { count } = await client
    .from("rooms")
    .select("id", { count: "exact", head: true })
    .eq("property_id", propertyId);
  const limits = PLAN_LIMITS[org.plan];
  if ((count ?? 0) + names.length > limits.rooms) {
    return fail(`Paket ${org.plan} maksimal ${limits.rooms} kamar.`);
  }

  const { error } = await client.from("rooms").insert(
    names.map((name) => ({
      property_id: propertyId,
      name,
      price_idr: price,
    })),
  );
  if (error) return fail(error.message);
  revalidatePath("/kamar");
  revalidatePath("/");
  return ok({ added: names.length });
}

export async function updateRoomAction(formData: FormData) {
  const res = await requireOwner();
  if ("err" in res) return fail(res.err);
  const { client } = res;

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const price = Number(String(formData.get("price_idr") ?? "").replace(/[^\d]/g, "")) || 0;
  const facilitiesRaw = String(formData.get("facilities") ?? "");
  const maintenance = formData.get("under_maintenance") === "on";

  if (!id) return fail("Kamar tidak ditemukan.");
  const { error } = await client
    .from("rooms")
    .update({
      name,
      price_idr: price,
      facilities: facilitiesRaw.split(",").map((s) => s.trim()).filter(Boolean),
      under_maintenance: maintenance,
    })
    .eq("id", id);
  if (error) return fail(error.message);
  revalidatePath("/kamar");
  return ok();
}

export async function toggleMaintenanceAction(formData: FormData) {
  const res = await getOwnerContext();
  if (!res?.org) return fail("Silakan login.");
  const client = await sb();
  if (!client) return fail("Koneksi database gagal.");
  const id = String(formData.get("id") ?? "");
  const to = formData.get("to") === "true";
  const { error } = await client.from("rooms").update({ under_maintenance: to }).eq("id", id);
  if (error) return fail(error.message);
  revalidatePath("/kamar");
  return ok();
}

/* ---------- F3: penghuni & kontrak ---------- */

const tenantSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 huruf"),
  phone: z.string().min(8, "Nomor WhatsApp tidak valid"),
  occupation: z.string().optional(),
  emergencyName: z.string().optional(),
  emergencyPhone: z.string().optional(),
});

function generateToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

export async function addTenantAction(formData: FormData) {
  const res = await requireOwner();
  if ("err" in res) return fail(res.err);
  const { org, client } = res;

  const parsed = tenantSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Data tidak valid");

  const roomId = String(formData.get("room_id") ?? "");
  const startDate = String(formData.get("start_date") ?? "");
  const endDate = String(formData.get("end_date") ?? "");
  const periodMonths = Number(formData.get("period_months") ?? 1);
  const rent = Number(String(formData.get("rent_idr") ?? "").replace(/[^\d]/g, "")) || 0;
  const deposit = Number(String(formData.get("deposit_idr") ?? "").replace(/[^\d]/g, "")) || 0;
  const electricityMode = String(formData.get("electricity_mode") ?? "token");
  const electricityRate = Number(String(formData.get("electricity_rate_idr") ?? "").replace(/[^\d]/g, "")) || 0;
  const charges = String(formData.get("charges") ?? "");
  //    "WiFi,100000;Parkir,50000"

  if (!roomId || !startDate) return fail("Pilih kamar dan tanggal masuk.");
  if (rent <= 0) return fail("Sewa kamar harus lebih dari 0.");

  // Batas kamar paket (Gratis/5, Kos/15, Plus/40) — ratusan kamar terlalu banyak utk gratis
  const { count: leaseCount } = await client
    .from("leases")
    .select("id", { count: "exact", head: true })
    .neq("status", "ended");
  const limits = PLAN_LIMITS[org.plan];
  if ((leaseCount ?? 0) >= limits.rooms) {
    return fail(`Paket ${org.plan} maksimal ${limits.rooms} kontrak aktif.`);
  }

  const { data: tenant, error: tenantErr } = await client
    .from("tenants")
    .insert({
      org_id: org.orgId,
      name: parsed.data.name,
      phone_e164: parsed.data.phone,
      occupation: parsed.data.occupation ?? "",
      emergency_contact: {
        name: parsed.data.emergencyName ?? "",
        phone: parsed.data.emergencyPhone ?? "",
      },
      portal_token: generateToken(),
    })
    .select()
    .single();
  if (tenantErr || !tenant) return fail("Gagal membuat penghuni: " + tenantErr?.message);

  const { data: lease, error: leaseErr } = await client
    .from("leases")
    .insert({
      room_id: roomId,
      tenant_id: tenant.id,
      start_date: startDate,
      end_date: endDate || null,
      period_months: [1, 3, 6, 12].includes(periodMonths) ? periodMonths : 1,
      rent_idr: rent,
      deposit_idr: deposit,
      electricity_mode: ["included", "per_kwh", "token"].includes(electricityMode) ? electricityMode : "token",
      electricity_rate_idr: electricityRate,
    })
    .select()
    .single();
  if (leaseErr) {
    // undo tenant supaya tidak yatim
    await client.from("tenants").delete().eq("id", tenant.id);
    if (leaseErr.code === "23B01") {
      return fail("Kamar ini sudah ada penghuni aktif. Tutup kontrap sebelum mengisi.");
    }
    return fail("Gagal membuat kontrak: " + leaseErr.message);
  }

  if (charges.trim()) {
    const chargeRows = charges
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const [nm, amt] = s.split(",");
        return {
          lease_id: lease!.id,
          name: (nm ?? "").trim(),
          amount_idr: Number((amt ?? "").replace(/[^\d]/g, "")) || 0,
        };
      })
      .filter((r) => r.name && r.amount_idr > 0);
    if (chargeRows.length > 0) {
      const { error: cErr } = await client.from("lease_charges").insert(chargeRows);
      if (cErr) return fail("Kontrak dibuat, tapi biaya tetap gagal: " + cErr.message);
    }
  }

  revalidatePath("/penghuni");
  revalidatePath("/kamar");
  return ok({ tenant_id: tenant.id, portal_token: tenant.portal_token });
}

export async function regeneratePortalTokenAction(formData: FormData) {
  const res = await requireOwner();
  if ("err" in res) return fail(res.err);
  const { client } = res;
  const id = String(formData.get("id") ?? "");
  const token = generateToken();
  const { error } = await client.from("tenants").update({ portal_token: token }).eq("id", id);
  if (error) return fail(error.message);
  revalidatePath("/penghuni");
  return ok({ token });
}

export async function archiveTenantAction(formData: FormData) {
  const res = await requireOwner();
  if ("err" in res) return fail(res.err);
  const { client } = res;
  const id = String(formData.get("id") ?? "");
  const { error } = await client.from("tenants").update({ archived_at: new Date().toISOString() }).eq("id", id);
  if (error) return fail(error.message);
  revalidatePath("/penghuni");
  return ok();
}

/* ---------- F4: pengingat (+/- log) ---------- */

export async function logReminderAction(formData: FormData) {
  const ctx = await getOwnerContext();
  if (!ctx?.org) return fail("Silakan login.");
  const client = await sb();
  if (!client) return fail("Koneksi database gagal.");

  const invoiceId = String(formData.get("invoice_id") ?? "");
  const template = String(formData.get("template") ?? "pengingat");
  if (!["ramah", "pengingat", "tegas"].includes(template)) return fail("Template tidak dikenal.");

  const { error } = await client
    .from("reminders")
    .insert({ invoice_id: invoiceId, template, sent_by: ctx.user.user_id });
  if (error) return fail(error.message);
  revalidatePath("/");
  return ok();
}

/* ---------- F3: impor penghuni lama dari daftar sederhana ---------- */
/* Format per baris: Nama;WhatsApp;Kamar;TanggalMasuk(YYYY-MM-DD);SewaPerBulan */
export async function importTenantsAction(formData: FormData) {
  const res = await requireOwner();
  if ("err" in res) return fail(res.err);
  const { org, client } = res;

  const raw = String(formData.get("import") ?? "");
  const lines = raw.split("\n").map((s) => s.trim()).filter(Boolean);
  if (lines.length === 0) return fail("Tempel daftar dulu, satu penghuni satu baris.");

  const { data: rooms } = await client
    .from("rooms")
    .select("id, name, property_id")
    .order("name");
  const roomByName = new Map(((rooms ?? []) as { id: string; name: string; property_id: string }[]).map((r) => [r.name.toLowerCase(), r]));
  if (!rooms || rooms.length === 0) return fail("Tambahkan kamar dulu di menu Kamar.");

  const limits = PLAN_LIMITS[org.plan];
  const { count: leaseCount } = await client
    .from("leases")
    .select("id", { count: "exact", head: true })
    .neq("status", "ended");

  let created = 0;
  const errors: string[] = [];

  for (const [idx, line] of lines.entries()) {
    const parts = line.split(";").map((s) => s.trim());
    if (parts.length < 5) {
      errors.push(`Baris ${idx + 1}: butuh 5 kolom dipisah “;”.`);
      continue;
    }
    const [name, phone, roomName, startDate, rentRaw] = parts;
    if ((leaseCount ?? 0) + created >= limits.rooms) {
      errors.push(`Batas paket ${limits.rooms} kontrak aktif. Baris setelah ini dilewati.`);
      break;
    }
    const room = roomByName.get(roomName.toLowerCase());
    const rent = Number(rentRaw.replace(/[^\d]/g, "")) || 0;
    if (!room) errors.push(`Baris ${idx + 1}: kamar “${roomName}” tidak ditemukan.`);
    else if (rent <= 0) errors.push(`Baris ${idx + 1}: sewa tidak valid.`);
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) errors.push(`Baris ${idx + 1}: tanggal pakai YYYY-MM-DD.`);
    else {
      const wa = phone.replace(/[^\d+]/g, "") || `+6280000000${idx}`;
      const token = generateToken();
      const { data: tenant, error: tErr } = await client
        .from("tenants")
        .insert({ org_id: org.orgId, name, phone_e164: wa, portal_token: token })
        .select()
        .single();
      if (tErr || !tenant) {
        errors.push(`Baris ${idx + 1}: ${tErr?.message ?? "gagal membuat penghuni"}`);
        continue;
      }
      const { error: lErr } = await client.from("leases").insert({
        room_id: room.id,
        tenant_id: tenant.id,
        start_date: startDate,
        rent_idr: rent,
        deposit_idr: rent,
        electricity_mode: "token",
      });
      if (lErr) {
        await client.from("tenants").delete().eq("id", tenant.id);
        errors.push(`Baris ${idx + 1}: ${lErr.message}`);
        continue;
      }
      created++;
    }
  }

  if (created === 0 && errors.length > 0) return fail(errors.join(" "));
  revalidatePath("/penghuni");
  revalidatePath("/kamar");
  return ok({ created, errors });
}

/* ---------- F7: verifikasi pembayaran ---------- */

export async function verifyPaymentAction(formData: FormData) {
  const res = await requireOwner();
  if ("err" in res) return fail(res.err);
  const { client } = res;

  const paymentId = String(formData.get("payment_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const rejectReason = String(formData.get("reject_reason") ?? "");
  if (!paymentId || !["verify", "reject"].includes(decision)) return fail("Aksi tidak dikenal.");

  const patch: Record<string, unknown> =
    decision === "verify"
      ? { status: "verified" as const }
      : { status: "rejected" as const, reject_reason: rejectReason || "Bukti tidak sesuai" };

  const { error } = await client.from("payments").update(patch).eq("id", paymentId);
  if (error) return fail(error.message);
  revalidatePath("/tagihan");
  revalidatePath("/");
  return ok();
}

export async function recordCashPaymentAction(formData: FormData) {
  const res = await getOwnerContext();
  if (!res?.org) return fail("Silakan login.");
  const client = await sb();
  if (!client) return fail("Koneksi database gagal.");

  const invoiceId = String(formData.get("invoice_id") ?? "");
  const amount = Number(String(formData.get("amount_idr") ?? "").replace(/[^\d]/g, "")) || 0;
  const paidOn = String(formData.get("paid_on") ?? "");
  const method = String(formData.get("method") ?? "tunai");

  if (!invoiceId || amount <= 0) return fail("Nominal harus lebih dari 0.");
  if (!paidOn) return fail("Isi tanggal bayar.");

  const { error } = await client
    .from("payments")
    .insert({
      invoice_id: invoiceId,
      amount_idr: amount,
      paid_on: paidOn,
      method: ["tunai", "transfer", "qris"].includes(method) ? method : "tunai",
      status: "verified", // tunai langsung ternilai oleh pemilik/penjaga
      recorded_by: res.user.user_id,
    });
  if (error) return fail(error.message);
  revalidatePath("/tagihan");
  revalidatePath("/");
  return ok();
}

export async function undoPaymentVerificationAction(formData: FormData) {
  const res = await requireOwner();
  if ("err" in res) return fail(res.err);
  const { client } = res;
  const paymentId = String(formData.get("payment_id") ?? "");
  if (!paymentId) return fail("Pembayaran tidak ditemukan.");
  const { error } = await client.from("payments").update({ status: "pending" as const }).eq("id", paymentId);
  if (error) return fail(error.message);
  revalidatePath("/tagihan");
  return ok();
}

/* ---------- F4: isi meteran / item tagihan ---------- */

export async function fillMeterAction(formData: FormData) {
  const res = await requireOwner();
  if ("err" in res) return fail(res.err);
  const { client } = res;
  const itemId = String(formData.get("item_id") ?? "");
  const meterStart = Number(formData.get("meter_start") ?? 0);
  const meterEnd = Number(formData.get("meter_end") ?? 0);
  if (!itemId || meterEnd <= meterStart) return fail("Meteran akhir harus lebih besar dari meteran awal.");

  const { data: item, error: itemErr } = await client
    .from("invoice_items")
    .update({ meter_start: meterStart, meter_end: meterEnd })
    .eq("id", itemId)
    .select()
    .single();
  if (itemErr || !item) return fail(itemErr?.message ?? "Item tidak ditemukan.");
  const invoiceId = item.invoice_id as string;

  const rate = Number(item.unit_price_idr ?? 0);
  const amount = (meterEnd - meterStart) * rate;

  await client
    .from("invoice_items")
    .update({ qty: meterEnd - meterStart, amount_idr: amount, description: `Listrik ${meterEnd - meterStart} kWh` })
    .eq("id", itemId);

  await client.rpc("kos_refresh_invoice", { p_invoice: invoiceId });
  revalidatePath("/tagihan");
  revalidatePath("/");
  return ok();
}

export async function addExtraItemAction(formData: FormData) {
  const res = await requireOwner();
  if ("err" in res) return fail(res.err);
  const { client } = res;
  const invoiceId = String(formData.get("invoice_id") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const kind = String(formData.get("kind") ?? "extra");
  const amount = Number(String(formData.get("amount_idr") ?? "").replace(/[^\d-]/g, "")) || 0;
  const reason = String(formData.get("reason") ?? "");

  if (!invoiceId || !description || amount === 0) return fail("Deskripsi dan nominal wajib diisi.");

  const { error } = await client.from("invoice_items").insert({
    invoice_id: invoiceId,
    kind: kind === "discount" ? "discount" : "extra",
    description,
    amount_idr: kind === "discount" ? -Math.abs(amount) : Math.abs(amount),
    reason,
  });
  if (error) return fail(error.message);

  await client.rpc("kos_refresh_invoice", { p_invoice: invoiceId });
  revalidatePath(`/tagihan`);
  return ok();
}

export async function removeLateFeeAction(formData: FormData) {
  const res = await requireOwner();
  if ("err" in res) return fail(res.err);
  const { client } = res;
  const invoiceId = String(formData.get("invoice_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!invoiceId || !reason) return fail("Alasan penghapusan denda wajib diisi (tercatat di log).");

  const { error } = await client
    .from("invoice_items")
    .delete()
    .eq("invoice_id", invoiceId)
    .eq("kind", "late_fee");
  if (error) return fail(error.message);

  await client.from("invoices").update({ late_fee_idr: 0 }).eq("id", invoiceId);
  await client.rpc("kos_refresh_invoice", { p_invoice: invoiceId });

  // Terlog di audit_log lewat audit table (pemilik dianggap actor org)
  const { data: { user } } = await client.auth.getUser();
  await client.from("audit_log").insert({
    org_id: null,
    actor_id: user?.id ?? null,
    action: "delete",
    entity: "late_fee",
    entity_id: invoiceId,
    after: JSON.stringify({ reason }),
  });

  revalidatePath("/tagihan");
  return ok();
}

/* ---------- F8: pengeluaran ---------- */

export async function addExpenseAction(formData: FormData) {
  const res = await requireOwner();
  if ("err" in res) return fail(res.err);
  const { org, client } = res;

  const propertyId = String(formData.get("property_id") ?? "");
  const category = String(formData.get("category") ?? "");
  const amount = Number(String(formData.get("amount_idr") ?? "").replace(/[^\d]/g, "")) || 0;
  const spentOn = String(formData.get("spent_on") ?? "");
  const note = String(formData.get("note") ?? "");
  const recurring = formData.get("recurring") === "on";

  const categories = ["listrik_pln", "air", "wifi", "kebersihan", "perbaikan", "pajak", "gaji_penjaga", "lainnya"];
  if (!propertyId || !categories.includes(category)) return fail("Kategori tidak dikenal.");
  if (amount <= 0) return fail("Nominal harus lebih dari 0.");
  if (!spentOn) return fail("Isi tanggal pengeluaran.");

  const { error } = await client.from("expenses").insert({
    property_id: propertyId,
    category,
    amount_idr: amount,
    spent_on: spentOn,
    note,
    recurring,
    created_by: (await getOwnerContext())?.user.user_id,
    // org_id tidak ada di tabel; RLS memeriksa lewat properties — ok
  });
  if (error) return fail(error.message);
  void org;
  revalidatePath("/pengeluaran");
  revalidatePath("/laporan");
  return ok();
}

export async function deleteExpenseAction(formData: FormData) {
  const res = await requireOwner();
  if ("err" in res) return fail(res.err);
  const { client } = res;
  const id = String(formData.get("id") ?? "");
  const { error } = await client.from("expenses").delete().eq("id", id);
  if (error) return fail(error.message);
  revalidatePath("/pengeluaran");
  revalidatePath("/laporan");
  return ok();
}

/* ---------- F9: kerusakan ---------- */

export async function updateTicketAction(formData: FormData) {
  const ctx = await getOwnerContext();
  if (!ctx?.org) return fail("Silakan login.");
  const client = await sb();
  if (!client) return fail("Koneksi database gagal.");

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const notes = String(formData.get("notes") ?? "");
  if (!["baru", "diproses", "selesai"].includes(status)) return fail("Status tidak dikenal.");

  const { error } = await client.from("tickets").update({ status, notes }).eq("id", id);
  if (error) return fail(error.message);
  revalidatePath("/kerusakan");
  return ok();
}

export async function chargeTicketAction(formData: FormData) {
  const res = await requireOwner();
  if ("err" in res) return fail(res.err);
  const { client } = res;

  const ticketId = String(formData.get("ticket_id") ?? "");
  const invoiceId = String(formData.get("invoice_id") ?? "");
  const amount = Number(String(formData.get("amount_idr") ?? "").replace(/[^\d]/g, "")) || 0;
  const target = String(formData.get("target") ?? "expense");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!ticketId || amount <= 0) return fail("Nominal harus lebih dari 0.");

  if (target === "invoice") {
    if (!invoiceId) return fail("Pilih tagihan terbuka.");
    if (!reason) return fail("Alasan pembebanan wajib diisi.");
    const { error } = await client.from("invoice_items").insert({
      invoice_id: invoiceId,
      kind: "extra",
      description: "Biaya perbaikan kerusakan",
      amount_idr: amount,
      reason,
    });
    if (error) return fail(error.message);
    await client.rpc("kos_refresh_invoice", { p_invoice: invoiceId });
  } else {
    const { error } = await client.from("expenses").insert({
      property_id: String(formData.get("property_id") ?? ""),
      category: "perbaikan",
      amount_idr: amount,
      spent_on: new Date().toISOString().slice(0, 10),
      note: `Kerusakan: ${reason || "tanpa keterangan"}`,
      recurring: false,
    });
    if (error) return fail(error.message);
  }

  await client.from("tickets").update({ cost_idr: amount }).eq("id", ticketId);
  revalidatePath("/kerusakan");
  revalidatePath("/pengeluaran");
  return ok();
}

/* ---------- F10: check-out ---------- */

export async function checkoutAction(formData: FormData) {
  const res = await requireOwner();
  if ("err" in res) return fail(res.err);
  const { client } = res;

  const leaseId = String(formData.get("lease_id") ?? "");
  const checkoutDate = String(formData.get("checkout_date") ?? "");
  const finalMeterRaw = String(formData.get("final_meter") ?? "");

  const deductions: { reason: string; amount_idr: number }[] = [];
  let i = 0;
  while (formData.get(`ded_amount_${i}`) != null) {
    const amount = Number(String(formData.get(`ded_amount_${i}`) ?? "").replace(/[^\d]/g, "")) || 0;
    const reason = String(formData.get(`ded_reason_${i}`) ?? "");
    if (amount > 0 && reason) deductions.push({ reason, amount_idr: amount });
    i++;
  }

  if (!leaseId || !checkoutDate) return fail("Lengkapi tanggal keluar.");

  // Deposit & sisa tagihan diambil dari server, bukan dioptimalkan di browser
  const { data: lease, error: leaseErr } = await client
    .from("leases")
    .select("deposit_idr, room_id, tenant_id")
    .eq("id", leaseId)
    .single();
  if (leaseErr || !lease) return fail("Kontrak tidak ditemukan.");

  const { data: unpaid } = await client
    .from("invoices")
    .select("total_idr, paid_idr")
    .eq("lease_id", leaseId)
    .neq("status", "paid");
  const unpaidTotal = (unpaid ?? []).reduce((a, r) => a + (r.total_idr - r.paid_idr), 0);

  const deductionsTotal = deductions.reduce((a, d) => a + d.amount_idr, 0);
  const refund = Math.max(lease.deposit_idr - deductionsTotal - unpaidTotal, 0);

  // Simpan rincian check-out
  const { data: co, error } = await client
    .from("checkouts")
    .insert({
      lease_id: leaseId,
      checkout_date: checkoutDate,
      final_meter: Number(finalMeterRaw.replace(/[^\d]/g, "")) || null,
      deductions,
      deposit_refund_idr: refund,
      created_by: ((await getOwnerContext())?.user.user_id) ?? null,
    })
    .select()
    .single();
  if (error) return fail(error.message);

  // Kontrak berakhir; kamar otomatis kosong lagi
  await client.from("leases").update({ status: "ended", end_date: checkoutDate }).eq("id", leaseId);
  if (lease.room_id) {
    await client.from("rooms").update({ under_maintenance: false }).eq("id", lease.room_id);
  }

  revalidatePath("/kamar");
  revalidatePath("/penghuni");
  return ok({ checkout_id: co?.id, refund, unpaid_total: unpaidTotal });
}

/* ---------- F1: pengaturan ---------- */

export async function updatePropertyAction(formData: FormData) {
  const res = await requireOwner();
  if ("err" in res) return fail(res.err);
  const { org, client } = res;

  const propertyId = String(formData.get("property_id") ?? "");
  const billingMode = String(formData.get("billing_mode") ?? "anniversary");
  const billingDay = Number(formData.get("billing_day_fixed") ?? 1);
  const issueDays = Number(formData.get("issue_days") ?? 7);
  const graceDays = Number(formData.get("grace_days") ?? 3);
  const prorata = formData.get("prorata_fixed_first") === "on";
  const feeEnabled = formData.get("late_fee_enabled") === "on";
  const feeMode = String(formData.get("late_fee_mode") ?? "flat");
  const feeAmount = Number(String(formData.get("late_fee_amount") ?? "").replace(/[^\d]/g, "")) || 0;
  const feeMax = Number(String(formData.get("late_fee_max") ?? "").replace(/[^\d]/g, "")) || 0;
  const rulesText = String(formData.get("rules_text") ?? "");

  const settings = {
    billing_mode: ["anniversary", "fixed"].includes(billingMode) ? billingMode : "anniversary",
    billing_day_fixed: Math.min(Math.max(billingDay, 1), 28),
    issue_days: Math.min(Math.max(issueDays, 0), 30),
    grace_days: Math.max(graceDays, 0),
    prorata_fixed_first: prorata,
    late_fee: {
      enabled: feeEnabled,
      mode: ["flat", "daily"].includes(feeMode) ? feeMode : "flat",
      amount_idr: feeAmount,
      max_idr: feeMax,
    },
    reminder_templates: remindersDefaultTemplates(),
  };

  const { error } = await client
    .from("properties")
    .update({ billing_settings: settings, rules_text: rulesText, org_id: org.orgId })
    .eq("id", propertyId);
  if (error) return fail(error.message);
  revalidatePath("/pengaturan");
  return ok();
}

function remindersDefaultTemplates() {
  return {
    ramah: "Halo {nama}, ini dari {kos}. Semoga baik ya. Mengingatkan sewa {periode} yang jatuh tempo tanggal {tanggal}: {total}. Buat kasir (lihat rincian): {portal_url}",
    pengingat: "Halo {nama}, sewa kos kamu tanggal {tanggal} kegigihan senilai {total}. Bisa dilunasi lewat rekening/QRIS di sini: {portal_url}",
    tegas: "Halo {nama}, dengan sopan kami bilang: sewa {periode} mulai terlambat {telat}. Percayakan pembayaran sekarang lewat: {portal_url}. Dengan terima kasih, {kos}.",
  };
}

/* ---------- F1: metode pembayaran ---------- */

export async function addPaymentMethodAction(formData: FormData) {
  const res = await requireOwner();
  if ("err" in res) return fail(res.err);
  const { client } = res;

  const propertyId = String(formData.get("property_id") ?? "");
  const kind = String(formData.get("kind") ?? "bank");
  const bankName = String(formData.get("bank_name") ?? "");
  const accountNo = String(formData.get("account_no") ?? "").trim();
  const accountName = String(formData.get("account_name") ?? "").trim();

  if (!propertyId) return fail("Pilih properti.");
  if (kind === "bank" && (!bankName || !accountNo)) return fail("Nama bank & nomor rekening wajib.");
  if (!accountName) return fail("Atas nama rekening wajib diisi.");

  const { error } = await client.from("payment_methods").insert({
    property_id: propertyId,
    kind,
    bank_name: bankName,
    account_no: accountNo,
    account_name: accountName,
  });
  if (error) return fail(error.message);
  revalidatePath("/pengaturan");
  return ok();
}

export async function deletePaymentMethodAction(formData: FormData) {
  const res = await requireOwner();
  if ("err" in res) return fail(res.err);
  const { client } = res;
  const id = String(formData.get("id") ?? "");
  const { error } = await client.from("payment_methods").delete().eq("id", id);
  if (error) return fail(error.message);
  revalidatePath("/pengaturan");
  return ok();
}

/* ---------- F11: langganan ---------- */

export async function requestPlanAction(formData: FormData) {
  const res = await requireOwner();
  if ("err" in res) return fail(res.err);
  const { org, client } = res;

  const plan = String(formData.get("plan") ?? "");
  const planPrices: Record<string, number> = { kos: 39000, kos_plus: 79000 };
  if (!(plan in planPrices)) return fail("Paket tidak dikenal.");

  const path = String(formData.get("proof_path") ?? "");
  if (!path) return fail("Unggah bukti transfer terlebih dahulu.");

  const { error } = await client.from("payment_proofs").insert({
    org_id: org.orgId,
    plan: plan as "kos" | "kos_plus",
    amount_idr: planPrices[plan],
    proof_path: path,
  });
  if (error) return fail(error.message);

  revalidatePath("/paket");
  return ok({ message: "Bukti terkirim. Kami verifikasi maksimal 1x24 jam." });
}

export async function approvePlanAction(formData: FormData) {
  const client = await sb();
  if (!client) return fail("Koneksi database gagal.");
  const ctx = await getOwnerContext();
  if (!ctx) return fail("Silakan login.");

  const { data: isAdmin } = await client
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", ctx.user.user_id)
    .single();
  if (!isAdmin) return fail("Hanya super-admin yang bisa menyetujui.");

  const proofId = String(formData.get("proof_id") ?? "");
  const decision = String(formData.get("decision") ?? "");

  if (decision === "approve") {
    const { data: proof } = await client
      .from("payment_proofs")
      .update({ status: "approved", reviewed_by: ctx.user.user_id, reviewed_at: new Date().toISOString() })
      .eq("id", proofId)
      .select()
      .single();
    if (proof) {
      const expires = new Date();
      expires.setMonth(expires.getMonth() + 1);
      await client
        .from("organizations")
        .update({ plan: proof.plan, plan_expires_at: expires.toISOString().slice(0, 10) })
        .eq("id", proof.org_id);
    }
  } else {
    await client
      .from("payment_proofs")
      .update({ status: "rejected", reviewed_by: ctx.user.user_id, reviewed_at: new Date().toISOString() })
      .eq("id", proofId);
  }

  revalidatePath("/admin");
  return ok();
}

/* ---------- Bantu: unggah file privat di server ---------- */

export async function uploadPrivateFileProxy(
  file: File,
  orgId: string,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const admin = sbAdmin();
  if (!admin) return { ok: false, error: "Storage belum dikonfigurasi." };

  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) return { ok: false, error: "Ukuran file maksimal 5 MB." };
  if (!/^(image\/(gif|jpe?g|png|webp)|application\/pdf)$/.test(file.type)) {
    return { ok: false, error: "Hanya gambar JPG/PNG/WebP/PDF." };
  }

  const bytes = await file.arrayBuffer();
  const path = `${orgId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.]/g, "_")}`;
  const { error } = await admin.storage.from("private-files").upload(path, bytes, { contentType: file.type });
  if (error) return { ok: false, error: error.message };
  return { ok: true, path };
}
