import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { corpo, erro, SEGREDO, senhaAdminOk } from '@/lib/servidor';

// Roda o censo na hora (botão do admin) ou esconde/mostra um morador.
export async function POST(req: Request) {
  const b = await corpo<{ senha: string; acao: 'censo' | 'esconder' | 'mostrar'; handle?: string }>(req);
  if (!senhaAdminOk(b?.senha)) return erro('proibido', 401);
  if (b!.acao === 'censo') {
    const r = await supabase.rpc('rodar_censo', { p_segredo: SEGREDO() });
    if (r.error) return erro('falha', 500);
    revalidatePath('/');
    return NextResponse.json(r.data);
  }
  const r = await supabase.rpc('esconder_morador', { p_segredo: SEGREDO(), p_handle: b!.handle || '', p_oculto: b!.acao === 'esconder' });
  if (r.error) return erro('falha', 500);
  revalidatePath('/');
  return NextResponse.json({ ok: !!r.data });
}
