import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { cookiePortariaOk, corpo, erro, SEGREDO, senhaAdminOk } from '@/lib/servidor';

// Roda o censo na hora (botão do admin) ou esconde/mostra um morador.
export async function POST(req: Request) {
  const b = await corpo<{ senha: string; acao: 'censo' | 'esconder' | 'mostrar' | 'pedidos' | 'confirmar' | 'reembolsos' | 'devolver'; handle?: string; txid?: string }>(req);
  if (!b || (!senhaAdminOk(b.senha) && !cookiePortariaOk(req))) return erro('proibido', 401);
  if (b!.acao === 'censo') {
    const r = await supabase.rpc('rodar_censo', { p_segredo: SEGREDO() });
    if (r.error) return erro('falha', 500);
    revalidatePath('/');
    return NextResponse.json(r.data);
  }
  if (b!.acao === 'pedidos') {
    const r = await supabase.rpc('pedidos_pendentes', { p_segredo: SEGREDO() });
    if (r.error) return erro('falha', 500);
    return NextResponse.json(r.data);
  }
  if (b!.acao === 'reembolsos') {
    const r = await supabase.rpc('reembolsos_pendentes', { p_segredo: SEGREDO() });
    if (r.error) return erro('falha', 500);
    return NextResponse.json(r.data);
  }
  if (b!.acao === 'devolver') {
    if (!b!.txid || !/^[A-Za-z0-9]{1,35}$/.test(b!.txid)) return erro('pedido_nao_encontrado');
    const r = await supabase.rpc('devolver_pedido', { p_segredo: SEGREDO(), p_txid: b!.txid });
    if (r.error) return erro('falha', 500);
    revalidatePath('/');
    return NextResponse.json({ ok: true });
  }
  if (b!.acao === 'confirmar') {
    if (!b!.txid || !/^[A-Za-z0-9]{1,35}$/.test(b!.txid)) return erro('pedido_nao_encontrado');
    const r = await supabase.rpc('confirmar_pagamento', { p_segredo: SEGREDO(), p_txid: b!.txid });
    if (r.error) return erro('falha', 500);
    revalidatePath('/');
    return NextResponse.json({ ok: true });
  }
  const r = await supabase.rpc('esconder_morador', { p_segredo: SEGREDO(), p_handle: b!.handle || '', p_oculto: b!.acao === 'esconder' });
  if (r.error) return erro('falha', 500);
  revalidatePath('/');
  return NextResponse.json({ ok: !!r.data });
}
