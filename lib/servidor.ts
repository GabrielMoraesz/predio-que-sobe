import { NextResponse } from 'next/server';
export const SEGREDO = () => {
  const s = process.env.SERVIDOR_SEGREDO;
  if (!s) throw new Error('SERVIDOR_SEGREDO não configurado');
  return s;
};
export const erro = (codigo: string, status = 400) => NextResponse.json({ erro: codigo }, { status });
export async function corpo<T>(req: Request): Promise<T | null> {
  try { return (await req.json()) as T; } catch { return null; }
}
