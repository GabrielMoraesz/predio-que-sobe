'use client';
import { useState } from 'react';
import { HANDLE_RE, PREDIO, proximoCenso } from '@/lib/config';

type Seguidor = { h: string; t?: number };

// Lê o arquivo oficial do Instagram (followers_1.json, followers_2.json…), em qualquer das versões do formato.
function extrair(json: unknown): Seguidor[] {
  const out: Seguidor[] = [];
  const visitar = (x: unknown) => {
    if (Array.isArray(x)) { x.forEach(visitar); return; }
    if (!x || typeof x !== 'object') return;
    const o = x as Record<string, unknown>;
    if (Array.isArray(o.string_list_data)) {
      for (const d of o.string_list_data as Record<string, unknown>[]) {
        const doHref = typeof d.href === 'string' ? d.href.replace(/\/+$/, '').split('/').pop() : '';
        const h = String(d.value || o.title || doHref || '').toLowerCase().replace(/^@+/, '');
        if (HANDLE_RE.test(h)) out.push({ h, t: typeof d.timestamp === 'number' ? d.timestamp : undefined });
      }
      return;
    }
    Object.values(o).forEach(visitar);
  };
  visitar(json);
  return out;
}

export default function AdminCenso() {
  const [senha, setSenha] = useState('');
  const [lista, setLista] = useState<Seguidor[]>([]);
  const [msg, setMsg] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [handle, setHandle] = useState('');
  type Ped = { id: string; txid: string; handle: string; valor_centavos: number; itens: string[]; criado_em: string };
  const [pendentes, setPendentes] = useState<Ped[] | null>(null);

  async function ler(files: FileList | null) {
    setMsg(''); if (!files?.length) return;
    const todos: Seguidor[] = [];
    for (const f of Array.from(files)) {
      try { todos.push(...extrair(JSON.parse(await f.text()))); }
      catch { setMsg(`${f.name} não é um JSON. No Instagram, peça o download no formato JSON (não HTML).`); return; }
    }
    const unicos = new Map<string, Seguidor>();
    todos.forEach((s) => { const a = unicos.get(s.h); if (!a || (s.t && (!a.t || s.t < a.t))) unicos.set(s.h, s); });
    setLista([...unicos.values()]);
    setMsg(unicos.size ? `${unicos.size.toLocaleString('pt-BR')} seguidores encontrados no arquivo.` : 'Não achei seguidores nesse arquivo. Confira se é o followers_1.json.');
  }

  async function post(url: string, body: object) {
    setOcupado(true); setMsg('');
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ senha, ...body }) });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) { setMsg('Senha da portaria errada.'); return null; }
      if (!r.ok) { setMsg('Deu erro no servidor. Tente de novo.'); return null; }
      return j;
    } finally { setOcupado(false); }
  }

  async function enviar() {
    const j = await post('/api/admin/importar', { lista });
    if (j) setMsg(`Pronto: ${j.novos_na_fila.toLocaleString('pt-BR')} seguidores novos entraram na fila. Fila total: ${j.fila_total.toLocaleString('pt-BR')}. Eles ganham janela no censo das 12h.`);
  }
  async function censo() {
    const j = await post('/api/admin/censo', { acao: 'censo' });
    if (j) setMsg(`Censo feito: ${j.novos.toLocaleString('pt-BR')} moradores novos no prédio.`);
  }
  async function esconder(acao: 'esconder' | 'mostrar') {
    const j = await post('/api/admin/censo', { acao, handle: handle.trim().toLowerCase().replace(/^@+/, '') });
    if (j) setMsg(j.ok ? (acao === 'esconder' ? 'Janela apagada. Esse @ não aparece mais.' : 'Janela acesa de novo.') : 'Não achei esse @ no prédio.');
  }

  async function verPedidos() {
    const j = await post('/api/admin/censo', { acao: 'pedidos' });
    if (j) { setPendentes(j); if (!j.length) setMsg('Nenhum Pix esperando confirmação.'); }
  }
  async function confirmar(p: Ped) {
    const j = await post('/api/admin/censo', { acao: 'confirmar', txid: p.txid });
    if (j) { setPendentes((l) => (l || []).filter((x) => x.id !== p.id)); setMsg(`Pix ${p.txid} confirmado. O visual do @${p.handle} já está na janela.`); }
  }
  const brl = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const hora = proximoCenso().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', hour: '2-digit', minute: '2-digit' });

  return (
    <main className="admin">
      <h1>Portaria do censo</h1>
      <p>Próximo censo automático: {hora}.</p>

      <label className="rotulo" htmlFor="senha">Senha da portaria</label>
      <input id="senha" type="password" className="entrada" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" />

      <section>
        <h2>Pix pra confirmar</h2>
        <p>Abra o extrato do Pix no app do banco. Quando achar um Pix com o mesmo valor (e o código do pedido, se o banco mostrar), confirme aqui.</p>
        <button className="secundario" disabled={!senha || ocupado} onClick={verPedidos}>Ver pedidos esperando</button>
        {pendentes && pendentes.length > 0 && (
          <ul className="pendentes">
            {pendentes.map((p) => (
              <li key={p.id}>
                <span><strong>{brl(p.valor_centavos)}</strong> · @{p.handle}<br /><small>Código {p.txid} · {new Date(p.criado_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</small></span>
                <button className="primario" disabled={ocupado} onClick={() => confirmar(p)}>Confirmar Pix</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>1. Enviar os seguidores</h2>
        <ol className="passos">
          <li>No app do Instagram do @{PREDIO.instagram}: Central de Contas, Suas informações e permissões, Baixar suas informações.</li>
          <li>Escolha só Seguidores e seguindo, formato JSON, período Desde o início.</li>
          <li>Quando chegar o arquivo, abra o .zip e envie aqui o followers_1.json (e followers_2.json se tiver).</li>
        </ol>
        <input type="file" accept=".json,application/json" multiple onChange={(e) => ler(e.target.files)} />
        <button className="primario" disabled={!lista.length || !senha || ocupado} onClick={enviar}>Enviar {lista.length ? lista.length.toLocaleString('pt-BR') : ''} seguidores pra fila</button>
      </section>

      <section>
        <h2>2. Censo</h2>
        <p>Roda sozinho todo dia às 12h. Use o botão se quiser rodar agora.</p>
        <button className="secundario" disabled={!senha || ocupado} onClick={censo}>Rodar censo agora</button>
      </section>

      <section>
        <h2>Tirar alguém do prédio</h2>
        <p>Pra quem pedir por DM pra não aparecer.</p>
        <div className="campo"><span aria-hidden>@</span><input value={handle} onChange={(e) => setHandle(e.target.value)} autoCapitalize="none" spellCheck={false} aria-label="@ do morador" /></div>
        <div className="acoes">
          <button className="secundario" disabled={!senha || !handle || ocupado} onClick={() => esconder('esconder')}>Apagar janela</button>
          <button className="secundario" disabled={!senha || !handle || ocupado} onClick={() => esconder('mostrar')}>Acender de novo</button>
        </div>
      </section>
      {msg && <p className="aviso" role="status">{msg}</p>}
    </main>
  );
}
