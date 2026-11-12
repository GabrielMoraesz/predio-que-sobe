import Reforma from '@/components/Reforma';
import { buscarMorador, catalogo } from '@/lib/supabase';
import { PREDIO } from '@/lib/config';

export const dynamic = 'force-dynamic';
export const metadata = { title: `Loja | ${PREDIO.nome}`, description: `Reforme o seu morador: coroa, terno, caramelo na janela e luz neon. Siga o @${PREDIO.instagram} e ganhe seu apartamento.` };

export default async function Page({ searchParams }: { searchParams: Promise<{ u?: string }> }) {
  const { u } = await searchParams;
  const [itens, m] = await Promise.all([catalogo(), u ? buscarMorador(u) : Promise.resolve(null)]);
  return <Reforma itens={itens} inicial={m} />;
}
