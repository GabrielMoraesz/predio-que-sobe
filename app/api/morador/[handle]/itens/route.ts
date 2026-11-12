import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export async function GET(_: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const { data, error } = await supabase.rpc('itens_do_morador', { p_handle: handle });
  if (error) return NextResponse.json([], { status: 200 });
  return NextResponse.json(data ?? []);
}
