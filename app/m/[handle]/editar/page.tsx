import { notFound } from 'next/navigation';
import Editor from '@/components/Editor';
import { buscarMorador, catalogo } from '@/lib/supabase';
import { PREDIO } from '@/lib/config';

export const dynamic = 'force-dynamic';
export const metadata = { title: `Personalizar boneco | ${PREDIO.nome}`, robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const [m, itens] = await Promise.all([buscarMorador(handle), catalogo()]);
  if (!m) notFound();
  return <Editor m={m} itens={itens} />;
}
