import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { corpo, erro, SEGREDO, senhaAdminOk } from '@/lib/servidor';

export const maxDuration = 60;
// Recebe a lista já extraída do arquivo oficial de seguidores do Instagram: [{h: handle, t: timestamp}]
export async function POST(req: Request) {
  const b = await corpo<{ senha: string; lista: { h: string; t?: number }[] }>(req);
  if (!senhaAdminOk(b?.senha)) return erro('proibido', 401);
  if (!Array.isArray(b!.lista) || b!.lista.length > 200000) return erro('lista_invalida');
  let recebidos = 0, novos = 0, fila = 0;
  for (let i = 0; i < b!.lista.length; i += 5000) {
    const r = await supabase.rpc('importar_seguidores', { p_segredo: SEGREDO(), p_lista: b!.lista.slice(i, i + 5000) });
    if (r.error) { console.error('importar', r.error.message); return erro('falha', 500); }
    recebidos += r.data.recebidos; novos += r.data.novos_na_fila; fila = r.data.fila_total;
  }
  return NextResponse.json({ recebidos, novos_na_fila: novos, fila_total: fila });
}
