'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { reais } from '@/lib/visual';

type Ped = { id: string; txid: string; handle: string; valor_centavos: number; itens: string[]; criado_em: string };

const ha = (iso: string) => {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  return h < 24 ? `há ${h}h${String(min % 60).padStart(2, '0')}` : `há ${Math.floor(h / 24)} dia${h >= 48 ? 's' : ''}`;
};

function bip() {
  try {
    const ctx = new AudioContext();
    [0, 0.18].forEach((t) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880; g.gain.setValueAtTime(0.2, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.15);
      o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.16);
    });
  } catch {}
}

// Caixa da loja no celular: lista os Pix esperando e confirma com dois toques.
export default function CaixaPix() {
  const [estado, setEstado] = useState<'checando' | 'fora' | 'dentro'>('checando');
  const [senha, setSenha] = useState('');
  const [msg, setMsg] = useState('');
  const [lista, setLista] = useState<Ped[] | null>(null);
  const [nomes, setNomes] = useState<Record<string, string>>({});
  const [armado, setArmado] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [feitos, setFeitos] = useState<{ txid: string; handle: string; valor: number }[]>([]);
  const [avisos, setAvisos] = useState(false);
  const [atualizado, setAtualizado] = useState<Date | null>(null);
  const vistos = useRef<Set<string> | null>(null);

  const carregar = useCallback(async () => {
    const r = await fetch('/api/admin/censo', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ acao: 'pedidos' }) });
    if (r.status === 401) { setEstado('fora'); return; }
    if (!r.ok) { setMsg('Não deu pra buscar os pedidos agora. Tentando de novo…'); return; }
    const d: Ped[] = await r.json();
    d.sort((a, b) => b.criado_em.localeCompare(a.criado_em));
    // pedido novo desde a última olhada: avisa
    if (vistos.current) {
      const novos = d.filter((p) => !vistos.current!.has(p.txid));
      if (novos.length) {
        bip(); navigator.vibrate?.([200, 100, 200]);
        if (avisos && document.hidden && 'Notification' in window) new Notification('Pedido novo na loja', { body: novos.map((p) => `@${p.handle} · ${reais(p.valor_centavos)}`).join('\n'), tag: 'caixa' });
      }
    }
    vistos.current = new Set(d.map((p) => p.txid));
    setLista(d); setMsg(''); setAtualizado(new Date()); setEstado('dentro');
  }, [avisos]);

  useEffect(() => {
    fetch('/api/admin/entrar').then((r) => r.json()).then((d) => (d.dentro ? carregar() : setEstado('fora'))).catch(() => setEstado('fora'));
    fetch('/api/catalogo').then((r) => r.json()).then((itens: { id: string; nome: string }[]) => setNomes(Object.fromEntries(itens.map((i) => [i.id, i.nome])))).catch(() => {});
    setAvisos('Notification' in window && Notification.permission === 'granted');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (estado !== 'dentro') return;
    const t = setInterval(() => { if (!document.hidden) carregar(); }, 15000);
    const vis = () => { if (!document.hidden) carregar(); };
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', vis); };
  }, [estado, carregar]);

  useEffect(() => {
    const n = lista?.length || 0;
    document.title = n ? `(${n}) Caixa da loja` : 'Caixa da loja';
  }, [lista]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault(); setMsg('');
    const r = await fetch('/api/admin/entrar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ senha }) });
    if (!r.ok) { setMsg('Senha errada.'); return; }
    setSenha(''); carregar();
  }

  async function sair() {
    await fetch('/api/admin/entrar', { method: 'DELETE' });
    setLista(null); vistos.current = null; setEstado('fora');
  }

  async function ligarAvisos() {
    if (!('Notification' in window)) { setMsg('Este navegador não mostra notificações.'); return; }
    const p = await Notification.requestPermission();
    setAvisos(p === 'granted');
    if (p !== 'granted') setMsg('Notificações bloqueadas. Dá pra liberar nas configurações do navegador.');
  }

  async function confirmar(p: Ped) {
    if (armado !== p.txid) { setArmado(p.txid); setTimeout(() => setArmado((a) => (a === p.txid ? null : a)), 6000); return; }
    setOcupado(p.txid); setArmado(null);
    const r = await fetch('/api/admin/censo', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ acao: 'confirmar', txid: p.txid }) });
    setOcupado(null);
    if (!r.ok) { setMsg(`Não consegui confirmar o ${p.txid}. Tente de novo.`); return; }
    navigator.vibrate?.(60);
    setFeitos((f) => [{ txid: p.txid, handle: p.handle, valor: p.valor_centavos }, ...f].slice(0, 5));
    setLista((l) => l?.filter((x) => x.txid !== p.txid) ?? null);
    vistos.current?.delete(p.txid);
  }

  if (estado === 'checando') return <main className="caixa-pix"><p className="nota">Abrindo o caixa…</p></main>;

  if (estado === 'fora') return (
    <main className="caixa-pix">
      <h1>Caixa da loja</h1>
      <p className="nota">Entre uma vez neste celular. Ele fica lembrado por 90 dias.</p>
      <form onSubmit={entrar} className="entrar">
        <label htmlFor="senha">Senha da portaria</label>
        <input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" />
        <button type="submit" className="primario">Entrar</button>
      </form>
      {msg && <p className="aviso" role="status">{msg}</p>}
    </main>
  );

  return (
    <main className="caixa-pix">
      <header>
        <h1>Caixa da loja</h1>
        <button type="button" className="sair" onClick={sair}>Sair</button>
      </header>
      <p className="nota">Abra o app do Itaú, ache o Pix com o <strong>mesmo valor</strong> (e o código, se aparecer) e confirme aqui. Toque uma vez em “Recebi” e de novo pra confirmar.</p>
      {!avisos && <button type="button" className="ligar-avisos" onClick={ligarAvisos}>🔔 Avisar quando chegar pedido</button>}
      {msg && <p className="aviso" role="status">{msg}</p>}

      {lista === null ? <p className="nota">Buscando pedidos…</p> : lista.length === 0 ? (
        <p className="vazio">Nenhum Pix esperando. 🎉</p>
      ) : (
        <ul className="pedidos">
          {lista.map((p) => (
            <li key={p.txid} className={armado === p.txid ? 'armado' : ''}>
              <div className="topo">
                <span className="valor lcd">{reais(p.valor_centavos)}</span>
                <span className="quando">{ha(p.criado_em)}</span>
              </div>
              <p className="quem">@{p.handle}</p>
              <p className="o-que">{p.itens.length ? p.itens.map((i) => nomes[i] || i).join(', ') : 'Troca de visual (cabelo/camisa)'}</p>
              <p className="codigo">Código <strong>{p.txid}</strong></p>
              <div className="acoes">
                <button type="button" className="recebi" onClick={() => confirmar(p)} disabled={ocupado === p.txid}>
                  {ocupado === p.txid ? 'Confirmando…' : armado === p.txid ? `Toque de novo: confirmar ${reais(p.valor_centavos)}` : '✓ Recebi'}
                </button>
                <Link className="ver" href={`/m/${p.handle}`} target="_blank">Ver boneco</Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      {feitos.length > 0 && (
        <section className="feitos">
          <h2>Confirmados agora</h2>
          <ul>{feitos.map((f) => <li key={f.txid}>✓ @{f.handle} · {reais(f.valor)} · {f.txid}</li>)}</ul>
        </section>
      )}

      <p className="rodape">
        {atualizado ? `Atualiza sozinho a cada 15 s · última vez às ${atualizado.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
        <br /><Link href="/admin/censo">Ir pra portaria completa</Link>
      </p>
    </main>
  );
}
