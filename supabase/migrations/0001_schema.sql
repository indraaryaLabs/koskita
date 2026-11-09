-- KosKita — skema G-PRD bagian 10
-- Uang = bigint rupiah. Tanggal = date (UTC/Asia per properti). Tidak ada float.

create extension if not exists "pgcrypto";

-- ============ Organisasi & akses ============
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'gratis'
    check (plan in ('gratis', 'kos', 'kos_plus')),
  plan_expires_at date,
  created_at timestamptz not null default now()
);

-- Daftar super-admin konsol langganan (diisi manual lewat SQL, tidak di UI)
create table if not exists platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create table if not exists org_members (
  org_id uuid not null references organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'caretaker')),
  primary key (org_id, user_id)
);

-- ============ Properti & pengaturan (F1) ============
create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  code text not null check (code ~ '^[A-Z]{3,5}$'),
  address text not null default '',
  type text not null default 'campur' check (type in ('putra', 'putri', 'campur')),
  timezone text not null default 'Asia/Jakarta',
  photo_path text,
  -- Aturan tagihan: billing_mode, issue_days, grace_days, late_fee, billing_day_fixed, prorata_fixed_first, reminder_templates
  billing_settings jsonb not null default '{}'::jsonb,
  rules_text text not null default '',
  unique (org_id, code),
  created_at timestamptz not null default now()
);

create table if not exists payment_methods (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties (id) on delete cascade,
  kind text not null check (kind in ('bank', 'qris')),
  bank_name text,
  account_no text,
  account_name text,
  qris_path text
);

-- ============ Kamar (F2) ============
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties (id) on delete cascade,
  name text not null,
  floor int not null default 1,
  room_type text not null default '',
  price_idr bigint not null default 0 check (price_idr >= 0),
  facilities text[] not null default '{}',
  photo_path text,
  under_maintenance boolean not null default false,
  unique (property_id, name),
  created_at timestamptz not null default now()
);

-- ============ Penghuni & kontrak (F3) ============
create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  phone_e164 text not null default '',
  occupation text not null default '',
  emergency_contact jsonb not null default '{}'::jsonb,
  id_card_path text,
  portal_token text not null unique
    check (length(portal_token) >= 24),
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists leases (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms (id) on delete cascade,
  tenant_id uuid not null references tenants (id) on delete cascade,
  start_date date not null,
  end_date date, -- null = masih aktif
  period_months int not null default 1 check (period_months in (1, 3, 6, 12)),
  rent_idr bigint not null check (rent_idr >= 0),
  deposit_idr bigint not null default 0 check (deposit_idr >= 0),
  electricity_mode text not null default 'token'
    check (electricity_mode in ('included', 'per_kwh', 'token')),
  electricity_rate_idr bigint not null default 0 check (electricity_rate_idr >= 0),
  status text not null default 'active' check (status in ('active', 'ended')),
  created_at timestamptz not null default now(),
  exclusion using gist (
    room_id with =,
    daterange(start_date, coalesce(end_date, 'infinity'::date)) with &&
  ) where (status = 'active')
);

create table if not exists lease_charges (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references leases (id) on delete cascade,
  name text not null,
  amount_idr bigint not null default 0 check (amount_idr >= 0)
);

-- ============ Tagihan (F4) ============
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties (id) on delete cascade,
  lease_id uuid not null references leases (id) on delete cascade,
  number text not null unique,
  period_start date not null,
  period_end date not null,
  due_date date not null,
  status text not null default 'draft'
    check (status in ('draft', 'issued', 'partially_paid', 'paid')),
  total_idr bigint not null default 0 check (total_idr >= 0),
  paid_idr bigint not null default 0 check (paid_idr >= 0),
  late_fee_idr bigint not null default 0 check (late_fee_idr >= 0),
  issued_at timestamptz,
  created_at timestamptz not null default now(),
  unique (lease_id, period_start)
);

create table if not exists invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices (id) on delete cascade,
  kind text not null
    check (kind in ('rent', 'fixed', 'electricity', 'extra', 'discount', 'late_fee', 'checkout_damage')),
  description text not null default '',
  qty numeric not null default 1,
  unit_price_idr bigint not null default 0,
  -- diskon boleh negatif; jenis lain wajib >= 0
  amount_idr bigint not null
    check (kind = 'discount' or amount_idr >= 0),
  meter_start bigint,
  meter_end bigint,
  reason text not null default ''
);

-- ============ Pembayaran & kwitansi (F7) ============
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices (id) on delete cascade,
  amount_idr bigint not null check (amount_idr > 0),
  paid_on date not null,
  method text not null check (method in ('transfer', 'tunai', 'qris')),
  proof_path text,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  reject_reason text not null default '',
  recorded_by uuid references auth.users (id),
  receipt_number text unique,
  created_at timestamptz not null default now()
);

create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices (id) on delete cascade,
  template text not null check (template in ('ramah', 'pengingat', 'tegas')),
  sent_by uuid references auth.users (id),
  sent_at timestamptz not null default now()
);

-- ============ Pengeluaran (F8) ============
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties (id) on delete cascade,
  category text not null
    check (category in ('listrik_pln', 'air', 'wifi', 'kebersihan', 'perbaikan', 'pajak', 'gaji_penjaga', 'lainnya')),
  amount_idr bigint not null check (amount_idr > 0),
  spent_on date not null,
  note text not null default '',
  receipt_path text,
  recurring boolean not null default false,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

-- ============ Kerusakan (F9) ============
create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties (id) on delete cascade,
  room_id uuid not null references rooms (id) on delete cascade,
  tenant_id uuid references tenants (id) on delete set null,
  category text not null check (category in ('kamar', 'listrik', 'air', 'pintu_jendela', 'kamar_mandi', 'lainnya')),
  description text not null,
  photo_path text,
  status text not null default 'baru' check (status in ('baru', 'diproses', 'selesai')),
  notes text not null default '',
  cost_idr bigint not null default 0 check (cost_idr >= 0),
  billed_to_invoice_id uuid references invoices (id) on set null,
  created_at timestamptz not null default now()
);

-- ============ Check-out & deposit (F10) ============
create table if not exists checkouts (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null unique references leases (id) on delete cascade,
  checkout_date date not null,
  final_meter bigint,
  deductions jsonb not null default '[]'::jsonb, -- [{reason, amount_idr}]
  deposit_refund_idr bigint not null default 0,
  statement_path text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

-- ============ Penomoran dokumen ============
create table if not exists doc_counters (
  property_id uuid not null references properties (id) on delete cascade,
  doc_type text not null check (doc_type in ('INV', 'KW', 'CO')),
  period text not null, -- YYYYMM
  last_no int not null default 0,
  primary key (property_id, doc_type, period)
);

-- ============ Langganan aplikasi (F11) ============
create table if not exists payment_proofs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  plan text not null check (plan in ('kos', 'kos_plus')),
  amount_idr bigint not null check (amount_idr > 0),
  proof_path text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============ Log audit (bagian 11) ============
create table if not exists audit_log (
  id bigint generated always as identity primary key,
  org_id uuid,
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create index if not exists invoices_due_idx on invoices (due_date);
create index if not exists invoices_property_idx on invoices (property_id);
create index if not exists invoices_lease_idx on invoices (lease_id);
create index if not exists payments_invoice_idx on payments (invoice_id);
create index if not exists payments_status_idx on payments (status);
create index if not exists expenses_property_idx on expenses (property_id, spent_on);
create index if not exists tickets_property_idx on tickets (property_id, status);
create index if not exists leases_room_idx on leases (room_id, status);
create index if not exists audit_log_org_idx on audit_log (org_id, created_at);
create index if not exists rooms_property_idx on rooms (property_id);

-- Audit log otomatis untuk semua aksi uang
create or replace function kos_audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
begin
  if tg_table_name in ('invoices') then
    select property_id into v_org from properties p
    join invoices i on i.property_id = p.id where i.id = coalesce(new.id, old.id);
  elsif tg_table_name = 'payments' then
    select p.org_id into v_org from properties p
    join invoices i on i.property_id = p.id
    where i.id = coalesce(new.invoice_id, old.invoice_id);
  elsif tg_table_name = 'expenses' then
    select org_id into v_org from properties where id = coalesce(new.property_id, old.property_id);
  end if;

  insert into audit_log (org_id, actor_id, action, entity, entity_id, before, after)
  values (v_org, auth.uid(), lower(tg_op), tg_table_name,
          coalesce(new.id, old.id),
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return coalesce(new, old);
end;
$$;

drop trigger if exists audit_invoices on invoices;
create trigger audit_invoices after insert or delete
  on invoices for each row execute function kos_audit();

drop trigger if exists audit_payments on payments;
create trigger audit_payments after update or delete
  on payments for each row execute function kos_audit();

drop trigger if exists audit_expenses on expenses;
create trigger audit_expenses after delete
  on expenses for each row execute function kos_audit();

-- Saat pembayaran diverifikasi → tambah paid_idr & perbarui status tagihan
create or replace function kos_apply_payment() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_new_paid bigint;
  v_total bigint;
begin
  if old.status = 'verified' then
    return new; -- sudah diterapkan
  end if;

  if new.status = 'verified' then
    if new.receipt_number is null or nullif(new.receipt_number, '') = '' then
      new.receipt_number := kos_next_doc_number(
        (select i.property_id from invoices i where i.id = new.invoice_id),
        'KW', to_char(new.paid_on, 'YYYYMM'));
    end if;

    update invoices i
      set paid_idr = (select coalesce(sum(amount_idr), 0) from payments
                      where invoice_id = i.id and status = 'verified'),
          status = case
            when (select coalesce(sum(amount_idr), 0) from payments
                  where invoice_id = i.id and status = 'verified') >= i.total_idr
            then 'paid' else 'partially_paid' end
    where i.id = new.invoice_id;
  end if;

  select coalesce(paid_idr, 0), coalesce(total_idr, 0) into v_new_paid, v_total
  from invoices i where i.id = new.invoice_id;

  if new.status = 'rejected' then
    update invoices i
      set paid_idr = (select coalesce(sum(amount_idr), 0) from payments
                      where invoice_id = i.id and status = 'verified'),
          status = case
            when (select coalesce(sum(amount_idr), 0) from payments
                  where invoice_id = i.id and status = 'verified') >= i.total_idr
            then 'paid'
            when (select coalesce(sum(amount_idr), 0) from payments
                  where invoice_id = i.id and status = 'verified') > 0
            then 'partially_paid'
            else 'issued' end
    where i.id = new.invoice_id;
  end if;

  return new;
end;
$$;

create or replace trigger trg_apply_payment
  after insert or update of status on payments
  for each row execute function kos_apply_payment();
