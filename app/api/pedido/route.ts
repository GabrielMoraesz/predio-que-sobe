import { NextResponse } from 'next/server';
import { buscarMorador, codigoErro, supabase } from '@/lib/supabase';
import { GRATIS, visualDe, type Visual } from '@/lib/visual';
import { corpo, erro, SEGREDO } from '@/lib/servidor';
import { PIX_MODO, criarCobranca, novoTxid } from '@/lib/pix';

// Compra só com o @: o banco calcula o preço do visual e aplica quando o Pix for pago.
export async function POST(req: Request) {
  const b = await corpo<{ handle: string; visual: Record<string, unknown> }>(req);
  if (!b?.handle || !b.visual || typeof b.visual !== 'object') return erro('itens_invalidos');
  // se só mudou o que é grátis (pele e gênero), não tem Pix: o navegador salva pelo /api/base
  const m = await buscarMorador(b.handle);
  if (!m) return erro('nao_encontrado', 404);
  const atual = visualDe(m.handle, m.visual), novo = visualDe(m.handle, b.visual as Partial<Visual>);
  const pagos = (Object.keys({ ...atual, ...novo }) as (keyof Visual)[]).filter((k) => !(GRATIS as readonly string[]).includes(k));
  if (pagos.every((k) => (atual[k] ?? null) === (novo[k] ?? null))) return erro('gratis');
  const cot = await supabase.rpc('cotar_visual', { p_handle: b.handle, p_visual: b.visual });
  if (cot.error) { const c = codigoErro(cot.error.message); return erro(c, c === 'nao_encontrado' ? 404 : 400); }
  const valor = cot.data.valor_centavos as number;
  const txid = novoTxid();
  let cob;
  try { cob = await criarCobranca(txid, valor, `Predio que Sobe: visual do @${cot.data.handle}`); }
  catch (e) { console.error('pix', e); return erro('pix_indisponivel', 502); }
  const ped = await supabase.rpc('criar_pedido_visual', {
    p_segredo: SEGREDO(), p_handle: b.handle, p_visual: b.visual, p_valor: valor,
    p_txid: txid, p_copia_cola: cob.copiaECola, p_provedor: PIX_MODO, p_expira_em: cob.expiraEm.toISOString(),
  });
  if (ped.error) { console.error('pedido', ped.error.message); return erro(codigoErro(ped.error.message), 400); }
  return NextResponse.json({ id: ped.data.id, valor_centavos: valor, pix_copia_cola: cob.copiaECola, expira_em: cob.expiraEm, modo: PIX_MODO });
}
