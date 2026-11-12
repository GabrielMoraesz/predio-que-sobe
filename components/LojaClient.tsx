'use client';
import { useState } from 'react';
import Link from 'next/link';
import Vitrine3D from './Vitrine3D';
import { SLOTS, reais, type Item, type Slot, type Visual } from '@/lib/visual';

export default function LojaClient({ itens }: { itens: Item[] }) {
  const [v, setV] = useState<Partial<Visual>>({ pele: 2, cabelo: 1, corCabelo: 0, camisa: 0, cabeca: 'coroa', janela: 'caramelo' });
  const provar = (slot: Slot, id: string) => setV((x) => ({ ...x, [slot]: x[slot] === id ? undefined : id }));
  return (
    <main className="editor loja">
      <header className="editor-topo">
        <Link href="/" className="voltar-link">Voltar pro prédio</Link>
        <h1>Loja do síndico</h1>
        <p className="lead">Toque num item pra provar no boneco. O que você comprar aparece na sua janela, na rua e nos vídeos do prédio.</p>
      </header>
      <div className="editor-grade">
        <div className="previa"><Vitrine3D handle="visitante" visual={v} /></div>
        <section className="opcoes">
          {SLOTS.map((s) => (
            <div key={s.id}>
              <h2>{s.nome}</h2>
              <ul className="itens">
                {itens.filter((i) => i.slot === s.id).map((i) => (
                  <li key={i.id}>
                    <button aria-pressed={v[s.id] === i.id} onClick={() => provar(s.id, i.id)} className={i.raro ? 'raro' : ''}>
                      <span className="nome">{i.nome}</span><span className="preco">{reais(i.preco)}</span>{i.raro && <span className="tag">Raro</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="barra">
            <p className="resumo">Pra comprar, abra o seu apartamento e toque em Personalizar meu boneco. O pagamento é por Pix.</p>
            <Link className="primario" href="/">Pegar ou achar meu apartamento</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
