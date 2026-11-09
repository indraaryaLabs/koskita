"use client";

import { useEffect, useRef, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function SubmitButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 size={18} className="animate-spin" aria-hidden />
          Memproses…
        </span>
      ) : (
        children
      )}
    </button>
  );
}

/**
 * Form dengan feedback jelas untuk pengguna usia 50+:
 * tombol "Memproses…", toast gagal/sukses yang jelas.
 * Server action menerima (formData) dan mengembalikan {ok,error}.
 */
export function ActionForm({
  action,
  children,
  className,
  successMessage,
  resetOnSuccess = false,
}: {
  action: (formData: FormData) => Promise<{ ok: boolean; error?: string; data?: unknown } | undefined>;
  children: React.ReactNode;
  className?: string;
  successMessage?: string;
  resetOnSuccess?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [, formAction] = useActionState(
    async (_prev: unknown, fd: FormData) => {
      try {
        const result = await action(fd);
        if (result && result.ok === false) {
          toast.error(result.error ?? "Terjadi masalah.");
        } else if (result) {
          toast.success(successMessage ?? "Berhasil.");
          if (resetOnSuccess && formRef.current) {
            formRef.current.reset();
          }
        }
        return result;
      } catch {
        toast.error("Koneksi bermasalah. Coba lagi.");
        return { ok: false, error: "Koneksi bermasalah." };
      }
    },
    null,
  );

  return (
    <form ref={formRef} className={className} action={formAction} aria-busy={undefined}>
      {children}
    </form>
  );
}
