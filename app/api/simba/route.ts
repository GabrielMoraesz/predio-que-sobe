import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Janelas do Edifício Simba: [posição no Simba, @, visual]
export const revalidate = 30;
export async function GET() {
  const { data, error } = await supabase.rpc('janelas_simba', {});
  if (error) return NextResponse.json([], { status: 500 });
  return NextResponse.json(data, { headers: { 'cache-control': 'public, s-maxage=30, stale-while-revalidate=60' } });
}
