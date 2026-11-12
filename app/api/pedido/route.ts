import { NextResponse } from 'next/server';
import { codigoErro, supabase } from '@/lib/supabase';
import { corpo, erro, SEGREDO } from '@/lib/servidor';
import { PIX_MODO, criarCobranca, novoTxid } from '@/lib/pix';

export async function POST(req: Request) {
  const b = await corpo<{ handle: string; chave: string; itens: string[] }>(req);
  if (!b?.handle || !b?.chave || !Array.isArray(b.itens)) return erro('itens_invalidos');
  // 1. o banco calcula o preço (nunca usamos valor vindo do navegador)
  const cot = await supabase.rpc('cotar', { p_handle: b.handle, p_chave: b.chave, p_itens: b.itens });
  if (cot.error) { const c = codigoErro(cot.error.message); return erro(c, c === 'chave_invalida' ? 401 : 400); }
  const valor = cot.data.valor_centavos as number;
  // 2. cria a cobrança Pix no banco (Itaú) ou de teste
  const txid = novoTxid();
  let cob;
  try { cob = await criarCobranca(txid, valor, `Prédio que Sobe: itens do @${b.handle}`); }
  catch (e) { console.error('pix', e); return erro('pix_indisponivel', 502); }
  // 3. registra o pedido amarrado ao txid
  const ped = await supabase.rpc('criar_pedido', {
    p_segredo: SEGREDO(), p_handle: b.handle, p_chave: b.chave, p_itens: b.itens, p_valor: valor,
    p_txid: txid, p_copia_cola: cob.copiaECola, p_provedor: PIX_MODO, p_expira_em: cob.expiraEm.toISOString(),
  });
  if (ped.error) { console.error('pedido', ped.error.message); return erro(codigoErro(ped.error.message), 400); }
  return NextResponse.json({ id: ped.data.id, valor_centavos: valor, pix_copia_cola: cob.copiaECola, expira_em: cob.expiraEm, modo: PIX_MODO });
}
