import { timingSafeEqual, createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
export const SEGREDO = () => {
  const s = process.env.SERVIDOR_SEGREDO;
  if (!s) throw new Error('SERVIDOR_SEGREDO não configurado');
  return s;
};
export const erro = (codigo: string, status = 400) => NextResponse.json({ erro: codigo }, { status });
export async function corpo<T>(req: Request): Promise<T | null> {
  try { return (await req.json()) as T; } catch { return null; }
}

// Admin: a senha digitada na página de admin é o próprio SERVIDOR_SEGREDO (conferido em tempo constante).
export function senhaAdminOk(senha: unknown) {
  const s = process.env.SERVIDOR_SEGREDO;
  if (!s || typeof senha !== 'string' || !senha) return false;
  const a = createHash('sha256').update(senha).digest(), b = createHash('sha256').update(s).digest();
  return timingSafeEqual(a, b);
}
