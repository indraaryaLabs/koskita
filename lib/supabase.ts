import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

type CookieList = { name: string; value: string; options?: Record<string, unknown> }[];

/**
 * Klien Supabase sisi server, memakai sesi user yang login (sudah melewati RLS).
 * Dibuat per-request. Tidak melempar error saat env kosong (agar build lulus).
 */
export async function sb(): Promise<SupabaseClient | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  try {
    const store = await cookies();
    return createServerClient(url, anon, {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list: CookieList) => {
          for (const { name, value, options } of list) {
            try {
              store.set(name, value, options);
            } catch {
              /* dipanggil dari Server Component — dibiarkan middleware menyegarkan sesi */
            }
          }
        },
      },
    });
  } catch {
    return null;
  }
}

/** Klien service_role — hanya baca env di server (route handlers, cron RPC). */
export function sbAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServerClient(url, key, {
    cookies: { getAll: () => [], setAll: () => undefined },
  });
}

export function missingEnv(): boolean {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export type Profile = {
  user_id: string;
  email: string;
};

/** Data organisasi milik user yang login */
export type OrgContext = {
  orgId: string;
  orgName: string;
  role: "owner" | "caretaker";
  plan: string;
  planExpiresAt: string | null;
  maxRooms: number;
  maxProperties: number;
  caretakerAccount: boolean;
};

export const PLAN_LIMITS: Record<string, { rooms: number; properties: number; caretaker: boolean; brand: boolean }> = {
  gratis: { rooms: 5, properties: 1, caretaker: false, brand: true },
  kos: { rooms: 15, properties: 1, caretaker: false, brand: false },
  kos_plus: { rooms: 40, properties: 3, caretaker: true, brand: false },
};

/** Kumpulan semua konteks yang dibutuhkan setiap halaman pemilik. Null jika belum login / belum punya org. */
export async function getOwnerContext(): Promise<
  { user: Profile; org: OrgContext | null } | null
> {
  const client = await sb();
  if (!client) return null;
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return null;

  const { data: memberships } = await client
    .from("org_members")
    .select("role, organization:organizations!inner(id, name, plan, plan_expires_at)")
    .eq("user_id", user.id)
    .limit(1);

  type Row = {
    role: string;
    organization: { id: string; name: string; plan: string; plan_expires_at: string | null };
  };
  const membership = (memberships as Row[] | null)?.[0];
  if (!membership) return { user: { user_id: user.id, email: user.email ?? "" }, org: null };

  const plan = membership.organization.plan ?? "gratis";
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.gratis;
  return {
    user: { user_id: user.id, email: user.email ?? "" },
    org: {
      orgId: membership.organization.id,
      orgName: membership.organization.name,
      role: membership.role === "caretaker" ? "caretaker" : "owner",
      plan,
      planExpiresAt: membership.organization.plan_expires_at,
      maxRooms: limits.rooms,
      maxProperties: limits.properties,
      caretakerAccount: limits.caretaker,
    },
  };
}
