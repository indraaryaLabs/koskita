import Link from "next/link";
import { SideNav, BottomNav } from "@/components/nav";
import { EmptyState } from "@/components/ui";
import { getOwnerContext, missingEnv } from "@/lib/supabase";

/**
 * Kerangka setiap halaman pemilik: navigasi bawah (HP) & sidebar (desktop),
 * plus panel panduan bila Supabase memang belum dikonfigurasi atau belum onboarding.
 */
export async function OwnerShell({
  children,
  title,
  requireOrg = true,
  caretakerAllowed = true,
}: {
  children: React.ReactNode;
  title: string;
  requireOrg?: boolean;
  caretakerAllowed?: boolean;
}) {
  const ctx = await getOwnerContext();
  const envMissing = missingEnv();

  let info: React.ReactNode = null;
  if (envMissing) {
    info = (
      <EmptyState
        title="Supabase belum terhubung"
        description="Isi NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, dan SUPABASE_SERVICE_ROLE_KEY di file .env.local, lalu jalankan migrasi. Panduan lengkap ada di README."
      />
    );
  } else if (!ctx || !ctx.org) {
    if (requireOrg) {
      info = (
        <EmptyState title="Mulai pengaturan" description="Selesaikan pendaftaran dulu untuk set nama kos Anda.">
          <Link href="/login" className="btn btn-primary">
            Masuk / Daftar
          </Link>
        </EmptyState>
      );
    }
  } else if (!caretakerAllowed && ctx.org.role === "caretaker") {
    info = <EmptyState title="Khusus pemilik" description="Menu ini hanya bisa dibuka oleh pemilik kos." />;
  }

  return (
    <div className="flex min-h-dvh">
      <SideNav />
      <main className="flex-1 px-4 pb-28 pt-6 md:pb-10 md:px-8">
        <header className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-ink-muted)" }}>
            {ctx?.org?.orgName ?? "KosKita"}
          </p>
          <h1 className="text-2xl font-extrabold md:text-3xl">{title}</h1>
        </header>
        {info && (
          <div className="max-w-3xl">{info}</div>
        )}
        {ctx?.org ? children : null}
      </main>
      <BottomNav />
    </div>
  );
}
