import { NextResponse } from 'next/server';
import { codigoErro, supabase } from '@/lib/supabase';
import { corpo, erro } from '@/lib/servidor';

export async function POST(req: Request) {
  const b = await corpo<{ handle: string; chave: string }>(req);
  if (!b?.handle || !b?.chave) return erro('chave_invalida', 401);
  const { data, error } = await supabase.rpc('meus_itens', { p_handle: b.handle, p_chave: b.chave });
  if (error) return erro(codigoErro(error.message), 401);
  return NextResponse.json(data);
}
