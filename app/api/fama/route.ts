import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Hall da Fama: [@, visual] na ordem em que compraram
export const revalidate = 30;
export async function GET() {
  const { data, error } = await supabase.rpc('hall_da_fama', {});
  if (error) return NextResponse.json([], { status: 502 });
  return NextResponse.json(data, { headers: { 'cache-control': 'public, s-maxage=30, stale-while-revalidate=60' } });
}
