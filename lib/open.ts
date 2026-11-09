export function openWindowSafe(url: string): Window | null {
  const w = window.open(url, "_blank", "noopener,noreferrer");
  return w;
}
