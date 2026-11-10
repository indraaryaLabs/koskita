-- Restrict SECURITY DEFINER routines to the roles that need them.
revoke all on function public.apply_late_fees(date) from public, anon, authenticated, service_role;
revoke all on function public.generate_invoices(date) from public, anon, authenticated, service_role;
revoke all on function public.has_role(uuid, text[]) from public, anon, authenticated, service_role;
revoke all on function public.is_platform_admin() from public, anon, authenticated, service_role;
revoke all on function public.kos_apply_payment() from public, anon, authenticated, service_role;
revoke all on function public.kos_audit() from public, anon, authenticated, service_role;
revoke all on function public.member_org_ids() from public, anon, authenticated, service_role;
revoke all on function public.member_role(uuid) from public, anon, authenticated, service_role;
revoke all on function public.portal_get(text) from public, anon, authenticated, service_role;
revoke all on function public.portal_insert_payment(text, uuid, bigint, text, date, text) from public, anon, authenticated, service_role;
revoke all on function public.portal_insert_ticket(text, text, text, text) from public, anon, authenticated, service_role;

grant execute on function public.has_role(uuid, text[]) to authenticated;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.member_org_ids() to authenticated;
grant execute on function public.member_role(uuid) to authenticated;

grant execute on function public.apply_late_fees(date) to service_role;
grant execute on function public.generate_invoices(date) to service_role;
grant execute on function public.portal_get(text) to service_role;
grant execute on function public.portal_insert_payment(text, uuid, bigint, text, date, text) to service_role;
grant execute on function public.portal_insert_ticket(text, text, text, text) to service_role;