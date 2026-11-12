import Link from 'next/link';
import PedirReembolso from '@/components/PedirReembolso';
import { PREDIO } from '@/lib/config';

export const metadata = { title: `Devolução | ${PREDIO.nome}` };

export default function Page() {
  return (
    <main className="reforma">
      <nav className="topo-nav" aria-label="Seções"><Link href="/" className="marca">{PREDIO.nome}</Link><div><Link href="/">Prédio</Link><Link href="/loja">Loja</Link></div></nav>
      <div className="texto-pagina">
        <h1>Pedir devolução</h1>
        <p>Comprou e se arrependeu? Você tem até 7 dias depois do pagamento pra pedir o dinheiro de volta. O Pix volta pra mesma conta que pagou e o item sai do boneco.</p>
        <PedirReembolso />
        <p className="nota-pagina">O código do pedido aparece na tela do Pix e começa com PQS. Perdeu o código? Mande uma DM pro @{PREDIO.instagram} com o @, o valor e o dia do Pix. <Link href="/regras">Regras da loja</Link></p>
      </div>
    </main>
  );
}
