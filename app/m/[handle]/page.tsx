import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import MoradorClient from '@/components/MoradorClient';
import { buscarMorador, estatisticas, vizinhos } from '@/lib/supabase';
import { PREDIO, rotulo } from '@/lib/config';

export const dynamic = 'force-dynamic';

type P = { params: Promise<{ handle: string }>; searchParams: Promise<{ c?: string; novo?: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { handle } = await params;
  const m = await buscarMorador(handle);
  if (!m) return { title: PREDIO.nome };
  const t = `${rotulo(m)} mora no apto ${m.apto}`;
  return { title: `${t} | ${PREDIO.nome}`, openGraph: { title: t, description: 'Pegue o seu apartamento e vire vizinho.', images: [`/api/story/${m.handle}`] } };
}

export default async function Page({ params, searchParams }: P) {
  const { handle } = await params;
  const { c, novo } = await searchParams;
  const m = await buscarMorador(handle);
  if (!m) notFound();
  const [viz, stats] = await Promise.all([vizinhos(m.numero), estatisticas()]);
  const codigo = c && /^[A-F0-9]{5}$/.test(c) ? c : undefined;
  return <MoradorClient m={m} viz={viz} ocupados={stats.ultimo_numero} codigo={codigo} novo={novo === '1'} />;
}
