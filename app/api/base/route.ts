import { NextResponse } from 'next/server';
import { codigoErro, supabase } from '@/lib/supabase';
import { corpo, erro } from '@/lib/servidor';

// Tom de pele e gênero: grátis, sem Pix.
export async function POST(req: Request) {
  const b = await corpo<{ handle: string; pele: number; genero: number }>(req);
  if (!b?.handle || !Number.isInteger(b.pele) || !Number.isInteger(b.genero)) return erro('itens_invalidos');
  const r = await supabase.rpc('salvar_base', { p_handle: b.handle, p_pele: b.pele, p_genero: b.genero });
  if (r.error) { const c = codigoErro(r.error.message); return erro(c, c === 'espere' ? 429 : 400); }
  return NextResponse.json(r.data);
}
