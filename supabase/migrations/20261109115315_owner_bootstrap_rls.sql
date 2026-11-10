-- Allow a signed-in user to create exactly one organization and bootstrap
-- their own owner membership without opening self-invite to existing orgs.
alter table public.organizations
  add column if not exists created_by uuid references auth.users (id) on delete set null default auth.uid();

create unique index if not exists organizations_created_by_unique
  on public.organizations (created_by)
  where created_by is not null;

drop policy if exists org_select on public.organizations;
create policy org_select on public.organizations for select
  to authenticated
  using (
    id in (select member_org_ids())
    or is_platform_admin()
    or created_by = (select auth.uid())
  );

drop policy if exists org_insert on public.organizations;
create policy org_insert on public.organizations for insert
  to authenticated
  with check (created_by = (select auth.uid()));

drop policy if exists org_update on public.organizations;
create policy org_update on public.organizations for update
  to authenticated
  using (has_role(id, '{owner}') or is_platform_admin())
  with check (
    (has_role(id, '{owner}') and created_by = (select auth.uid()))
    or is_platform_admin()
  );

drop policy if exists member_insert on public.org_members;
create policy member_insert on public.org_members for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and role = 'owner'
    and exists (
      select 1 from public.organizations o
      where o.id = org_id and o.created_by = (select auth.uid())
    )
  );
