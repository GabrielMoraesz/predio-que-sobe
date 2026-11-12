'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import Vitrine3D from './Vitrine3D';
import Retratos from './Retratos';
import { CABELOS, CAMISAS, CORES_CABELO, GENEROS, PELES, RARIDADES, SLOTS, reais, visualDe, type Item, type Raridade, type Slot, type Visual } from '@/lib/visual';
import { HANDLE_RE, PREDIO, normalizarHandle, rotulo, type Morador } from '@/lib/config';

type Pedido = { id: string; txid?: string; valor_centavos: number; pix_copia_cola: string; modo: string; qr?: string; status: 'pendente' | 'pago' | 'expirado' };
type Aba = 'visual' | Slot;

const ERROS: Record<string, string> = {
  nao_encontrado: 'Esse morador não está mais no prédio.',
  itens_invalidos: 'Algum item não está mais disponível. Recarregue a página.',
  pix_indisponivel: 'O Pix está fora do ar agora. Tente de novo em alguns minutos.',
  espere: 'A pele e o gênero desse boneco foram trocados há pouco. Dá pra trocar de novo daqui a uma hora.',
  falha: 'Não deu pra gerar o Pix agora. Tente de novo.',
};
const TAXA_TROCA = 100;
const PAGOS = ['cabelo', 'corCabelo', 'camisa', ...SLOTS.map((s) => s.id)] as const;
const ICONE: Record<Aba, string> = { visual: '✂️', cabeca: '🧢', rosto: '🕶️', roupa: '👔', janela: '🐈', luz: '💡' };

const DUVIDAS: [string, string][] = [
  ['Como eu ganho um apartamento?', `Siga o @${PREDIO.instagram} no Instagram. Todo dia às 12h o síndico faz o censo e todo seguidor novo ganha uma janela com o próprio @, por ordem de chegada.`],
  ['Segui e não achei meu @. E agora?', 'Calma: você entra no próximo censo, às 12h. Confira se digitou o @ igualzinho ao do Instagram, com ponto e underline se tiver.'],
  ['Preciso fazer cadastro ou senha?', 'Não. É só o seu @. Sem senha e sem cadastro.'],
  ['Posso dar de presente?', 'Pode. Toque em "Dar de presente pra um vizinho", digite o @ dele e pague normalmente. O item vai direto pro boneco do vizinho.'],
  ['Quanto custa mudar a pele e o gênero?', 'Nada. Pele e gênero são grátis. Cabelo, camisa e os itens da loja são pagos no Pix.'],
  ['Quando o meu boneco muda?', 'Assim que o Pix é confirmado ele muda na sua janela, na rua do prédio e aparece assim nos próximos vídeos.'],
  ['O que é a raridade?', 'Comum, Raro, Épico e Lendário. Quanto mais raro, mais o item chama atenção da rua e nos vídeos.'],
  ['Os itens dão alguma vantagem?', 'Não. É tudo visual: muda como o seu boneco aparece no prédio e nos vídeos.'],
  ['Como funciona o pagamento?', 'Pagamento único no Pix: copie o código (ou leia o QR) no app do banco. Guarde o código do pedido que aparece na tela.'],
  ['Sou menor de idade, posso comprar?', 'Peça pra um responsável antes. É ele quem faz o Pix.'],
];

export default function Reforma({ itens, inicial }: { itens: Item[]; inicial?: Morador | null }) {
  const [alvo, setAlvo] = useState<Morador | null>(inicial ?? null);
  const [salvo, setSalvo] = useState(inicial?.visual ?? null);
  const [meus, setMeus] = useState<Set<string>>(new Set());
  const [v, setV] = useState<Visual>(() => visualDe(inicial?.handle || 'visitante', inicial?.visual));
  const [campo, setCampo] = useState(inicial?.handle ?? '');
  const [presente, setPresente] = useState(false);
  const [aba, setAba] = useState<Aba>('cabeca');
  const [aviso, setAviso] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [copiado, setCopiado] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const porId = useMemo(() => Object.fromEntries(itens.map((i) => [i.id, i])), [itens]);
  const atual = useMemo(() => visualDe(alvo?.handle || 'visitante', salvo), [alvo?.handle, salvo]);
  const novos = SLOTS.map((s) => v[s.id]).filter((id): id is string => !!id && !meus.has(id) && !!porId[id]);
  const mudou = PAGOS.some((k) => (v[k] ?? null) !== (atual[k] ?? null));
  const mudouGratis = v.pele !== atual.pele || v.genero !== atual.genero;
  const total = novos.length ? novos.reduce((t, id) => t + porId[id].preco, 0) : TAXA_TROCA;
  const raridade = novos.map((id) => porId[id].raridade || 'comum').sort((a, b) => RARIDADES[b].ordem - RARIDADES[a].ordem)[0] as Raridade | undefined;
  const fixo = !!alvo?.staff;

  async function carregar(h: string) {
    const r = await fetch(`/api/morador/${h}/itens`, { cache: 'no-store' });
    setMeus(new Set(r.ok ? await r.json() : []));
  }
  useEffect(() => { if (inicial) carregar(inicial.handle); }, [inicial]);

  async function buscar(e?: React.FormEvent) {
    e?.preventDefault(); setAviso('');
    const h = normalizarHandle(campo);
    if (!HANDLE_RE.test(h)) { setAviso('Esse @ não parece válido. Use só letras, números, ponto e underline.'); input.current?.focus(); return; }
    setOcupado(true);
    try {
      const r = await fetch(`/api/morador/${h}`);
      if (r.status === 404) { setAlvo(null); setAviso(`O @${h} ainda não mora no prédio. Se já segue o @${PREDIO.instagram}, a janela acende no censo das 12h.`); return; }
      const m: Morador = await r.json();
      setAlvo(m); setSalvo(m.visual ?? null); await carregar(m.handle);
      // mantém o que a pessoa já estava provando
      setV((x) => ({ ...visualDe(m.handle, m.visual), ...Object.fromEntries(SLOTS.map((s) => [s.id, x[s.id]]).filter(([, id]) => id)) }));
    } catch { setAviso('Não deu pra falar com a portaria agora. Tente de novo.'); }
    finally { setOcupado(false); }
  }

  const provar = (slot: Slot, id: string) => setV((x) => ({ ...x, [slot]: x[slot] === id ? undefined : id }));
  const base = (k: 'pele' | 'genero' | 'cabelo' | 'corCabelo' | 'camisa', i: number) => setV((x) => ({ ...x, [k]: i }));

  async function salvarGratis() {
    if (!alvo) return;
    setOcupado(true); setAviso('');
    const r = await fetch('/api/base', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ handle: alvo.handle, pele: v.pele, genero: v.genero }) });
    const j = await r.json().catch(() => ({}));
    setOcupado(false);
    if (!r.ok) { setAviso(ERROS[j.erro] || 'Não deu pra salvar agora. Tente de novo.'); return; }
    setSalvo((x) => ({ ...(x || {}), pele: v.pele, genero: v.genero }));
    setAviso('Pele e gênero salvos. A janela já mostra o boneco novo.');
  }

  async function comprar() {
    if (!alvo) { input.current?.focus(); setAviso('Digite o @ de quem vai receber.'); return; }
    if (!mudou || fixo) return;
    setOcupado(true); setAviso('');
    const r = await fetch('/api/pedido', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ handle: alvo.handle, visual: v }) });
    const j = await r.json().catch(() => ({}));
    setOcupado(false);
    if (!r.ok) { setAviso(ERROS[j.erro] || ERROS.falha); return; }
    const qr = await QRCode.toDataURL(j.pix_copia_cola, { margin: 1, width: 480, color: { dark: '#121733', light: '#FFFFFF' } });
    setPedido({ ...j, qr, status: 'pendente' }); dialog.current?.showModal();
  }

  useEffect(() => {
    if (!pedido || pedido.status !== 'pendente') return;
    const t = setInterval(async () => {
      const r = await fetch(`/api/pedido/${pedido.id}`, { cache: 'no-store' });
      if (!r.ok) return;
      const j = await r.json();
      if (j.status !== 'pendente') {
        setPedido((p) => (p ? { ...p, status: j.status } : p));
        if (j.status === 'pago' && alvo) { setSalvo(v); carregar(alvo.handle); }
      }
    }, 4000);
    return () => clearInterval(t);
  }, [pedido?.id, pedido?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function copiar() {
    if (!pedido) return;
    try { await navigator.clipboard.writeText(pedido.pix_copia_cola); setCopiado(true); setTimeout(() => setCopiado(false), 2500); } catch { /* sem permissão */ }
  }

  const rotuloBotao = ocupado ? 'Um instante…' : !alvo ? (presente ? 'Informe o vizinho' : 'Informe o morador') : fixo ? 'O síndico não reforma' : !mudou ? 'Escolha um item' : novos.length ? `Gerar Pix de ${reais(total)}` : `Trocar visual por ${reais(TAXA_TROCA)}`;

  return (
    <main className="reforma">
      <nav className="topo-nav" aria-label="Seções">
        <Link href="/" className="marca">{PREDIO.nome}</Link>
        <div><Link href="/">Prédio</Link><Link href="/loja" aria-current="page">Loja</Link></div>
      </nav>

      <header className="reforma-hero">
        <h1>Reforme o seu morador</h1>
        <p>Do boné de obra à <span className="lendario">coroa lendária</span>. Prove à vontade: só paga o que for pra janela.</p>
        <div className="aviso-video"><span aria-hidden>🎬</span><p><strong>Quem reforma aparece nos vídeos.</strong> O seu boneco aparece com o visual novo nos próximos vídeos do @{PREDIO.instagram}, na janela e na rua do prédio.</p></div>
      </header>

      <Retratos />

      <div className="reforma-grade">
        <section className="palco" aria-label="Prévia do boneco">
          <p className="hud">{alvo ? <>{rotulo(alvo)} <span>apto {alvo.apto}</span></> : 'Provador'}</p>
          <Vitrine3D handle={alvo?.handle || 'visitante'} visual={v} perto />
          <p className="girar">arraste pra girar</p>
        </section>

        <section className="ordem" aria-labelledby="ordem-t">
          <h2 id="ordem-t">Ordem de reforma</h2>
          <form onSubmit={buscar} className="quem">
            <label htmlFor="quem" className="sr">{presente ? '@ do vizinho' : 'Seu @'}</label>
            <div className="campo escuro"><span aria-hidden>@</span><input id="quem" ref={input} value={campo} onChange={(e) => setCampo(e.target.value)} placeholder={presente ? 'arroba do vizinho' : 'seu.arroba'} autoCapitalize="none" autoComplete="off" spellCheck={false} maxLength={31} /></div>
            <button type="submit" className="ok" disabled={ocupado}>OK</button>
          </form>
          <button type="button" className={'presente' + (presente ? ' on' : '')} aria-pressed={presente} onClick={() => { setPresente((p) => !p); setAlvo(null); setCampo(''); setAviso(''); }}>
            🎁 {presente ? 'Presente ligado: digite o @ do vizinho' : 'Dar de presente pra um vizinho'}
          </button>
          {aviso && <p className="aviso" role="status">{aviso}</p>}

          {!presente && (
            <div className="gratis-linha">
              <div className="grupo"><span>Boneco</span>{GENEROS.map((g, i) => <button key={g} type="button" aria-pressed={v.genero === i} onClick={() => base('genero', i)}>{i ? '👧' : '👦'} {g === 'Masculino' ? 'Menino' : 'Menina'}</button>)}</div>
              <div className="grupo"><span>Pele</span><div className="cores">{PELES.map((c, i) => <button key={c} type="button" aria-label={`Tom de pele ${i + 1}`} aria-pressed={v.pele === i} style={{ background: c }} onClick={() => base('pele', i)} />)}</div></div>
              <p className="gratis-nota"><span>Grátis</span>{alvo && mudouGratis && !fixo && <button type="button" onClick={salvarGratis} disabled={ocupado}>Salvar pele e boneco de graça</button>}</p>
            </div>
          )}

          <div className="abas escuras" role="tablist" aria-label="Categorias">
            {SLOTS.map((s) => <button key={s.id} role="tab" aria-selected={aba === s.id} onClick={() => setAba(s.id)}><span aria-hidden>{ICONE[s.id]}</span> {s.nome}</button>)}
            <button role="tab" aria-selected={aba === 'visual'} onClick={() => setAba('visual')}><span aria-hidden>{ICONE.visual}</span> Cabelo e camisa</button>
          </div>

          {aba === 'visual' ? (
            <div className="visual-base" role="tabpanel">
              <fieldset><legend>Cabelo</legend><div className="chips">{CABELOS.map((c, i) => <button key={c} type="button" aria-pressed={v.cabelo === i} onClick={() => base('cabelo', i)}>{c}</button>)}</div></fieldset>
              <fieldset><legend>Cor do cabelo</legend><div className="cores">{CORES_CABELO.map((c, i) => <button key={c} type="button" aria-label={`Cor de cabelo ${i + 1}`} aria-pressed={v.corCabelo === i} style={{ background: c }} onClick={() => base('corCabelo', i)} />)}</div></fieldset>
              <fieldset><legend>Camisa</legend><div className="cores">{CAMISAS.map((c, i) => <button key={c} type="button" aria-label={`Camisa ${i + 1}`} aria-pressed={v.camisa === i} style={{ background: c }} onClick={() => base('camisa', i)} />)}</div></fieldset>
              <p className="nota">Trocar cabelo ou camisa sem item novo custa {reais(TAXA_TROCA)}.</p>
            </div>
          ) : (
            <ul className="lista-itens" role="tabpanel">
              {itens.filter((i) => i.slot === aba).map((i) => {
                const r = RARIDADES[i.raridade || 'comum']; const tem = meus.has(i.id); const usando = v[aba] === i.id;
                return (
                  <li key={i.id}>
                    <button type="button" aria-pressed={usando} onClick={() => provar(aba, i.id)} className={'item r-' + (i.raridade || 'comum')}>
                      <span className="info"><span className="nome">{i.nome}</span>{i.desc && <span className="desc">{i.desc}</span>}<span className="rar" style={{ color: r.cor }}>● {r.nome}</span></span>
                      <span className={'valor' + (tem ? ' txt' : '')}>{tem ? (usando ? 'Usando' : 'Já é seu') : reais(i.preco)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <dl className="resumo-ordem">
            <div><dt>Itens novos</dt><dd>{novos.length ? novos.map((id) => porId[id].nome).join(', ') : '-'}</dd></div>
            <div><dt>Raridade</dt><dd style={{ color: raridade ? RARIDADES[raridade].cor : undefined }}>{raridade ? RARIDADES[raridade].nome : '-'}</dd></div>
            <div className="total"><dt>Total</dt><dd className="lcd">{mudou && alvo && !fixo ? reais(total) : reais(0)}</dd></div>
          </dl>
          <button type="button" className="primario pagar" onClick={comprar} disabled={ocupado || (!!alvo && (!mudou || fixo))}>{rotuloBotao}</button>
          <p className="nota">Pagamento único no Pix. O visual vai pra janela assim que o pagamento é confirmado.</p>
        </section>
      </div>

      <section className="duvidas" id="duvidas" aria-labelledby="duvidas-t">
        <h2 id="duvidas-t">Dúvidas</h2>
        {DUVIDAS.map(([p, r]) => <details key={p}><summary>{p}</summary><p>{r}</p></details>)}
      </section>

      <footer className="reforma-rodape">
        <p>Uma história do @{PREDIO.instagram}. Cada morador é um seguidor de verdade. Dúvidas ou pra sair do prédio: manda DM.</p>
      </footer>

      <dialog ref={dialog} className="pix escuro" onClose={() => setPedido((p) => (p?.status === 'pago' ? null : p))}>
        {pedido && (pedido.status === 'pago' ? (
          <div className="pago">
            <p className="selo-pago" aria-hidden>✓</p>
            <h2>Reforma entregue</h2>
            <p>O visual novo já está no boneco do @{alvo?.handle} e aparece na janela do prédio.</p>
            {alvo && <Link className="primario" href={`/m/${alvo.handle}`}>Ver a janela</Link>}
          </div>
        ) : pedido.status === 'expirado' ? (
          <div><h2>Esse Pix expirou</h2><p>Feche e gere outro.</p><button className="secundario" onClick={() => dialog.current?.close()}>Fechar</button></div>
        ) : (
          <div>
            <p className="pix-de">Pix da reforma do @{alvo?.handle}</p>
            <h2>Pague {reais(pedido.valor_centavos)}</h2>
            {pedido.qr && <img src={pedido.qr} alt="QR Code do Pix" width={220} height={220} className="qr" />}
            <div className="copia"><input readOnly value={pedido.pix_copia_cola} aria-label="Pix copia e cola" onFocus={(e) => e.target.select()} /><button type="button" onClick={copiar}>{copiado ? 'Copiado' : 'Copiar'}</button></div>
            <p className="dica">No app do banco: Pix, Pix copia e cola, cole e confirme.</p>
            {pedido.modo === 'chave' && pedido.txid && <p className="dica">Código do pedido: <strong className="codigo">{pedido.txid}</strong>. Assim que o Pix cair, a portaria confirma e o visual vai pra janela (pode levar alguns minutos). Pode fechar esta tela.</p>}
            <p className="esperando" role="status"><i className="radar" aria-hidden /> Esperando o pagamento…</p>
            {pedido.modo === 'teste' && <button className="secundario teste" onClick={() => fetch('/api/pix/simular', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: pedido.id }) })}>Simular pagamento (modo teste)</button>}
            <button className="fechar" onClick={() => dialog.current?.close()}>Fechar</button>
          </div>
        ))}
      </dialog>
    </main>
  );
}
