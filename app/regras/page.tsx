import Link from 'next/link';
import { PREDIO } from '@/lib/config';

export const metadata = { title: `Regras da loja | ${PREDIO.nome}` };

export default function Page() {
  const ig = PREDIO.instagram;
  return (
    <main className="reforma">
      <nav className="topo-nav" aria-label="Seções"><Link href="/" className="marca">{PREDIO.nome}</Link><div><Link href="/">Prédio</Link><Link href="/loja">Loja</Link></div></nav>
      <article className="texto-pagina">
        <h1>Regras da loja</h1>
        <h2>O que você compra</h2>
        <p>Itens visuais pro boneco de um morador do {PREDIO.nome}: roupas, acessórios, bichos e luzes da janela. Eles só mudam a aparência do boneco no site e nos vídeos do @{ig}. Não dão vantagem nenhuma e não valem dinheiro.</p>
        <h2>Pagamento e entrega</h2>
        <p>Pagamento único no Pix, no valor mostrado antes de gerar o código. A entrega é o item aparecer no boneco do @ escolhido, o que acontece quando a portaria confirma o Pix (normalmente em minutos, no máximo em 1 dia útil). Se não aparecer em 1 dia útil, mande uma DM pro @{ig} com o código do pedido.</p>
        <h2>Arrependimento e devolução</h2>
        <p>Você pode desistir da compra em até 7 dias depois do pagamento, sem precisar explicar o motivo. Peça em <Link href="/reembolso">Pedir devolução</Link> com o código do pedido. Devolvemos o valor inteiro, pelo Pix, pra mesma conta que pagou, em até 3 dias úteis, e o item sai do boneco.</p>
        <p>Se algo der errado com o item (não apareceu, apareceu errado, Pix pago duas vezes), devolvemos mesmo depois dos 7 dias.</p>
        <h2>Presentes</h2>
        <p>Quem paga pode pedir a devolução de um presente. O item sai do boneco de quem recebeu.</p>
        <h2>Menores de idade</h2>
        <p>Menores de 18 anos só compram com um responsável, que é quem faz o Pix. Se uma compra foi feita sem autorização, o responsável pode pedir a devolução.</p>
        <h2>Seus dados</h2>
        <p>Guardamos só o @ do Instagram, o visual do boneco e os pedidos. Não pedimos senha, nome nem documento. Quem não quiser aparecer no prédio pode pedir por DM pro @{ig} e a janela é apagada.</p>
        <h2>Contato</h2>
        <p>DM pro @{ig} no Instagram.</p>
      </article>
    </main>
  );
}
