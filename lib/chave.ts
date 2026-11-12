'use client';
// Chave de edição do boneco: fica só neste aparelho (e no link de edição que a pessoa guarda).
const k = (h: string) => `predio:chave:${h}`;
export function lerChave(handle: string): string | null {
  try {
    const m = location.hash.match(/k=([a-f0-9]{32})/);
    if (m) { localStorage.setItem(k(handle), m[1]); history.replaceState(null, '', location.pathname); return m[1]; }
    return localStorage.getItem(k(handle));
  } catch { return null; }
}
export function salvarChave(handle: string, chave: string) {
  try { localStorage.setItem(k(handle), chave); } catch { /* armazenamento bloqueado */ }
}
