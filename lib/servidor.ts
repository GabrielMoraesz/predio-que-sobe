import { timingSafeEqual, createHash, createHmac } from 'node:crypto';
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

// Portaria no celular: depois de entrar uma vez, um cookie httpOnly assinado com o segredo dispensa a senha.
export const COOKIE_PORTARIA = 'portaria';
export function tokenPortaria() {
  return createHmac('sha256', SEGREDO()).update('portaria-v1').digest('hex');
}
export function cookiePortariaOk(req: Request) {
  if (!process.env.SERVIDOR_SEGREDO) return false;
  const m = (req.headers.get('cookie') || '').match(/(?:^|;\s*)portaria=([a-f0-9]{64})/);
  if (!m) return false;
  const a = Buffer.from(m[1]), b = Buffer.from(tokenPortaria());
  return a.length === b.length && timingSafeEqual(a, b);
}
