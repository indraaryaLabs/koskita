-- KosKita — mesin tagihan (F4), portal penghuni (F6), pg_cron.
-- Semua fungsi idempoten: aman dijalankan berulang (kunci unik lease + period_start).

-- ============ Penomoran berurutan dengan row lock ============
create or replace function kos_next_doc_number(
  p_property uuid, p_type text, p_period text
) returns text
language plpgsql as $$
declare
  v_no int;
  v_code text;
begin
  select code into v_code from properties where id = p_property;
  if v_code is null then
    raise exception 'properti tidak ditemukan';
  end if;

  insert into doc_counters (property_id, doc_type, period, last_no)
  values (p_property, p_type, p_period, 1)
  on conflict (property_id, doc_type, period)
  do update set last_no = doc_counters.last_no + 1
  returning last_no into v_no;

  return format('%s/%s/%s/%04d', p_type, v_code, p_period, v_no);
end;
$$;

-- ============ Hitung ulang total & status tagihan ============
/*
  Status:
  - 'draft'  jika komponen listrik (per kWh) belum diisi meteran (masuk daftar "perlu dilengkapi")
  - 'issued' jika sudah siap
  - 'partially_paid' / 'paid' diatur oleh trigger pembayaran, dan TIDAK ditimpa di sini
*/
create or replace function kos_refresh_invoice(p_invoice uuid)
language plpgsql as $$
declare
  v_total bigint;
  v_needs_meter boolean;
begin
  select coalesce(sum(amount_idr), 0) into v_total
  from invoice_items where invoice_id = p_invoice;

  select exists (
    select 1 from invoice_items
    where invoice_id = p_invoice
      and kind = 'electricity' and meter_end is null
  ) into v_needs_meter;

  update invoices
    set total_idr = greatest(v_total, 0),
        status = case
          when status in ('partially_paid', 'paid') then status
          when v_needs_meter then 'draft'
          else 'issued' end,
        issued_at = case
          when status in ('issued', 'partially_paid', 'paid')
               and issued_at is null then now()
          else issued_at end
  where id = p_invoice;
end;
$$;

-- ============ Aritmetika bulan tanpa drift (tanggal 29–31, Februari) ============
-- 31 Jan +1 bulan = 28/29 Feb;  +1 lagi = 31 Mar (bukan 28 Mar). Selalu dipatok ke base_day.
create or replace function kos_add_months(d date, base_day int, n int) returns date
language plpgsql immutable as $$
declare
  v_shifted date;
  v_last int;
begin
  v_shifted := (d + (n || ' months')::interval)::date;
  v_last := extract(day from (date_trunc('month', v_shifted) + interval '1 month - 1 day'))::int;
  return make_date(
    extract(year from v_shifted)::int,
    extract(month from v_shifted)::int,
    least(base_day, v_last));
end;
$$;

-- ============ generate_invoices(date) — F4 idempoten ============
/*
  Aturan keputusan (ADR 0001):
  - default anniversary: jatuh tempo tiap H+n periode sejak tanggal masuk
  - option fixed: tanggal tetap bulanan (periode > 1 bulan tetap memakai anniversary)
  - prorata harian bulan pertama (fixed), default aktif, bisa dimatikan
  - H-7 terbisa; denda diatur apply_late_fees
*/
create or replace function generate_invoices(p_date date default current_date)
returns int
language plpgsql security definer set search_path = public as $$
declare
  v_created int := 0;
  v_lease record;
  v_billing jsonb;
  v_mode text;
  v_fixed_day int;
  v_issue_days int;
  v_prorata boolean;
  v_period_months int;
  v_rent bigint;
  v_base_day int;
  v_period_start date;
  v_period_end date;
  v_due date;
  v_prorated bigint;
  v_days int;
  v_days_in_period int;
  v_invoice uuid;
  v_number text;
  v_charge record;
  v_window int;
  v_fixed_first_due date;
begin
  for v_lease in
    select l.*, r.property_id
    from leases l
    join rooms r on r.id = l.room_id
    where l.status = 'active'
      and l.start_date <= p_date
      and (l.end_date is null or l.end_date >= p_date)
  loop
    select coalesce(billing_settings, '{}'::jsonb) into v_billing
    from properties where id = v_lease.property_id;

    v_mode := coalesce(v_billing->>'billing_mode', 'anniversary');
    v_fixed_day := coalesce((v_billing->>'billing_day_fixed')::int, extract(day from v_lease.start_date)::int);
    if v_fixed_day > 28 then v_fixed_day := 28; end if; -- hindari klem tak terduga
    v_issue_days := coalesce((v_billing->>'issue_days')::int, 7);
    v_prorata := coalesce((v_billing->>'prorata_fixed_first')::boolean, true);
    v_period_months := v_lease.period_months;
    v_rent := v_lease.rent_idr;
    v_base_day := extract(day from v_lease.start_date)::int;
    v_window := v_period_months * 32 + v_issue_days; -- hanya periode relevan (bulan berjalan + terbit)

    -- ---------------------------------------------------------------
    -- MODE ANNIVERSARY (termasuk periode 3/6/12 bulan)
    -- ---------------------------------------------------------------
    if not (v_mode = 'fixed' and v_period_months = 1) then
      for v_n in 0..480 loop
        if v_n = 0 then
          v_period_start := v_lease.start_date;
          v_due := v_lease.start_date;
          v_prorated := v_rent; v_days := 0; v_days_in_period := 0;
        else
          v_due := kos_add_months(v_lease.start_date, v_base_day, v_n * v_period_months);
          v_period_start := kos_add_months(v_lease.start_date, v_base_day, (v_n - 1) * v_period_months) + 1;
          v_period_end := v_due - 1;
          v_prorated := v_rent; v_days := 0; v_days_in_period := 0;
        end if;

        exit when v_period_start > p_date
                  or v_due > p_date + v_issue_days
                  or (v_lease.end_date is not null and v_period_start > v_lease.end_date);
        continue when v_due < p_date - v_window
                       or exists (select 1 from invoices
                                  where lease_id = v_lease.id and period_start = v_period_start);

        v_number := kos_next_doc_number(v_lease.property_id, 'INV', to_char(v_due, 'YYYYMM'));
        insert into invoices (property_id, lease_id, number, period_start, period_end, due_date, status)
        values (v_lease.property_id, v_lease.id, v_number, v_period_start, v_period_end, v_due, 'draft')
        returning id into v_invoice;
        if v_invoice is not null then
          v_created := v_created + 1;
          insert into invoice_items (invoice_id, kind, description, qty, unit_price_idr, amount_idr)
          values (v_invoice, 'rent', 'Sewa kamar', 1, v_prorated, v_prorated);

          for v_charge in select name, amount_idr from lease_charges where lease_id = v_lease.id loop
            insert into invoice_items (invoice_id, kind, description, qty, unit_price_idr, amount_idr)
            values (v_invoice, 'fixed', v_charge.name, 1, v_charge.amount_idr, v_charge.amount_idr);
          end loop;

          if v_lease.electricity_mode = 'per_kwh' then
            insert into invoice_items (invoice_id, kind, description, qty, unit_price_idr, amount_idr)
            values (v_invoice, 'electricity', 'Listrik per kWh — menunggu angka meteran', 0, v_lease.electricity_rate_idr, 0);
          end if;

          perform kos_refresh_invoice(v_invoice);
        end if;
      end loop;
    else
    -- ---------------------------------------------------------------
    -- MODE TANGGAL TETAP (per bulan) + prorata harian opsional
    -- ---------------------------------------------------------------
      v_fixed_first_due := (date_trunc('month', v_lease.start_date))::date
        + ((v_fixed_day - 1) || ' days')::interval;
      if v_fixed_first_due < v_lease.start_date then
        v_fixed_first_due := kos_add_months(v_fixed_first_due, v_fixed_day, 1);
      end if;

      for v_n in 0..120 loop
        if v_n = 0 then
          v_due := v_fixed_first_due;
          v_period_start := v_lease.start_date;
          v_period_end := v_due - 1;

          v_days := v_due - v_lease.start_date;
          v_days_in_period := extract(day from (date_trunc('month', v_due) + interval '1 month - 1 day'))::int;
          if v_prorata and v_period_start < v_due and v_days > 0 and v_days < v_days_in_period then
            v_prorated := round(v_rent::numeric * v_days / v_days_in_period)::bigint;
            if v_prorated <= 0 then v_prorated := v_rent; end if;
          else
            v_prorated := v_rent; v_days := 0; v_days_in_period := 0;
          end if;
        else
          v_due := kos_add_months(v_due, v_fixed_day, 1);
          v_period_start := v_due - interval '1 month';
          v_period_end := v_due - 1;
          v_prorated := v_rent; v_days := 0; v_days_in_period := 0;
        end if;

        exit when v_period_start > p_date
                  or v_due > p_date + v_issue_days
                  or (v_lease.end_date is not null and v_period_start > v_lease.end_date);
        continue when v_period_start < p_date - v_window
                       or exists (select 1 from invoices
                                  where lease_id = v_lease.id and period_start = v_period_start);

        v_number := kos_next_doc_number(v_lease.property_id, 'INV', to_char(v_due, 'YYYYMM'));
        insert into invoices (property_id, lease_id, number, period_start, period_end, due_date, status)
        values (v_lease.property_id, v_lease.id, v_number, v_period_start, v_period_end, v_due, 'draft')
        returning id into v_invoice;
        if v_invoice is not null then
          v_created := v_created + 1;
          insert into invoice_items (invoice_id, kind, description, qty, unit_price_idr, amount_idr)
          values (v_invoice, 'rent',
                  case when v_days > 0 then 'Sewa kamar (prorata ' || v_days || ' hari)'
                       else 'Sewa kamar' end,
                  1, v_prorated, v_prorated);

          for v_charge in select name, amount_idr from lease_charges where lease_id = v_lease.id loop
            insert into invoice_items (invoice_id, kind, description, qty, unit_price_idr, amount_idr)
            values (v_invoice, 'fixed', v_charge.name, 1, v_charge.amount_idr, v_charge.amount_idr);
          end loop;

          if v_lease.electricity_mode = 'per_kwh' then
            insert into invoice_items (invoice_id, kind, description, qty, unit_price_idr, amount_idr)
            values (v_invoice, 'electricity', 'Listrik per kWh — menunggu angka meteran', 0, v_lease.electricity_rate_idr, 0);
          end if;

          perform kos_refresh_invoice(v_invoice);
        end if;

        if v_lease.end_date is not null and v_period_end >= v_lease.end_date then exit; end if;
      end loop;
    end if;
  end loop;

  return v_created;
end;
$$;

-- ============ apply_late_fees(date) — denda idempoten, berhenti di batas ============
create or replace function apply_late_fees(p_date date default current_date)
returns int
language plpgsql security definer set search_path = public as $$
declare
  v_changed int := 0;
  v_inv record;
  v_settings jsonb;
  v_enabled boolean;
  v_mode text;
  v_amount bigint;
  v_max bigint;
  v_grace int;
  v_days_late int;
  v_target bigint;
  v_delta bigint;
  v_item_id uuid;
begin
  for v_inv in
    select i.*, p.billing_settings
    from invoices i
    join properties p on p.id = i.property_id
    join leases l on l.id = i.lease_id
    where i.status in ('issued', 'partially_paid')
      and i.due_date < p_date
      and l.status = 'active'
      and l.start_date <= i.due_date
  loop
    v_settings := coalesce(v_inv.billing_settings, '{}'::jsonb);
    v_enabled := coalesce((v_settings->'late_fee'->>'enabled')::boolean, false);
    if not v_enabled then continue; end if;

    v_mode := coalesce(v_settings->'late_fee'->>'mode', 'flat');
    v_amount := coalesce((v_settings->'late_fee'->>'amount_idr')::bigint, 0);
    v_max := coalesce((v_settings->'late_fee'->>'max_idr')::bigint, 2147483647::bigint);
    v_grace := coalesce((v_settings->>'grace_days')::int, 3);

    v_days_late := p_date - v_inv.due_date - v_grace;
    if v_days_late <= 0 then continue; end if;

    if v_mode = 'flat' then
      v_target := least(v_amount, v_max);
    else
      v_target := least(v_amount * v_days_late, v_max);
    end if;

    v_delta := v_target - v_inv.late_fee_idr;
    if v_delta <= 0 then continue; end if; -- tidak menurunkan denda; pemilik menghapus manual (logged)

    select id into v_item_id from invoice_items
    where invoice_id = v_inv.id and kind = 'late_fee'
    limit 1;

    if v_item_id is not null then
      update invoice_items
        set amount_idr = v_target,
            description = case
              when v_mode = 'flat' then 'Denda keterlambatan'
              else 'Denda keterlambatan (' || v_days_late || ' hari)' end
        where id = v_item_id;
    else
      insert into invoice_items (invoice_id, kind, description, qty, unit_price_idr, amount_idr)
      values (v_inv.id, 'late_fee',
              case
                when v_mode = 'flat' then 'Denda keterlambatan'
                else 'Denda keterlambatan (' || v_days_late || ' hari)' end,
              1, v_target, v_target);
    end if;

    perform kos_refresh_invoice(v_inv.id);
    update invoices set late_fee_idr = v_target where id = v_inv.id;
    v_changed := v_changed + 1;
  end loop;

  return v_changed;
end;
$$;

-- ============ Fungsi portal penghuni (security definer; penghuni tanpa akun) ============
create or replace function portal_get(p_token text)
returns json
language plpgsql security definer set search_path = public as $$
declare
  v_tenant tenants;
  v_room rooms;
  v_prop properties;
begin
  select * into v_tenant from tenants
  where portal_token = p_token and archived_at is null;
  if v_tenant.id is null then
    return null;
  end if;

  select r.* into v_room
  from leases l join rooms r on r.id = l.room_id
  where l.tenant_id = v_tenant.id and l.status = 'active'
  order by l.start_date desc
  limit 1;

  if v_room.id is null then
    return json_build_object(
      'tenant', json_build_object('id', v_tenant.id, 'name', v_tenant.name),
      'room', null, 'property', null,
      'payment_methods', '[]'::json, 'invoices', '[]'::json, 'tickets', '[]'::json);
  end if;

  select p.* into v_prop from properties p where p.id = v_room.property_id;

  return json_build_object(
    'tenant', json_build_object(
      'id', v_tenant.id,
      'name', v_tenant.name,
      'phone_e164', v_tenant.phone_e164),
    'room', json_build_object(
      'name', v_room.name,
      'price_idr', v_room.price_idr),
    'property', json_build_object(
      'id', v_prop.id,
      'name', v_prop.name,
      'code', v_prop.code,
      'rules_text', v_prop.rules_text,
      'timezone', v_prop.timezone),
    'payment_methods', coalesce((
      select json_agg(json_build_object(
        'kind', pm.kind, 'bank_name', pm.bank_name,
        'account_no', pm.account_no, 'account_name', pm.account_name,
        'qris_path', pm.qris_path))
      from payment_methods pm where pm.property_id = v_prop.id
    ), '[]'::json),
    'invoices', coalesce((
      select json_agg(json_build_object(
        'id', i.id, 'number', i.number,
        'period_start', i.period_start, 'period_end', i.period_end,
        'due_date', i.due_date, 'status', i.status,
        'total_idr', i.total_idr, 'paid_idr', i.paid_idr,
        'late_fee_idr', i.late_fee_idr,
        'items', coalesce((
          select json_agg(json_build_object(
            'id', it.id, 'kind', it.kind, 'description', it.description,
            'amount_idr', it.amount_idr,
            'meter_start', it.meter_start, 'meter_end', it.meter_end))
          from invoice_items it where it.invoice_id = i.id
        ), '[]'::json),
        'payments', coalesce((
          select json_agg(json_build_object(
            'id', pay.id, 'amount_idr', pay.amount_idr, 'paid_on', pay.paid_on,
            'method', pay.method, 'status', pay.status,
            'receipt_number', pay.receipt_number, 'reject_reason', pay.reject_reason))
          from payments pay where pay.invoice_id = i.id order by pay.created_at desc
        ), '[]'::json)
      ) order by i.due_date desc)
      from invoices i
      join leases l2 on l2.id = i.lease_id
      where l2.tenant_id = v_tenant.id
    ), '[]'::json),
    'tickets', coalesce((
      select json_agg(json_build_object(
        'id', t.id, 'category', t.category, 'description', t.description,
        'status', t.status, 'notes', t.notes, 'created_at', t.created_at))
      from tickets t where t.tenant_id = v_tenant.id order by t.created_at desc
    ), '[]'::json));
end;
$$;

create or replace function portal_insert_ticket(
  p_token text, p_category text, p_description text, p_photo_path text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_tenant_id uuid;
  v_property uuid;
  v_room uuid;
  v_new uuid;
begin
  select t.id into v_tenant_id
  from tenants t
  join leases l on l.tenant_id = t.id and l.status = 'active'
  where t.portal_token = p_token and t.archived_at is null
  limit 1;
  if v_tenant_id is null then raise exception 'TAUTAN_TIDAK_VALID'; end if;

  select r.property_id, r.id into v_property, v_room
  from leases l join rooms r on r.id = l.room_id
  where l.tenant_id = v_tenant_id and l.status = 'active'
  limit 1;
  if v_room is null then raise exception 'TIDAK_ADA_KAMAR'; end if;

  insert into tickets (property_id, room_id, tenant_id, category, description, photo_path, status)
  values (v_property, v_room, v_tenant_id, p_category, p_description, p_photo_path, 'baru')
  returning id into v_new;
  return v_new;
end;
$$;

create or replace function portal_insert_payment(
  p_token text, p_invoice uuid, p_amount bigint, p_method text, p_paid_on date, p_proof_path text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_tenant_id uuid;
  v_id uuid;
begin
  select t.id into v_tenant_id from tenants t
  where t.portal_token = p_token and t.archived_at is null;
  if v_tenant_id is null then raise exception 'TAUTAN_TIDAK_VALID'; end if;

  if p_amount is null or p_amount <= 0 then raise exception 'NOMINAL_TIDAK_VALID'; end if;
  if p_method not in ('transfer', 'tunai', 'qris') then raise exception 'METODE_TIDAK_VALID'; end if;

  -- Validasi: tagihan milik penghuni ini dan belum lunas
  if not exists (
    select 1 from invoices i
    join leases l on l.id = i.lease_id
    where i.id = p_invoice
      and l.tenant_id = v_tenant_id
      and i.status in ('issued', 'partially_paid')
      and i.paid_idr < i.total_idr
  ) then
    raise exception 'TAGIHAN_TIDAK_SESUAI';
  end if;

  insert into payments (invoice_id, amount_idr, paid_on, method, proof_path, status)
  values (p_invoice, p_amount, p_paid_on, p_method, p_proof_path, 'pending')
  returning id into v_id;
  return v_id;
end;
$$;

-- Mesin tagihan hanya untuk service/cron/admin database. Portal mengakses fungsi tertutup.
revoke all on function generate_invoices(date) from public;
revoke all on function apply_late_fees(date) from public;
revoke all on function portal_insert_payment(text, uuid, bigint, text, date, text) from anon;
grant execute on function portal_insert_payment(text, uuid, bigint, text, date, text) to service_role;

-- ============ pg_cron — harian, aman dijalankan berulang ============
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if not exists (select 1 from cron.job where jobname = 'generate_invoices') then
      perform cron.schedule('generate_invoices', '10 4 * * *', $j$select generate_invoices(current_date)$j$);
    end if;
    if not exists (select 1 from cron.job where jobname = 'apply_late_fees') then
      perform cron.schedule('apply_late_fees', '30 5 * * *', $j$select apply_late_fees(current_date)$j$);
    end if;
  else
    raise notice 'pg_cron tidak aktif — jalankan generate_invoices(current_date) dan apply_late_fees(current_date) lewat penjadwal luar.';
  end if;
end;
$$;
