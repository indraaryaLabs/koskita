-- KosKita — RLS bagian 10/11: isolasi antar-organisasi, hak penjaga, portal penghuni.
-- Portal penghuni TIDAK membaca tabel langsung — semua lewat fungsi security definer di 0003.

alter table organizations enable row level security;
alter table org_members enable row level security;
alter table properties enable row level security;
alter table payment_methods enable row level security;
alter table rooms enable row level security;
alter table tenants enable row level security;
alter table leases enable row level security;
alter table lease_charges enable row level security;
alter table invoices enable row level security;
alter table invoice_items enable row level security;
alter table payments enable row level security;
alter table reminders enable row level security;
alter table expenses enable row level security;
alter table tickets enable row level security;
alter table checkouts enable row level security;
alter table doc_counters enable row level security;
alter table payment_proofs enable row level security;
alter table audit_log enable row level security;
alter table platform_admins enable row level security;

-- ===== Helper =====
create or replace function is_platform_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (
    select 1 from platform_admins where user_id = auth.uid())
$$;

create or replace function member_org_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select org_id from org_members where user_id = auth.uid()
$$;

create or replace function has_role(p_org uuid, p_roles text[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from org_members
    where org_id = p_org and user_id = auth.uid() and role = any(p_roles))
$$;

create or replace function member_role(p_org uuid) returns text
language sql stable security definer set search_path = public as $$
  select role from org_members where org_id = p_org and user_id = auth.uid()
  limit 1
$$;

-- ===== organizations / org_members =====
create policy org_select on organizations for select
  using (id in (select member_org_ids()) or is_platform_admin());
create policy org_update on organizations for update
  using (has_role(id, '{owner}') or is_platform_admin());

create policy member_select on org_members for select
  using (user_id = auth.uid()
         or org_id in (select member_org_ids())
         or is_platform_admin());
create policy member_insert on org_members for insert
  with check (org_id in (select member_org_ids() where false) -- tidak ada self-invite
              or auth.uid() is null and false);
create policy member_update on org_members for update
  using (has_role(org_id, '{owner}'));
create policy member_delete on org_members for delete
  using (has_role(org_id, '{owner}'));

-- ===== properties =====
create policy prop_select on properties for select
  using (org_id in (select member_org_ids()) or is_platform_admin());
create policy prop_insert on properties for insert
  with check (has_role(org_id, '{owner}'));
create policy prop_update on properties for update
  using (has_role(org_id, '{owner}', '{caretaker}'::text[])); -- penjaga boleh baca+sunting sementara
create policy prop_delete on properties for delete
  using (has_role(org_id, '{owner}'));

-- ===== payment_methods =====
create policy pm_select on payment_methods for select
  using (exists (select 1 from properties where id = property_id
                 and org_id in (select member_org_ids())));
create policy pm_all on payment_methods for all
  using (exists (select 1 from properties where id = property_id
                 and has_role(properties.org_id, '{owner}')));

-- ===== rooms =====
create policy room_select on rooms for select
  using (exists (
    select 1 from properties p where p.id = property_id
      and (p.org_id in (select member_org_ids()) or is_platform_admin())));
create policy room_insert on rooms for insert
  with check (exists (
    select 1 from properties p where p.id = property_id and has_role(p.org_id, '{owner}')));
create policy room_update on rooms for update
  using (exists (
    select 1 from properties p where p.id = property_id
      and has_role(p.org_id, '{owner}', 'caretaker')));
create policy room_delete on rooms for delete
  using (exists (
    select 1 from properties p where p.id = property_id and has_role(p.org_id, '{owner}')));

-- ===== tenants =====
create policy tenant_select on tenants for select
  using (org_id in (select member_org_ids()) or is_platform_admin());
create policy tenant_insert on tenants for insert
  with check (has_role(org_id, '{owner}'));
create policy tenant_update on tenants for update
  using (org_id in (select member_org_ids()));
create policy tenant_delete on tenants for delete
  using (has_role(org_id, '{owner}'));

-- ===== leases / lease_charges =====
create policy lease_select on leases for select
  using (exists (
    select 1 from rooms r join properties p on p.id = r.property_id
    where r.id = room_id
      and (p.org_id in (select member_org_ids()) or is_platform_admin())));
create policy lease_write on leases for insert
  with check (exists (
    select 1 from rooms r join properties p on p.id = r.property_id
    where r.id = room_id and has_role(p.org_id, '{owner}')));
create policy lease_update on leases for update
  using (exists (
    select 1 from rooms r join properties p on p.id = r.property_id
    where r.id = room_id and has_role(p.org_id, '{owner}')));
create policy lease_update_caretaker on leases for update
  using (exists (
    select 1 from rooms r join properties p on p.id = r.property_id
    where r.id = room_id and has_role(p.org_id, '{caretaker}')));

create policy lc_select on lease_charges for select
  using (exists (select 1 from leases where id = lease_id));
create policy lc_write on lease_charges for all
  using (exists (select 1 from leases where id = lease_id));

-- ===== invoices / invoice_items =====
-- Semua anggota organisasi (termasuk penjaga) boleh membaca tagihan, ini kebutuhan kerja.
-- Laporan keuangan (F11) diblokir untuk penjaga: tabel expenses tidak bisa dibaca.
create policy inv_select on invoices for select
  using (property_id in (select property_id from properties where org_id in (select member_org_ids())));
create policy inv_insert on invoices for insert
  with check (exists (
    select 1 from properties p where p.id = property_id and has_role(p.org_id, '{owner}')));
create policy inv_update on invoices for update
  using (exists (
    select 1 from properties p where p.id = property_id
      and has_role(p.org_id, '{owner}', 'caretaker')));
create policy inv_delete on invoices for delete
  using (is_platform_admin()); -- tetap ada penomoran unik, tidak ada penghapusan pemilik

create policy item_select on invoice_items for select
  using (exists (select 1 from invoices where id = invoice_id));
create policy item_write on invoice_items for all
  using (exists (select 1 from invoices where id = invoice_id));

-- ===== payments =====
create policy pay_select on payments for select
  using (exists (
    select 1 from invoices i join properties p on p.id = i.property_id
    where i.id = invoice_id and p.org_id in (select member_org_ids())));
create policy pay_insert on payments for insert
  with check (exists (
    select 1 from invoices i join properties p on p.id = i.property_id
    where i.id = invoice_id and has_role(p.org_id, '{owner}', 'caretaker')));
create policy pay_update on payments for update
  using (exists (
    select 1 from invoices i join properties p on p.id = i.property_id
    where i.id = invoice_id and has_role(p.org_id, '{owner}')));

-- ===== reminders =====
create policy rem_select on reminders for select
  using (exists (
    select 1 from invoices i join properties p on p.id = i.property_id
    where i.id = invoice_id and p.org_id in (select member_org_ids())));
create policy rem_insert on reminders for insert
  with check (exists (
    select 1 from invoices i join properties p on p.id = i.property_id
    where i.id = invoice_id and p.org_id in (select member_org_ids())));

-- ===== expenses (F11: penjaga TIDAK boleh melihat laporan keuangan) =====
create policy exp_select on expenses for select
  using (exists (
    select 1 from properties p where p.id = property_id
      and (has_role(p.org_id, '{owner}') or is_platform_admin())));
create policy exp_insert on expenses for insert
  with check (exists (
    select 1 from properties p where p.id = property_id and has_role(p.org_id, '{owner}')));
create policy exp_delete on expenses for delete
  using (exists (
    select 1 from properties p where p.id = property_id and has_role(p.org_id, '{owner}')));

-- ===== tickets =====
create policy tik_select on tickets for select
  using (exists (
    select 1 from properties p where p.id = property_id
      and (p.org_id in (select member_org_ids()) or is_platform_admin())));
create policy tik_insert on tickets for insert
  with check (exists (
    select 1 from properties p where p.id = property_id
      and has_role(p.org_id, '{owner}', 'caretaker')));
create policy tik_update on tickets for update
  using (exists (
    select 1 from properties p where p.id = property_id
      and has_role(p.org_id, '{owner}', 'caretaker')));

-- ===== checkouts =====
create policy co_select on checkouts for select
  using (exists (
    select 1 from leases l join rooms r on r.id = l.room_id
    join properties p on p.id = r.property_id
    where l.id = lease_id and p.org_id in (select member_org_ids())));
create policy co_insert on checkouts for insert
  with check (exists (
    select 1 from leases l join rooms r on r.id = l.room_id
    join properties p on p.id = r.property_id
    where l.id = lease_id and has_role(p.org_id, '{owner}')));

-- ===== doc_counters =====
create policy dc_select on doc_counters for select
  using (exists (
    select 1 from properties p where p.id = property_id
      and (p.org_id in (select member_org_ids()) or is_platform_admin())));

-- ===== payment_proofs (langganan) =====
create policy pp_select on payment_proofs for select
  using (org_id in (select member_org_ids())
         or is_platform_admin());
create policy pp_insert on payment_proofs for insert
  with check (has_role(org_id, '{owner}'));
create policy pp_update on payment_proofs for update
  using (is_platform_admin());

-- ===== audit_log: hanya organisasi sendiri =====
create policy log_select on audit_log for select
  using (org_id in (select member_org_ids()));
create policy admins_select_log on audit_log for select
  using (is_platform_admin());

-- ===== platform_admins =====
create policy admin_select on platform_admins for select
  using (user_id = auth.uid() or is_platform_admin());

-- ===== Storage: bucket privat =====
insert into storage.buckets (id, name, public)
values ('private-files', 'private-files', false)
on conflict (id) do nothing;

create policy bu_org_read on storage.objects for select
  to authenticated
  using (bucket_id = 'private-files' and (storage.foldername(name))[1] in (
    select org_id::text from org_members where user_id = auth.uid()
    union
    select id::text from properties
    where org_id in (select org_id from org_members where user_id = auth.uid()))
    or is_platform_admin());

create policy bu_org_write on storage.objects for insert
  to authenticated
  with check (bucket_id = 'private-files' and (storage.foldername(name))[1] in (
    select org_id::text from org_members where user_id = auth.uid()
    union
    select id::text from properties
    where org_id in (select org_id from org_members where user_id = auth.uid())));

-- Portal penghuni mengunggah bukti melalui service-role (server), bukan lewat policy ini.
