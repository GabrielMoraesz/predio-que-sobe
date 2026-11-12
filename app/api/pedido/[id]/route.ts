import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { erro, SEGREDO } from '@/lib/servidor';
import { cobrancaPaga } from '@/lib/pix';

const UUID = /^[0-9a-f-]{36}$/;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return erro('pedido_nao_encontrado', 404);
  const { data } = await supabase.rpc('pedido_status', { p_id: id });
  if (!data) return erro('pedido_nao_encontrado', 404);
  let status = data.status as string;
  // enquanto estiver pendente, pergunta ao banco se já foi pago
  if (status === 'pendente' && data.provedor !== 'teste') {
    try {
      if (await cobrancaPaga(data.txid)) {
        await supabase.rpc('confirmar_pagamento', { p_segredo: SEGREDO(), p_txid: data.txid });
        status = 'pago';
      }
    } catch (e) { console.error('consulta pix', e); }
  }
  return NextResponse.json({ id, status, itens: data.itens, valor_centavos: data.valor_centavos }, { headers: { 'cache-control': 'no-store' } });
}
