'use client';
import { useState } from 'react';
import { PREDIO } from '@/lib/config';

const ERROS: Record<string, string> = {
  pedido_nao_encontrado: 'Não achamos esse pedido. Confira o código (começa com PQS) e o @ que recebeu o item.',
  nao_pago: 'Esse pedido ainda não foi pago, então não tem o que devolver. Se você pagou agora, espere a portaria confirmar.',
  prazo: `Passou o prazo de 7 dias. Se tiver um problema com o item, mande uma DM pro @${PREDIO.instagram}.`,
  falha: 'Não deu pra enviar agora. Tente de novo em alguns minutos.',
};

export default function PedirReembolso() {
  const [codigo, setCodigo] = useState('');
  const [handle, setHandle] = useState('');
  const [motivo, setMotivo] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault(); setMsg(null); setEnviando(true);
    try {
      const r = await fetch('/api/reembolso', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ codigo, handle, motivo }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg({ ok: false, t: ERROS[j.erro] || ERROS.falha }); return; }
      setMsg({ ok: true, t: j.status === 'devolvido' ? 'Esse pedido já foi devolvido. O Pix volta pra mesma conta que pagou.'
        : j.status === 'ja_pedido' ? 'A devolução desse pedido já foi pedida. A portaria devolve em até 3 dias úteis.'
        : 'Pedido de devolução recebido. A portaria devolve o Pix pra mesma conta que pagou em até 3 dias úteis, e o item sai do boneco.' });
    } finally { setEnviando(false); }
  }

  return (
    <form className="ordem reembolso-form" onSubmit={enviar}>
      <label className="rotulo" htmlFor="codigo">Código do pedido</label>
      <div className="campo escuro"><input id="codigo" value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="PQS…" autoCapitalize="characters" autoComplete="off" spellCheck={false} maxLength={35} required /></div>
      <label className="rotulo" htmlFor="arroba">@ que recebeu o item</label>
      <div className="campo escuro"><span aria-hidden>@</span><input id="arroba" value={handle} onChange={(e) => setHandle(e.target.value)} autoCapitalize="none" autoComplete="off" spellCheck={false} maxLength={31} required /></div>
      <label className="rotulo" htmlFor="motivo">Motivo (opcional)</label>
      <textarea id="motivo" className="area" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={500} rows={3} />
      <button type="submit" className="primario pagar" disabled={enviando}>{enviando ? 'Enviando…' : 'Pedir devolução'}</button>
      {msg && <p className={msg.ok ? 'aviso' : 'erro'} role="status">{msg.t}</p>}
    </form>
  );
}
