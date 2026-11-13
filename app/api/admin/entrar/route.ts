import { NextResponse } from 'next/server';
import { COOKIE_PORTARIA, cookiePortariaOk, corpo, erro, senhaAdminOk, tokenPortaria } from '@/lib/servidor';

// Entra na portaria: confere a senha uma vez e grava um cookie que vale 90 dias neste aparelho.
export async function POST(req: Request) {
  const b = await corpo<{ senha?: string }>(req);
  if (!senhaAdminOk(b?.senha)) return erro('proibido', 401);
  const r = NextResponse.json({ ok: true });
  r.cookies.set(COOKIE_PORTARIA, tokenPortaria(), { httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: 60 * 60 * 24 * 90 });
  return r;
}

// Já está dentro?
export async function GET(req: Request) {
  return NextResponse.json({ dentro: cookiePortariaOk(req) });
}

// Sair deste aparelho.
export async function DELETE() {
  const r = NextResponse.json({ ok: true });
  r.cookies.set(COOKIE_PORTARIA, '', { httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: 0 });
  return r;
}
