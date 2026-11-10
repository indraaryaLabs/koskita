"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { LogIn } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseUrl, supabaseAnonKey } from "@/lib/expose";

/** Klien Supabase sisi browser (dibuat statis supaya tree-shake aman). */
async function browserClient(): Promise<SupabaseClient | null> {
  const { createBrowserClient } = await import("@supabase/ssr");
  const url = supabaseUrl;
  const anon = supabaseAnonKey;
  if (!url || !anon) return null;
  return createBrowserClient(url, anon);
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"link" | "password">("password");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  // Klien bersama
  const clientP = browserClient();

  async function withClient(
    fn: (client: SupabaseClient) => Promise<void>,
  ) {
    const client = await clientP;
    if (!client) {
      toast.error("Supabase belum dikonfigurasi di server ini.");
      return;
    }
    setBusy(true);
    try {
      await fn(client);
    } finally {
      setBusy(false);
    }
  }

  async function loginPassword(e: React.FormEvent) {
    e.preventDefault();
    await withClient(async (client) => {
      const redirectTo =
        new URLSearchParams(window.location.search).get("next") ??
        `${window.location.origin}/`;
      // 1) coba masuk dengan email + password
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (!error) {
        window.location.href = redirectTo;
        return;
      }
      if (error.status !== 400) {
        toast.error(error.message);
        return;
      }
      // 2) kredensial salah/kurang → coba daftar akun baru (lokal: langsung aktif)
      const { data: signed, error: errSignup } = await client.auth.signUp({
        email,
        password,
      });
      if (errSignup) {
        toast.error("Password salah untuk akun yang sudah ada.");
        return;
      }
      if (signed.session) {
        window.location.href = redirectTo;
      } else {
        // produksi: email konfirmasi diperlukan
        toast.success("Akun dibuat. Cek email untuk konfirmasi sebelum masuk.");
      }
    });
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    await withClient(async (client) => {
      const redirectTo =
        new URLSearchParams(window.location.search).get("next") ??
        `${window.location.origin}/`;
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}` },
      });
      if (error) {
        toast.error(error.message);
      } else {
        setSent(true);
        toast.success("Tautkan sudah dikirim ke email Anda.");
      }
    });
  }

  async function signInGoogle() {
    await withClient(async (client) => {
      const { error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) toast.error(error.message);
    });
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5">
      <Link href="/" className="mb-8 text-center text-3xl font-extrabold" style={{ color: "var(--color-primary)" }}>
        KosKita
      </Link>

      {sent ? (
        <div className="card p-6 text-center">
          <p className="text-xl font-bold">Cek email Anda</p>
          <p className="mt-2 text-[15px]" style={{ color: "var(--color-ink-muted)" }}>
            Kami mengirim tautan masuk ke <strong>{email}</strong>. Buka dari HP yang biasa Anda pakai.
          </p>
          <button onClick={() => setSent(false)} className="btn btn-ghost mt-4">
            Ganti email / kirim ulang
          </button>
        </div>
      ) : (
        <div className="card space-y-4 p-6">
          <h1 className="text-2xl font-extrabold">Masuk ke KosKita</h1>

          {/* Mode switching */}
          <div role="tablist" aria-label="Cara masuk" className="flex gap-2">
            <button
              role="tab"
              aria-selected={mode === "password"}
              onClick={() => setMode("password")}
              className={`btn flex-1 ${mode === "password" ? "btn-primary" : "btn-ghost"}`}
            >
              Email + password
            </button>
            <button
              role="tab"
              aria-selected={mode === "link"}
              onClick={() => setMode("link")}
              className={`btn flex-1 ${mode === "link" ? "btn-primary" : "btn-ghost"}`}
            >
              Tautan email
            </button>
          </div>

          {mode === "password" ? (
            <form onSubmit={loginPassword} className="space-y-3">
              <div>
                <label htmlFor="email" className="label">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="input"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="label">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="current-password"
                  className="input"
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="mt-1 text-xs" style={{ color: "var(--color-ink-muted)" }}>
                  Password salah atau akun baru? Otomatis membuat akun bila email belum terdaftar.
                </p>
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={busy}>
                <LogIn size={18} aria-hidden />
                {busy ? "Memproses…" : "Masuk"}
              </button>
            </form>
          ) : (
            <form onSubmit={sendMagicLink} className="space-y-3">
              <div>
                <label htmlFor="email" className="label">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="input"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={busy}>
                <LogIn size={18} aria-hidden />
                {busy ? "Mengirim…" : "Kirim tautan masuk"}
              </button>
              <p className="text-xs" style={{ color: "var(--color-ink-muted)" }}>
                Di komputer lokal, tautan tidak dikirim ke internetnya — terbuka di{" "}
                <a href="http://127.0.0.1:54324" target="_blank" rel="noreferrer" className="underline">
                  kotak kiriman Mailpit
                </a>{" "}
                (ini hanya saat mode review lokal; di produksi di-supply SMTP sungguhan).
              </p>
            </form>
          )}

          <div className="flex items-center gap-3 text-sm" style={{ color: "var(--color-ink-muted)" }}>
            <span className="h-px flex-1" style={{ background: "var(--color-border)" }} />
            atau
            <span className="h-px flex-1" style={{ background: "var(--color-border)" }} />
          </div>
          <button onClick={signInGoogle} className="btn btn-ghost w-full" disabled={busy}>
            {busy ? "Membuka Google…" : "Masuk dengan Google"}
          </button>
        </div>
      )}
    </div>
  );
}
