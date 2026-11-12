import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { corpo, erro, SEGREDO } from '@/lib/servidor';
import { PIX_MODO } from '@/lib/pix';

// Só existe no modo teste: confirma o pagamento sem dinheiro de verdade.
export async function POST(req: Request) {
  if (PIX_MODO !== 'teste') return erro('proibido', 403);
  const b = await corpo<{ id: string }>(req);
  const { data } = await supabase.rpc('pedido_status', { p_id: b?.id });
  if (!data || data.provedor !== 'teste') return erro('pedido_nao_encontrado', 404);
  const r = await supabase.rpc('confirmar_pagamento', { p_segredo: SEGREDO(), p_txid: data.txid });
  if (r.error) return erro('falha', 500);
  return NextResponse.json({ status: 'pago' });
}
