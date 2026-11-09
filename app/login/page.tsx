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
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      const client = await browserClient();
      if (!client) {
        toast.error("Supabase belum dikonfigurasi di server ini.");
        return;
      }
      const redirectTo =
        (new URLSearchParams(window.location.search).get("next") ?? `${window.location.origin}/`);
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
    } finally {
      setSending(false);
    }
  }

  async function signInGoogle() {
    setGoogleBusy(true);
    try {
      const client = await browserClient();
      if (!client) {
        toast.error("Supabase belum dikonfigurasi di server ini.");
        return;
      }
      const { error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) toast.error(error.message);
    } finally {
      setGoogleBusy(false);
    }
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
            <button type="submit" className="btn btn-primary w-full" disabled={sending}>
              <LogIn size={18} aria-hidden />
              {sending ? "Mengirim…" : "Kirim tautan masuk"}
            </button>
          </form>
          <div className="flex items-center gap-3 text-sm" style={{ color: "var(--color-ink-muted)" }}>
            <span className="h-px flex-1" style={{ background: "var(--color-border)" }} />
            atau
            <span className="h-px flex-1" style={{ background: "var(--color-border)" }} />
          </div>
          <button onClick={signInGoogle} className="btn btn-ghost w-full" disabled={googleBusy}>
            {googleBusy ? "Membuka Google…" : "Masuk dengan Google"}
          </button>
          <p className="text-center text-xs" style={{ color: "var(--color-ink-muted)" }}>
            Belum punya akun? Kirim tautan ke email Anda — akun dibuat otomatis.
          </p>
        </div>
      )}
    </div>
  );
}
