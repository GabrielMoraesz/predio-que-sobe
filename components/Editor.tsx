'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import Vitrine3D from './Vitrine3D';
import { CABELOS, CAMISAS, CORES_CABELO, GENEROS, PELES, SLOTS, reais, visualDe, type Item, type Slot, type Visual } from '@/lib/visual';
import type { Morador } from '@/lib/config';

type Pedido = { id: string; valor_centavos: number; pix_copia_cola: string; modo: string; qr?: string; status: 'pendente' | 'pago' | 'expirado' };

const ERROS: Record<string, string> = {
  nao_encontrado: 'Esse morador não está mais no prédio.',
  itens_invalidos: 'Algum item não está mais disponível. Recarregue a página.',
  espere: 'A pele e o gênero desse boneco foram trocados há pouco. Dá pra trocar de novo daqui a uma hora.',
  pix_indisponivel: 'O Pix está fora do ar agora. Tente de novo em alguns minutos.',
  falha: 'Não deu pra gerar o Pix agora. Tente de novo.',
};
const TAXA_TROCA = 100;
const pagos = ['cabelo', 'corCabelo', 'camisa', ...SLOTS.map((s) => s.id)] as const;
const gratis = ['pele', 'genero'] as const;

export default function Editor({ m, itens }: { m: Morador; itens: Item[] }) {
  const [salvo, setSalvo] = useState(m.visual);
  const atual = useMemo(() => visualDe(m.handle, salvo), [m.handle, salvo]);
  const [meus, setMeus] = useState<Set<string>>(new Set());
  const [v, setV] = useState<Visual>(atual);
  const [aba, setAba] = useState<'base' | Slot>('base');
  const [msg, setMsg] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [copiado, setCopiado] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);

  const porId = useMemo(() => Object.fromEntries(itens.map((i) => [i.id, i])), [itens]);
  const carrinho = useMemo(() => SLOTS.map((s) => v[s.id]).filter((id): id is string => !!id && !meus.has(id) && !!porId[id]), [v, meus, porId]);
  const mudou = pagos.some((k) => (v[k] ?? null) !== (atual[k] ?? null));
  const mudouGratis = gratis.some((k) => v[k] !== atual[k]);
  const total = carrinho.length ? carrinho.reduce((t, id) => t + porId[id].preco, 0) : TAXA_TROCA;

  useEffect(() => {
    fetch(`/api/morador/${m.handle}/itens`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : [])).then((l: string[]) => setMeus(new Set(l))).catch(() => {});
  }, [m.handle]);

  async function salvarGratis() {
    setSalvando(true); setMsg('');
    const r = await fetch('/api/base', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ handle: m.handle, pele: v.pele, genero: v.genero }) });
    const j = await r.json().catch(() => ({}));
    setSalvando(false);
    if (!r.ok) { setMsg(ERROS[j.erro] || 'Não deu pra salvar agora. Tente de novo.'); return; }
    setSalvo((x) => ({ ...(x || {}), pele: v.pele, genero: v.genero }));
    setMsg('Pele e gênero salvos. A janela já mostra o boneco novo.');
  }

  async function comprar() {
    if (!mudou) return;
    setSalvando(true); setMsg('');
    const r = await fetch('/api/pedido', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ handle: m.handle, visual: v }) });
    const j = await r.json().catch(() => ({}));
    setSalvando(false);
    if (!r.ok) { setMsg(ERROS[j.erro] || ERROS.falha); return; }
    const qr = await QRCode.toDataURL(j.pix_copia_cola, { margin: 1, width: 480, color: { dark: '#1B2140', light: '#FFFFFF' } });
    setPedido({ ...j, qr, status: 'pendente' }); dialog.current?.showModal();
  }

  // acompanha o pagamento enquanto o Pix estiver aberto
  useEffect(() => {
    if (!pedido || pedido.status !== 'pendente') return;
    const t = setInterval(async () => {
      const r = await fetch(`/api/pedido/${pedido.id}`, { cache: 'no-store' });
      if (!r.ok) return;
      const j = await r.json();
      if (j.status !== 'pendente') {
        setPedido((p) => (p ? { ...p, status: j.status } : p));
      }
    }, 3000);
    return () => clearInterval(t);
  }, [pedido?.id, pedido?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function simular() {
    if (!pedido) return;
    await fetch('/api/pix/simular', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: pedido.id }) });
  }

  async function copiar(texto: string, qual: string) {
    try { await navigator.clipboard.writeText(texto); setCopiado(qual); setTimeout(() => setCopiado(''), 2500); } catch { /* sem permissão */ }
  }

  const escolher = (slot: Slot, id: string) => setV((x) => ({ ...x, [slot]: x[slot] === id ? undefined : id }));
  const base = (campo: 'pele' | 'genero' | 'cabelo' | 'corCabelo' | 'camisa', i: number) => setV((x) => ({ ...x, [campo]: i }));

  return (
    <main className="editor">
      <header className="editor-topo">
        <Link href={`/m/${m.handle}`} className="voltar-link">Voltar pro apto {m.apto}</Link>
        <h1>Boneco do @{m.handle}</h1>
      </header>

      <div className="editor-grade">
        <div className="previa"><Vitrine3D handle={m.handle} visual={v} /></div>

        {m.staff ? (
          <section className="sem-chave">
            <h2>O boneco do síndico é fixo</h2>
            <p>O Paulim não troca de moletom. Mas você pode montar o seu: ache sua janela pelo seu @ e personalize.</p>
            <Link className="primario" href="/loja">Ver a loja</Link>
          </section>
        ) : (
          <section className="opcoes">
            <div className="abas" role="tablist" aria-label="Partes do boneco">
              <button role="tab" aria-selected={aba === 'base'} onClick={() => setAba('base')}>Aparência</button>
              {SLOTS.map((s) => <button key={s.id} role="tab" aria-selected={aba === s.id} onClick={() => setAba(s.id)}>{s.nome}</button>)}
            </div>

            {aba === 'base' ? (
              <div className="base" role="tabpanel">
                <div className="gratis-bloco">
                  <p className="gratis-tag">Grátis</p>
                  <fieldset><legend>Gênero</legend><div className="chips">{GENEROS.map((c, i) => <button key={c} aria-pressed={v.genero === i} onClick={() => base('genero', i)}>{c}</button>)}</div></fieldset>
                  <fieldset><legend>Pele</legend><div className="cores">{PELES.map((c, i) => <button key={c} aria-label={`Tom de pele ${i + 1}`} aria-pressed={v.pele === i} style={{ background: c }} onClick={() => base('pele', i)} />)}</div></fieldset>
                  {mudouGratis && <button className="secundario" onClick={salvarGratis} disabled={salvando}>Salvar pele e gênero de graça</button>}
                </div>
                <fieldset><legend>Cabelo</legend><div className="chips">{CABELOS.map((c, i) => <button key={c} aria-pressed={v.cabelo === i} onClick={() => base('cabelo', i)}>{c}</button>)}</div></fieldset>
                <fieldset><legend>Cor do cabelo</legend><div className="cores">{CORES_CABELO.map((c, i) => <button key={c} aria-label={`Cor de cabelo ${i + 1}`} aria-pressed={v.corCabelo === i} style={{ background: c }} onClick={() => base('corCabelo', i)} />)}</div></fieldset>
                <fieldset><legend>Camisa</legend><div className="cores">{CAMISAS.map((c, i) => <button key={c} aria-label={`Camisa ${i + 1}`} aria-pressed={v.camisa === i} style={{ background: c }} onClick={() => base('camisa', i)} />)}</div></fieldset>
              </div>
            ) : (
              <ul className="itens" role="tabpanel">
                {itens.filter((i) => i.slot === aba).map((i) => {
                  const tem = meus.has(i.id); const usando = v[aba] === i.id;
                  return (
                    <li key={i.id}>
                      <button aria-pressed={usando} onClick={() => escolher(aba, i.id)} className={i.raro ? 'raro' : ''}>
                        <span className="nome">{i.nome}</span>
                        <span className="preco">{tem ? (usando ? 'Usando' : 'Seu') : reais(i.preco)}</span>
                        {i.raro && <span className="tag">Raro</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="barra">
              <p className="resumo">{!mudou ? 'Cabelo, camisa e itens da loja vão pra janela assim que o Pix for pago.'
                : carrinho.length ? `${carrinho.length === 1 ? porId[carrinho[0]].nome : `${carrinho.length} itens novos`} + o visual novo vão pra janela do @${m.handle}.`
                : 'Só trocando o visual com o que já é seu.'}</p>
              <button className="primario" onClick={comprar} disabled={salvando || !mudou}>{salvando ? 'Gerando Pix…' : !mudou ? 'Escolha o que mudar' : carrinho.length ? `Comprar por ${reais(total)} no Pix` : `Trocar visual por ${reais(TAXA_TROCA)}`}</button>
              {mudou && <button className="fechar" onClick={() => setV(atual)}>Desfazer</button>}
              {msg && <p className="aviso" role="status">{msg}</p>}
              <p className="nota">Qualquer pessoa com o @ pode comprar, então dá pra dar de presente pra um vizinho. Os itens ficam no boneco desse @.</p>
            </div>
          </section>
        )}
      </div>

      <dialog ref={dialog} className="pix" onClose={() => setPedido((p) => (p?.status === 'pago' ? null : p))}>
        {pedido && (pedido.status === 'pago' ? (
          <div className="pago">
            <h2>Pagamento confirmado</h2>
            <p>O visual novo já está no boneco e aparece na janela do prédio.</p>
            <Link className="primario" href={`/m/${m.handle}`}>Ver a janela</Link>
          </div>
        ) : pedido.status === 'expirado' ? (
          <div><h2>Esse Pix expirou</h2><p>Feche e toque em comprar de novo pra gerar outro.</p><button className="secundario" onClick={() => dialog.current?.close()}>Fechar</button></div>
        ) : (
          <div>
            <h2>Pague {reais(pedido.valor_centavos)} no Pix</h2>
            <p>Abra o app do seu banco, escolha Pix e leia o QR Code ou cole o código.</p>
            {pedido.qr && <img src={pedido.qr} alt="QR Code do Pix" width={240} height={240} className="qr" />}
            <button className="primario" onClick={() => copiar(pedido.pix_copia_cola, 'pix')}>{copiado === 'pix' ? 'Código copiado' : 'Copiar código Pix'}</button>
            <p className="esperando" role="status">Esperando o pagamento… Esta tela atualiza sozinha.</p>
            {pedido.modo === 'teste' && <button className="secundario teste" onClick={simular}>Simular pagamento (modo teste)</button>}
            <button className="fechar" onClick={() => dialog.current?.close()}>Fechar</button>
          </div>
        ))}
      </dialog>
    </main>
  );
}
