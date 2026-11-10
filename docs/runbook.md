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

Project Supabase ini tidak memiliki `pg_cron` aktif. Karena itu, Vercel Schedules menjalankan
`GET /api/cron/run` setiap hari pukul 05:30 UTC (13:30 WITA) berdasarkan `vercel.json`.
Vercel mengirim `Authorization: Bearer <CRON_SECRET>`; endpoint menolak permintaan tanpa rahasia
tersebut, lalu memanggil `generate_invoices` dan `apply_late_fees`.

Jika kemudian mengaktifkan `pg_cron`, hapus jadwal Vercel agar proses tagihan tidak dipanggil dua kali.
Untuk pemanggilan manual, gunakan `POST https://<domain>/api/cron/run` dengan header yang sama.

Cek manual bila `pg_cron` diaktifkan:
```sql
select * from cron.job;
select * from cron.job_run_details order by start_time desc limit 5;
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
