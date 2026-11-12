import LojaClient from '@/components/LojaClient';
import { catalogo } from '@/lib/supabase';
import { PREDIO } from '@/lib/config';

export const revalidate = 300;
export const metadata = { title: `Loja do síndico | ${PREDIO.nome}`, description: 'Acessórios pro seu boneco: bonés, coroa, pets na janela e luz neon.' };

export default async function Page() {
  return <LojaClient itens={await catalogo()} />;
}
