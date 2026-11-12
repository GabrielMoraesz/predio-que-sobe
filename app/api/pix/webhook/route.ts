import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { SEGREDO } from '@/lib/servidor';
import { cobrancaPaga } from '@/lib/pix';

// Aviso do banco (padrão BACEN: { pix: [{ txid, valor, horario, ... }] }).
// Não confiamos no conteúdo: para cada txid, perguntamos ao banco se a cobrança foi mesmo paga.
export async function POST(req: Request) {
  let body: { pix?: { txid?: string }[] } = {};
  try { body = await req.json(); } catch { /* corpo vazio */ }
  for (const p of body.pix || []) {
    if (!p.txid || !/^[a-zA-Z0-9]{26,35}$/.test(p.txid)) continue;
    try { if (await cobrancaPaga(p.txid)) await supabase.rpc('confirmar_pagamento', { p_segredo: SEGREDO(), p_txid: p.txid }); }
    catch (e) { console.error('webhook pix', e); }
  }
  return NextResponse.json({ ok: true });
}
