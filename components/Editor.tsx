'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import Vitrine3D from './Vitrine3D';
import { lerChave } from '@/lib/chave';
import { CABELOS, CAMISAS, CORES_CABELO, PELES, SLOTS, reais, visualDe, type Item, type Slot, type Visual } from '@/lib/visual';
import { PREDIO, type Morador } from '@/lib/config';

type Pedido = { id: string; valor_centavos: number; pix_copia_cola: string; modo: string; qr?: string; status: 'pendente' | 'pago' | 'expirado' };

const ERROS: Record<string, string> = {
  chave_invalida: 'Esse aparelho não tem a chave de edição desse boneco.',
  itens_invalidos: 'Algum item do carrinho não está mais disponível ou já é seu. Recarregue a página.',
  pix_indisponivel: 'O Pix está fora do ar agora. Tente de novo em alguns minutos.',
  falha: 'Não deu pra salvar agora. Tente de novo.',
};

export default function Editor({ m, itens }: { m: Morador; itens: Item[] }) {
  const [chave, setChave] = useState<string | null | undefined>(undefined);
  const [meus, setMeus] = useState<Set<string>>(new Set());
  const [v, setV] = useState<Visual>(() => visualDe(m.handle, m.visual));
  const [aba, setAba] = useState<'base' | Slot>('base');
  const [msg, setMsg] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [copiado, setCopiado] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);

  const porId = useMemo(() => Object.fromEntries(itens.map((i) => [i.id, i])), [itens]);
  const carrinho = useMemo(() => SLOTS.map((s) => v[s.id]).filter((id): id is string => !!id && !meus.has(id) && !!porId[id]), [v, meus, porId]);
  const total = carrinho.reduce((t, id) => t + porId[id].preco, 0);

  const carregarMeus = useCallback(async (c: string) => {
    const r = await fetch('/api/meus-itens', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ handle: m.handle, chave: c }) });
    if (r.status === 401) { setChave(null); return; }
    if (r.ok) setMeus(new Set(await r.json()));
  }, [m.handle]);

  useEffect(() => { const c = lerChave(m.handle); setChave(c); if (c) carregarMeus(c); }, [m.handle, carregarMeus]);

  async function salvar(visual = v) {
    if (!chave) return;
    setSalvando(true); setMsg('');
    const r = await fetch('/api/visual', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ handle: m.handle, chave, visual }) });
    setSalvando(false);
    if (!r.ok) { const j = await r.json().catch(() => ({})); setMsg(ERROS[j.erro] || ERROS.falha); return; }
    setMsg('Boneco salvo. Ele já aparece na sua janela.');
  }

  async function comprar() {
    if (!chave || !carrinho.length) return;
    setSalvando(true); setMsg('');
    const r = await fetch('/api/pedido', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ handle: m.handle, chave, itens: carrinho }) });
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
        if (j.status === 'pago' && chave) { await carregarMeus(chave); await salvar(); }
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
  const base = (campo: 'pele' | 'cabelo' | 'corCabelo' | 'camisa', i: number) => setV((x) => ({ ...x, [campo]: i }));

  if (chave === undefined) return <main className="editor"><p className="carregando">Abrindo seu apartamento…</p></main>;

  return (
    <main className="editor">
      <header className="editor-topo">
        <Link href={`/m/${m.handle}`} className="voltar-link">Voltar pro apto {m.apto}</Link>
        <h1>Seu boneco</h1>
      </header>

      <div className="editor-grade">
        <div className="previa"><Vitrine3D handle={m.handle} visual={v} /></div>

        {chave === null ? (
          <section className="sem-chave">
            <h2>Esse boneco só pode ser editado pelo dono</h2>
            <p>Abra esta página no celular onde você pegou o apartamento, ou pelo seu link de edição. Perdeu o link? Manda uma mensagem pro @{PREDIO.instagram} que a portaria te ajuda.</p>
          </section>
        ) : (
          <section className="opcoes">
            <div className="abas" role="tablist" aria-label="Partes do boneco">
              <button role="tab" aria-selected={aba === 'base'} onClick={() => setAba('base')}>Aparência</button>
              {SLOTS.map((s) => <button key={s.id} role="tab" aria-selected={aba === s.id} onClick={() => setAba(s.id)}>{s.nome}</button>)}
            </div>

            {aba === 'base' ? (
              <div className="base" role="tabpanel">
                <fieldset><legend>Pele</legend><div className="cores">{PELES.map((c, i) => <button key={c} aria-label={`Tom de pele ${i + 1}`} aria-pressed={v.pele === i} style={{ background: c }} onClick={() => base('pele', i)} />)}</div></fieldset>
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
              {carrinho.length > 0 ? (
                <>
                  <p className="resumo">Provando {carrinho.length === 1 ? porId[carrinho[0]].nome : `${carrinho.length} itens`}. Compre pra usar na janela.</p>
                  <button className="primario" onClick={comprar} disabled={salvando}>{salvando ? 'Gerando Pix…' : `Comprar por ${reais(total)} no Pix`}</button>
                </>
              ) : (
                <button className="primario" onClick={() => salvar()} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar meu boneco'}</button>
              )}
              {msg && <p className="aviso" role="status">{msg}</p>}
            </div>

            <details className="link-edicao">
              <summary>Editar de outro celular</summary>
              <p>Guarde este link. Quem tiver ele consegue editar seu boneco, então não compartilhe.</p>
              <button className="secundario" onClick={() => copiar(`${location.origin}/m/${m.handle}/editar#k=${chave}`, 'link')}>{copiado === 'link' ? 'Link copiado' : 'Copiar meu link de edição'}</button>
            </details>
          </section>
        )}
      </div>

      <dialog ref={dialog} className="pix" onClose={() => setPedido((p) => (p?.status === 'pago' ? null : p))}>
        {pedido && (pedido.status === 'pago' ? (
          <div className="pago">
            <h2>Pagamento confirmado</h2>
            <p>Seus itens já estão no boneco e aparecem na sua janela do prédio.</p>
            <Link className="primario" href={`/m/${m.handle}`}>Ver minha janela</Link>
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
