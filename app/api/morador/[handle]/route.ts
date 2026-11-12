import { NextResponse } from 'next/server';
import { buscarMorador } from '@/lib/supabase';

export async function GET(_req: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const m = await buscarMorador(handle);
  if (!m) return NextResponse.json({ erro: 'nao_encontrado' }, { status: 404 });
  return NextResponse.json(m);
}
