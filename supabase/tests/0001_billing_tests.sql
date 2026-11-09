-- Koskita — pgTAP: mesin tagihan, denda, constraint kontrak, penomoran, portal.
-- Jalankan: `supabase test db` (memerlukan migrasi 0001–0003 sudah diterapkan).
-- Skrip diakhiri ROLLBACK: tidak menyisakan data.

begin;
select plan(25);

-- ================================================================
-- Fixture: 1 organisasi; setiap kasus membuat properti & kamar sendiri
-- ================================================================
insert into organizations (name, plan)
select 'Test Org', 'gratis'
where not exists (select 1 from organizations where name = 'Test Org');

create or replace function mk_case(p_settings jsonb, p_leases jsonb) returns uuid
language plpgsql as $$
declare
  v_prop uuid;
  v_room uuid;
  v_ten uuid;
  v_lease uuid;
  v_row jsonb;
  v_i int;
begin
  insert into properties (org_id, name, code, billing_settings)
  values (
    (select id from organizations where name = 'Test Org'),
    'Prop ' || substr(md5(random()::text), 1, 6),
    'T' || upper(substr(md5(random()::text), 1, 4)),
    p_settings)
  returning id into v_prop;

  for v_i, v_row in (select * from jsonb_array_elements(p_leases) with ordinality as x(v, o) order by x.o) loop
    insert into rooms (property_id, name, price_idr)
    values (v_prop, 'R' || v_i, (v_row->>'rent')::bigint)
    returning id into v_room;

    insert into tenants (org_id, name, phone_e164, portal_token)
    values ((select id from organizations where name = 'Test Org'),
            'TP ' || v_i || '-' || substr(md5(random()::text), 1, 6),
            '+62812000' || v_i,
            'tok-' || md5(random()::text) || substr(md5(random()::text), 1, 10))
    returning id into v_ten;

    insert into leases (room_id, tenant_id, start_date, end_date, period_months, rent_idr, deposit_idr, electricity_mode, electricity_rate_idr)
    values (v_room, v_ten,
            (v_row->>'start')::date,
            (v_row->>'end')::date,
            coalesce((v_row->>'months')::int, 1),
            (v_row->>'rent')::bigint,
            0,
            coalesce(v_row->>'elec', 'token'),
            coalesce((v_row->>'rate')::bigint, 0))
    returning id into v_lease;
  end loop;

  return v_lease;
end;
$$;

-- Kasus 0: kontrak dasar anniversary, listrik termasuk
select mk_case('{}'::jsonb, '[{"start":"2026-11-01","rent":1000000,"elec":"included"}]'::jsonb) as base_lease \gset

-- ============ 1–4. kos_add_months, tanggal sulit ============
select is(kos_add_months(date '2025-01-31', 31, 1), date '2025-02-28',
          'T1: 31 Jan 2025 +1 bln = 28 Feb 2025');
select is(kos_add_months(date '2024-01-31', 31, 1), date '2024-02-29',
          'T2: 31 Jan 2024 (kabisat) +1 bln = 29 Feb 2024');
select is(kos_add_months(date '2025-01-31', 31, 2), date '2025-03-31',
          'T3: 31 Jan +2 bln = 31 Mar (tidak pindah hari)');
select is(kos_add_months(date '2026-02-28', 28, 12), date '2027-02-28',
          'T4: 28 Feb +12 bln tetap 28 Feb');

-- ============ 5. anniversary: tagihan pertama ============
perform generate_invoices(date '2026-11-01');
select is(
  (select count(*)::text from invoices),
  '1',
  'T5: kontrak aktif menghasilkan 1 tagihan saat tanggal masuk');

select is(
  (select due_date::text from invoices limit 1),
  '2026-11-01',
  'T6: jatuh tempo anniversary = tanggal masuk');

-- ============ 7–8. idempoten dan penomoran ============
perform generate_invoices(date '2026-11-01');
select is(
  (select count(*)::text from invoices),
  '1',
  'T7: dijalankan berulang → tidak ada tagihan ganda');

perform generate_invoices(date '2026-11-25'); -- H-7 jatuh tempo berikutnya (1 Des)
select is(
  (select count(*)::text from invoices),
  '2',
  'T8: H-7 menghasilkan tagihan periode berikutnya');

select is(
  (select number::text from invoices where due_date = date '2026-12-01'),
  'INV/' || (select code from properties p join invoices i on i.property_id = p.id where i.due_date = date '2026-12-01') || '/202612/0001',
  'T9: nomor tagihan INV/{kode}/{YYYYMM}/{urut}');

-- ============ 10. kontrak 3 bulan di tengah periode ============
select mk_case('{}'::jsonb, '[{"start":"2026-01-10","months":3,"rent":3000000,"elec":"included"}]'::jsonb) \gset lease3_
perform generate_invoices(date '2026-01-05');
select is(
  (select count(*)::text from invoices where lease_id = :'lease3_'),
  '1',
  'T10: periode 3 bulan — tagihan pertama terbit H-7');

-- ============ 11–12. tanggal tetap + prorata ============
select mk_case(
  '{"billing_mode":"fixed","billing_day_fixed":5}'::jsonb,
  '[{"start":"2026-06-20","rent":1000000,"elec":"included"}]'::jsonb) \gset lease_fix_
perform generate_invoices(date '2026-06-25');
select is(
  (select amount_idr::text from invoice_items
   where kind = 'rent' and invoice_id in (select id from invoices where lease_id = :'lease_fix_')),
  '483871',
  'T11: prorata harian — masuk 20 dgn tanggal tetap 5 = 15/31 × sewa');

select mk_case(
  '{"billing_mode":"fixed","billing_day_fixed":5,"prorata_fixed_first":false}'::jsonb,
  '[{"start":"2026-06-20","rent":1000000,"elec":"included"}]'::jsonb) \gset lease_fix2_
perform generate_invoices(date '2026-06-25');
select is(
  (select amount_idr::text from invoice_items
   where kind = 'rent' and invoice_id in (select id from invoices where lease_id = :'lease_fix2_')),
  '1000000',
  'T12: prorata dimatikan → sewa penuh');

-- ============ 13. februari ============
select mk_case('{}'::jsonb, '[{"start":"2026-02-01","rent":1000000,"elec":"included"}]'::jsonb) \gset lease_feb_
perform generate_invoices(date '2026-02-22');
select is(
  (select count(*)::text from invoices where lease_id = :'lease_feb_' and due_date between date '2026-02-01' and date '2026-03-01'),
  '2',
  'T13: masuk 1 Feb — dua jatuh tempo Feb & Mar dibuat sebelum Februari habis');

-- ============ 14–15. listrik & draft ============
select mk_case('{}', '[{"start":"2026-11-01","rent":1000000,"elec":"per_kwh","rate":1500}]'::jsonb) \gset lease_kwh_
perform generate_invoices(date '2026-11-01');
select is(
  (select status::text from invoices where lease_id = :'lease_kwh_'),
  'draft',
  'T14: listrik per kWh tanpa meteran → status Draft (muncul di “perlu dilengkapi”)');

update invoice_items
  set meter_start = 100, meter_end = 140, qty = 40, amount_idr = 60000, description = 'Listrik 40 kWh'
  where kind = 'electricity' and invoice_id = (select id from invoices where lease_id = :'lease_kwh_');
perform kos_refresh_invoice((select id from invoices where lease_id = :'lease_kwh_'));
select is(
  (select status::text from invoices where lease_id = :'lease_kwh_'),
  'issued',
  'T15: meteran diisi → Draft jadi Terbit');

-- ============ 16. biaya tetap ============
create or replace function mk_charges(p_lease uuid) returns void
language plpgsql as $$
begin
  insert into lease_charges (lease_id, name, amount_idr)
  values (p_lease, 'WiFi', 100000), (p_lease, 'Parkir', 50000);
end;
$$;
select mk_case('{}', '[{"start":"2026-11-01","rent":1000000,"elec":"included"}]'::jsonb) \gset lease_chg_
perform mk_charges(:'lease_chg_');
perform generate_invoices(date '2026-11-01');
select is(
  (select count(*)::text from invoice_items
   where kind = 'fixed' and invoice_id in (select id from invoices where lease_id = :'lease_chg_')),
  '2',
  'T16: biaya tetap (WiFi, Parkir) masuk rincian tagihan');

-- ============ 17–18. kontrak berakhir & exclusion constraint ============
select mk_case('{}', '[{"start":"2026-11-01","end":"2026-11-15","rent":1000000,"elec":"included"}]'::jsonb) \gset lease_end_
perform generate_invoices(date '2026-11-01');
perform generate_invoices(date '2026-11-25');
select is(
  (select count(*)::text from invoices where lease_id = :'lease_end_'),
  '2',
  'T17: kontrak dengan akhir di 15 → dua tagihan (masuk & periode akhir, prorata diurus check-out)');

select throws_ok(
  $$insert into leases (room_id, tenant_id, start_date, period_months, rent_idr, status)
    values ((select room_id from leases where id = :'lease_end_'),
            (select tenant_id from leases where id = :'lease_end_'),
            date '2026-11-10', 1, 900000, 'active')$$,
  '23B01',
  'T18: dua kontrak aktif tumpang tindih satu kamar ditolak database');

-- ============ 19. penomoran kwitansi berurutan ============
-- (pakai properti dari kasus denda; KW/202601 belum pernah dipakai)
select p.id as kw_prop, p.code as kw_code
from properties p
where p.id = (select property_id from invoices where lease_id = :'lease_fee_' limit 1)
\gset

select is(
  kos_next_doc_number(:'kw_prop', 'KW', '202601'),
  'KW/' || :'kw_code' || '/202601/0001',
  'T19a: kwitansi pertama');
select is(
  kos_next_doc_number(:'kw_prop', 'KW', '202601'),
  'KW/' || :'kw_code' || '/202601/0002',
  'T19b: kwitansi kedua menaik urut');

-- ============ 20–22. denda ============
select mk_case(
  '{"late_fee":{"enabled":false,"mode":"daily","amount_idr":5000,"max_idr":50000},"grace_days":3}'::jsonb,
  '[{"start":"2026-01-01","rent":1000000,"elec":"included"}]'::jsonb) \gset lease_nofee_
perform generate_invoices(date '2026-01-01');
perform apply_late_fees(date '2026-02-15');
select is(
  (select coalesce(late_fee_idr, 0)::text from invoices where lease_id = :'lease_nofee_'),
  '0',
  'T20: denda nonaktif (default) → tidak ada denda');

select mk_case(
  '{"late_fee":{"enabled":true,"mode":"daily","amount_idr":5000,"max_idr":50000},"grace_days":3}'::jsonb,
  '[{"start":"2026-01-01","rent":1000000,"elec":"included"}]'::jsonb) \gset lease_fee_
perform generate_invoices(date '2026-01-01');
perform apply_late_fees(date '2026-01-10'); -- 6 hari lewat tenggang
select is(
  (select late_fee_idr::text from invoices where lease_id = :'lease_fee_'),
  '30000',
  'T21: denda harian = 5000 × 6 hari (setelah tenggang 3)');

perform apply_late_fees(date '2026-02-10'); -- cap 50.000
select is(
  (select late_fee_idr::text from invoices where lease_id = :'lease_fee_'),
  '50000',
  'T22: denda berhenti di batas maksimum, tidak bertambah lagi');

-- flat lepas masa tenggang
select mk_case(
  '{"late_fee":{"enabled":true,"mode":"flat","amount_idr":25000},"grace_days":3}'::jsonb,
  '[{"start":"2026-01-01","rent":1000000,"elec":"included"}]'::jsonb) \gset lease_flat_
perform generate_invoices(date '2026-01-01');
perform apply_late_fees(date '2026-01-05'); -- 1 hari lewat tenggang
select is(
  (select late_fee_idr::text from invoices where lease_id = :'lease_flat_'),
  '25000',
  'T23: denda flat sekali sepuluh ribu penuh setelah tenggang');
-- gris: dalam tenggang
select mk_case(
  '{"late_fee":{"enabled":true,"mode":"flat","amount_idr":25000},"grace_days":3}'::jsonb,
  '[{"start":"2026-01-01","rent":1000000,"elec":"included"}]'::jsonb) \gset lease_grace_
perform generate_invoices(date '2026-01-01');
perform apply_late_fees(date '2026-01-03'); -- belum lewat tenggang
select is(
  (select coalesce(late_fee_idr, 0)::text from invoices where lease_id = :'lease_grace_'),
  '0',
  'T24: masih di masa tenggang → denda tidak muncul');

select * from finish();
rollback;
