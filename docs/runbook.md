# Runbook operasional — KosKita

Untuk pemilik/teknisi yang mengoperasikan aplikasi setelah deploy.

## 1. Variabel lingkungan

| Variabel | Di mana | Keterangan |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + `.env.local` | Dashboard Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel + `.env.local` | Kunci publik (dilindungi RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Hanya Vercel (server)** | Kunci admin. Jangan pernah di-commit |
| `NEXT_PUBLIC_APP_URL` | Vercel + `.env.local` | `https://<domain>`, dipakai di tautan portal |
| `CRON_SECRET` | Vercel | Rahasia pemanggil `/api/cron/run` |

## 2. Penjadwal tagihan

Utama: **pg_cron** di Supabase (didaftarkan migrasi 0003, jalan 04:10 & 05:30 UTC).

Cadangan bila project Supabase tidak memiliki pg_cron aktif:
GitHub Actions harian → POST `https://<domain>/api/cron/run` dengan header
`Authorization: Bearer <CRON_SECRET>` → memanggil `generate_invoices` lalu `apply_late_fees`.

Cek manual:
```sql
select * from cron.job;             -- jadwal terdaftar
select cron.job_run_details order by start_time desc limit 5;
```

## 3. Super-admin langganan

Setelah user pertama masuk (dapat `user_id` di `auth.users`):
```sql
insert into platform_admins (user_id) values ('<UUID-USER-ADMIN>');
```
Konsol `/admin` kini bisa memverifikasi bukti paket.

## 4. Penanganan insiden umum

| Gejala | Cek | Tindakan |
|---|---|---|
| Semua halaman "Supabase belum terhubung" | env di Vercel | isi & redeploy |
| Tagihan tidak terbit | `cron.job_run_details` error? | jalankan `select generate_invoices(current_date);` manual |
| Denda tidak muncul | `billing_settings.late_fee.enabled` | default mati; aktifkan di Pengaturan |
| Bukti tidak terunggah | bucket `private-files` & policy 0002 | pastikan migrasi diterapkan penuh |
| Kwitansi 404 | `payments.status = 'verified'` | kwitansi hanya untuk pembayaran terverifikasi |
| Duplikat tagihan | tidak boleh terjadi (idempoten + unique) | laporkan + salin `invoices.number` |

## 5. Backup & pemulihan

- Supabase backup harian otomatis (plan berbayar); untuk plan gratis, aktifkan export manual mingguan.
- Restorasi: buat project baru, jalankan migrasi 0001–0003, lalu restore data via `pg_dump`/CSV.

## 6. Rotasi kredensial

1. Ganti `CRON_SECRET` di Vercel; update GitHub Actions secret.
2. Rotate `SUPABASE_SERVICE_ROLE_KEY` via Dashboard (Settings → API), redeploy.
