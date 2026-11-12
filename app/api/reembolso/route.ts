import { NextResponse } from 'next/server';
import { codigoErro, supabase } from '@/lib/supabase';
import { corpo, erro } from '@/lib/servidor';

// O comprador pede a devolução com o código do pedido e o @ que recebeu o item.
export async function POST(req: Request) {
  const b = await corpo<{ codigo: string; handle: string; motivo?: string }>(req);
  if (!b?.codigo || !b?.handle || !/^[A-Za-z0-9]{6,35}$/.test(b.codigo.trim())) return erro('pedido_nao_encontrado');
  const r = await supabase.rpc('pedir_reembolso', { p_txid: b.codigo.trim(), p_handle: b.handle, p_motivo: (b.motivo || '').slice(0, 500) });
  if (r.error) return erro(codigoErro(r.error.message), 400);
  return NextResponse.json(r.data);
}
