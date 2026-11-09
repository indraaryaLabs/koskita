# KosKita — Kelola kos Anda dengan tenang

Aplikasi manajemen kos kecil (5–30 kamar): tagihan otomatis, pengingat WhatsApp sekali ketuk,
verifikasi bukti bayar, kwitansi PDF berpenomoran, pembukuan 12 bulan, portal penghuni tanpa akun.

- PRD: `PRD MVP — Manajemen Kos Kecil (5–30 Kamar).md`
- Keputusan penting: `docs/decisions/` (ADR 0001 model tagihan, ADR 0002 hosting di Vercel)
- Uang selalu **bigint rupiah** (tidak pernah float); data privat (KTP/bukti) di bucket privat.

## Setup — 10 langkah (≤ 15 menit)

1. **Buat project Supabase** di [supabase.com](https://supabase.com) (region Singapore terdekat).
2. **Salin kredensial**: Dashboard Supabase → Settings → API — catat Project URL, anon key, dan service_role key.
3. **Pasan env**: salin `.env.example` → `.env.local`, isi keempat nilai (lihat `docs/runbook.md`).
4. **Pasang migrasi**: `npx supabase link --project-ref <REF>` lalu `npx supabase db push` — menerapkan
   `supabase/migrations/0001…0003` (tabel, RLS, bucket privat, mesin tagihan, pg_cron).
5. **Jalankan tes database** (opsional tapi dianjurkan): `npx supabase test db` — 25 asersi pgTAP.
6. **Jalankan aplikasi**: `npm install` lalu `npm run dev` → buka http://localhost:3000.
7. **Masuk**: kirim tautan magic ke email Anda (atau Google). Onboarding: nama kos + `101-110`.
8. **Super-admin langganan** (sekali): SQL `insert into platform_admins (user_id) values ('<uuid-user-Anda>');`
9. **Deploy ke Vercel**: push repo ke GitHub → import di vercel.com → isi 4 env vars (termasuk `CRON_SECRET`) → Deploy.
10. **Verifikasi**: buka situs production, lakukan siklus nyata di `docs/field-test.md` dengan 2 pemilik uji.

## Perintah

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server pengembangan |
| `npm run build` | Build production |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tes lib (Vitest) |
| `npm run lint` | ESLint |
| `npx supabase db push` | Terapkan migrasi |
| `npx supabase test db` | pgTAP mesin tagihan |

## Arsitektur singkat

```
Next.js 15 (App Router)  ── Vercel (hosting, ADR 0002)
  ├─ Server Components + Server Actions (app/)
  ├─ RLS-first: setiap query lewat klien user; service_role hanya route khusus
  └─ Portal penghuni: token URL, tanpa akun → RPC security definer
Supabase ── Postgres + RLS + pg_cron (generate_invoices/apply_late_fees)
         └─ Storage privat (KTP, bukti, kwitansi) — akses signed URL ≤ 10 menit
```

## Struktur folder penting

- `app/` — halaman (Hari ini, Kamar, Tagihan, Laporan, Penghuni, …) + `app/actions.ts` (semua aksi tulis)
- `lib/` — klien Supabase, format uang/tanggal, template WhatsApp, PDF, helper data
- `supabase/migrations/` — skema + RLS + fungsi tagihan idempoten
- `supabase/tests/` — pgTAP 25 asersi (kalender sulit, denda, penomoran, portal)
- `docs/` — runbook, checklist QA, skenario field test, ADR

## Keamanan uang & data

- Uang = kolom `bigint` rupiah; agregasi di SQL; tidak ada konversi float.
- Setiap tagihan bernomor unik `INV/{KODE}/{YYYYMM}/{0001}`; kwitansi `KW/…` dari `doc_counters` (row lock).
- Kontrak tumpang tindih satu kamar ditolak database (exclusion constraint, error 23B01).
- Aplikasi **tidak memegang uang**: pembayaran langsung ke rekening pemilik; kosKita hanya catat/verifikasi.
