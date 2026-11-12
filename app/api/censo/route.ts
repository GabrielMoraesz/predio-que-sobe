import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { erro, SEGREDO } from '@/lib/servidor';

export const dynamic = 'force-dynamic';
// Chamado pelo agendador da Vercel todo dia às 12h (horário de Brasília).
export async function GET(req: Request) {
  const cron = process.env.CRON_SECRET;
  if (!cron || req.headers.get('authorization') !== `Bearer ${cron}`) return erro('proibido', 401);
  const r = await supabase.rpc('rodar_censo', { p_segredo: SEGREDO() });
  if (r.error) { console.error('censo', r.error.message); return erro('falha', 500); }
  revalidatePath('/');
  return NextResponse.json(r.data);
}
