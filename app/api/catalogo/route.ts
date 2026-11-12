import { NextResponse } from 'next/server';
import { catalogo } from '@/lib/supabase';

export async function GET() {
  return NextResponse.json(await catalogo(), { headers: { 'cache-control': 'public, s-maxage=300' } });
}
