"use client";

/**
 * Unggah file ke bucket privat:
 * - Gambar dikompres ≤300 KB (PRD) dan diproses ulang lewat canvas sehingga
 *   metadata EXIF (GPS, dsb.) ikut hilang.
 * - PDF diteruskan setelah validasi ukuran/tipe.
 * - Semua unggahan dilayani server (kunci service only di server);
 *   akses pembacaan hanya via signed URL berumur pendek (≤10 menit).
 */

/** Kompres gambar + buang EXIF via canvas. */
export async function prepareImage(file: File, maxKB = 300): Promise<File> {
  if (file.type.startsWith("image/")) {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();

    let quality = 0.85;
    let blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b as Blob), "image/jpeg", quality),
    );
    while (blob.size > maxKB * 1024 && quality > 0.3) {
      quality -= 0.15;
      blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b as Blob), "image/jpeg", quality),
      );
    }
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  }
  if (file.size > 5 * 1024 * 1024) throw new Error("PDF maksimal 5 MB.");
  return file;
}

/** Target: POST multipart ke server. Server menentukan path & memvalidasi. */
async function uploadTo(url: string, file: File): Promise<string> {
  const prepared = await prepareImage(file);
  const form = new FormData();
  form.set("file", prepared);
  const res = await fetch(url, { method: "POST", body: form });
  const body = (await res.json()) as { ok: boolean; path?: string; error?: string };
  if (!res.ok || !body.ok || !body.path) throw new Error(body.error ?? "Gagal mengunggah.");
  return body.path;
}

export function uploadPlanProof(file: File): Promise<string> {
  return uploadTo("/api/plan/upload", file);
}

export function uploadPortalProof(token: string, file: File): Promise<string> {
  return uploadTo(`/api/portal/${token}/upload`, file);
}
