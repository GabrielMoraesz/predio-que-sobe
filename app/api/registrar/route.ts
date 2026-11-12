import { NextResponse } from 'next/server';
import { codigoErro, supabase } from '@/lib/supabase';
import { HANDLE_RE, normalizarHandle } from '@/lib/config';

export async function POST(req: Request) {
  let body: { handle?: string; consentiu?: boolean };
  try { body = await req.json(); } catch { return NextResponse.json({ erro: 'falha' }, { status: 400 }); }
  const h = normalizarHandle(String(body.handle || ''));
  if (!HANDLE_RE.test(h)) return NextResponse.json({ erro: 'handle_invalido' }, { status: 400 });
  if (body.consentiu !== true) return NextResponse.json({ erro: 'sem_consentimento' }, { status: 400 });
  const { data, error } = await supabase.rpc('registrar_morador', { p_handle: h, p_consentiu: true });
  if (error) {
    const msg = codigoErro(error.message);
    return NextResponse.json({ erro: msg }, { status: msg === 'falha' ? 502 : 400 });
  }
  return NextResponse.json(data);
}
