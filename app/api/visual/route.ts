import { NextResponse } from 'next/server';
import { codigoErro, supabase } from '@/lib/supabase';
import { corpo, erro } from '@/lib/servidor';

export async function POST(req: Request) {
  const b = await corpo<{ handle: string; chave: string; visual: Record<string, unknown> }>(req);
  if (!b?.handle || !b?.chave || typeof b.visual !== 'object') return erro('falha');
  const { data, error } = await supabase.rpc('salvar_visual', { p_handle: b.handle, p_chave: b.chave, p_visual: b.visual });
  if (error) { const c = codigoErro(error.message); return erro(c, c === 'chave_invalida' ? 401 : 400); }
  return NextResponse.json({ visual: data });
}
