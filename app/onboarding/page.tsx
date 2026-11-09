import { redirect } from "next/navigation";
import { getOwnerContext, missingEnv, sb } from "@/lib/supabase";
import { OnboardingForm } from "./form";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  if (missingEnv()) redirect("/login");

  const ctx = await getOwnerContext();
  if (ctx?.org) redirect("/"); // sudah punya organisasi
  if (!ctx) redirect("/login");

  // Penting: org dibuat di aksi (server), jadi halaman hanya menampilkan form.
  const client = await sb();
  if (!client) redirect("/login");

  return (
    <main className="mx-auto max-w-xl px-5 py-10">
      <h1 className="mb-2 text-3xl font-extrabold">Siapkan kos Anda</h1>
      <p className="mb-6" style={{ color: "var(--color-ink-muted)" }}>
        Kurang dari 10 menit sampai layar “Hari ini” berisi tagihan nyata.
      </p>
      <OnboardingForm email={ctx.user.email} />
    </main>
  );
}
