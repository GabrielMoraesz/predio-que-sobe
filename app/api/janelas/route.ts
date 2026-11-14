import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const revalidate = 30;

export async function GET(req: Request) {
  const ate = Math.min(10000, Math.max(1, Number(new URL(req.url).searchParams.get('ate')) || 10000));
  const { data, error } = await supabase.rpc('janelas', { p_ate: ate });
  if (error) return NextResponse.json([], { status: 502 });
  return NextResponse.json(data, { headers: { 'cache-control': 'public, s-maxage=30, stale-while-revalidate=60' } });
}
