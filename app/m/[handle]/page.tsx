import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import MoradorClient from '@/components/MoradorClient';
import { buscarMorador, estatisticas, vizinhos } from '@/lib/supabase';
import { PREDIO, rotulo } from '@/lib/config';

export const dynamic = 'force-dynamic';

type P = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { handle } = await params;
  const m = await buscarMorador(handle);
  if (!m) return { title: PREDIO.nome };
  const t = `${rotulo(m)} mora no apto ${m.apto}`;
  return { title: `${t} | ${PREDIO.nome}`, openGraph: { title: t, description: `Siga @${PREDIO.instagram} e ganhe seu apartamento no prédio.`, images: [`/api/story/${m.handle}`] } };
}

export default async function Page({ params }: P) {
  const { handle } = await params;
  const m = await buscarMorador(handle);
  if (!m) notFound();
  const [viz, stats] = await Promise.all([vizinhos(m.numero), estatisticas()]);
  return <MoradorClient m={m} viz={viz} ocupados={stats.ultimo_numero} />;
}
