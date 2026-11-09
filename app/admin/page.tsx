import Link from "next/link";
import { getOwnerContext, sb, missingEnv } from "@/lib/supabase";
import { EmptyState } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { approvePlanAction } from "@/app/actions";
import { CheckCircle2, XCircle, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (missingEnv()) {
    return <EmptyState title="Supabase belum terhubung" description="Lengkapi env dulu (lihat README)." />;
  }
  const client = await sb();
  const ctx = await getOwnerContext();
  if (!client || !ctx) {
    return <EmptyState title="Harus masuk" description="Login dulu, lalu pastikan Anda terdaftar di tabel platform_admins." />;
  }

  const { data: isAdmin } = await client
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", ctx.user.user_id)
    .single();

  if (!isAdmin) {
    return (
      <EmptyState title="Khusus super-admin" description="Tabel platform_admins berisi user_id yang berhak memverifikasi langganan.">
        <Link href="/" className="btn btn-ghost">Kembali ke Hari ini</Link>
      </EmptyState>
    );
  }

  const [{ data: pending }, { data: orgs }] = await Promise.all([
    client
      .from("payment_proofs")
      .select("id, org_id, plan, amount_idr, status, created_at, org:organizations(name)")
      .order("created_at", { ascending: false })
      .limit(50),
    client.from("organizations").select("id, name, plan, plan_expires_at"),
  ]);

  const orgName = new Map((orgs ?? []).map((o) => [o.id, o.name]));

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <nav className="mb-6">
        <Link href="/" className="text-2xl font-extrabold" style={{ color: "var(--color-primary)" }}>
          KosKita
        </Link>
      </nav>
      <h1 className="text-3xl font-extrabold mb-1">Konsol admin langganan</h1>
      <p className="mb-8" style={{ color: "var(--color-ink-muted)" }}>
        Verifikasi bukti transfer paket. Paket aktif dgn sekali setujui (30 hari).
      </p>

      {(pending ?? []).length === 0 ? (
        <EmptyState title="Tidak ada permintaan" description="Bukti dari pemilik kos muncul di sini untuk diverifikasi." />
      ) : (
        <div className="space-y-3">
          {(pending ?? []).map((p) => (
            <div key={p.id} className="card p-4 space-y-2" role="listitem">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold">{(p.org as unknown as { name: string })?.name ?? "—"}</p>
                  <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
                    {p.plan} · {p.amount_idr.toLocaleString("id-ID")} · {p.created_at.slice(0, 10)}
                  </p>
                </div>
                <strong
                  style={{
                    color:
                      p.status === "approved"
                        ? "var(--color-paid)"
                        : p.status === "rejected"
                          ? "var(--color-late)"
                          : "var(--color-due)",
                  }}
                >
                  {p.status === "pending" ? "Menunggu" : p.status === "approved" ? "Disetujui" : "Ditolak"}
                </strong>
              </div>

              {p.status === "pending" && (
                <div className="grid grid-cols-2 gap-2">
                  <ActionForm action={approvePlanAction} successMessage="Paket diaktifkan 30 hari.">
                    <input type="hidden" name="proof_id" value={p.id} />
                    <input type="hidden" name="decision" value="approve" />
                    <SubmitButton className="btn btn-primary w-full">
                      <ShieldCheck size={16} aria-hidden /> Approve
                    </SubmitButton>
                  </ActionForm>
                  <ActionForm action={approvePlanAction} successMessage="Permintaan ditolak.">
                    <input type="hidden" name="proof_id" value={p.id} />
                    <input type="hidden" name="decision" value="reject" />
                    <SubmitButton className="btn btn-ghost w-full">
                      <XCircle size={16} aria-hidden /> Tolak
                    </SubmitButton>
                  </ActionForm>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="mt-8 flex items-center gap-2 text-sm" style={{ color: "var(--color-ink-muted)" }}>
        <CheckCircle2 size={16} aria-hidden /> Aksi tercatat otomatis di tabel payment_proofs (reviewer & waktu).
      </p>
    </main>
  );
}
