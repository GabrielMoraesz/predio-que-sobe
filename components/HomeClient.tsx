'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Building from './Building';
import Elevador from './Elevador';
import { HANDLE_RE, normalizarHandle, PREDIO, proximoCenso, type Estatisticas } from '@/lib/config';

function useContagem() {
  const [falta, setFalta] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => {
      const s = Math.max(0, Math.floor((proximoCenso().getTime() - Date.now()) / 1000));
      const p = (n: number) => String(n).padStart(2, '0');
      setFalta(`${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`);
    };
    tick(); const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  return falta;
}

export default function HomeClient({ stats }: { stats: Estatisticas }) {
  const router = useRouter();
  const [andar, setAndar] = useState(0);
  const [handle, setHandle] = useState('');
  const [erro, setErro] = useState('');
  const [procurando, setProcurando] = useState(false);
  const [todos, setTodos] = useState(false);
  const novosAcima = stats.ultimo_censo ? stats.ultimo_numero - stats.ultimo_censo.novos : undefined;
  const inputRef = useRef<HTMLInputElement>(null);
  const falta = useContagem();
  const andares = Math.max(1, Math.ceil(stats.ultimo_numero / PREDIO.aptosPorAndar));
  const ig = PREDIO.instagram;

  async function achar(e: React.FormEvent) {
    e.preventDefault(); setErro('');
    const h = normalizarHandle(handle);
    if (!HANDLE_RE.test(h)) { setErro('Esse @ não parece válido. Use só letras, números, ponto e underline.'); inputRef.current?.focus(); return; }
    setProcurando(true);
    try {
      const r = await fetch(`/api/morador/${h}`);
      if (r.status === 404) { setErro(`Ainda não tem janela do @${h}. Se você já segue o @${ig}, ela acende no próximo censo, às 12h.`); setProcurando(false); return; }
      router.push(`/m/${h}`);
    } catch { setErro('Não deu pra falar com a portaria agora. Tente de novo em alguns segundos.'); setProcurando(false); }
  }

  return (
    <main className="tela">
      <Building ocupados={stats.ultimo_numero} rotulos={novosAcima === undefined ? stats.recentes : []} novosAcima={novosAcima} todos={todos} onAndar={setAndar} />
      <Link href="/loja" className="topo-loja"><span aria-hidden>👑</span> Personalizar</Link>
      <button type="button" className="topo-simba" onClick={() => window.dispatchEvent(new Event('ir-simba'))}><span aria-hidden>🐾</span> Edifício Simba</button>
      <button type="button" className="todos-arrobas" aria-pressed={todos} onClick={() => setTodos((t) => !t)}>{todos ? 'Mostrar só os novos' : 'Mostrar todos os @'}</button>
      <Elevador andar={andar} subindo={false} />
      <section className="painel" aria-labelledby="titulo">
        <h1 id="titulo">Siga o @{ig} e ganhe um apartamento.</h1>
        <p className="lead">Todo dia às 12h o síndico faz o censo: quem começou a seguir ganha uma janela com o próprio @. Quem chega antes fica com o número mais baixo, pra sempre.</p>

        <div className="contagem" role="timer" aria-live="off">
          <span className="rotulo-led">Próximo censo em</span>
          <span className="lcd">{falta ?? '--:--:--'}</span>
        </div>

        <a className="primario seguir" href={`https://instagram.com/${ig}`} target="_blank" rel="noreferrer">Seguir @{ig}</a>

        <form onSubmit={achar} noValidate className="achar">
          <label htmlFor="handle" className="rotulo">Já segue? Ache sua janela</label>
          <div className="campo-linha">
            <div className="campo">
              <span aria-hidden>@</span>
              <input id="handle" ref={inputRef} value={handle} onChange={(e) => setHandle(e.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} inputMode="email" placeholder="seu.arroba" maxLength={31} aria-describedby={erro ? 'erro' : undefined} aria-invalid={!!erro} />
            </div>
            <button type="submit" className="secundario" disabled={procurando}>{procurando ? 'Procurando…' : 'Achar meu apê'}</button>
          </div>
          {erro && <p id="erro" className="erro" role="alert">{erro}</p>}
        </form>

        <Link href="/loja" className="loja-cta">
          <span aria-hidden>👑</span>
          <span><strong>Personalize seu boneco</strong>Coroa, caramelo na janela, neon… a partir de R$ 1</span>
          <span aria-hidden className="seta">→</span>
        </Link>

        <p className="censo">
          {stats.moradores.toLocaleString('pt-BR')} moradores em {andares.toLocaleString('pt-BR')} {andares === 1 ? 'andar' : 'andares'}
          {stats.ultimo_censo ? `. No último censo chegaram ${stats.ultimo_censo.novos.toLocaleString('pt-BR')}.` : '.'}{' '}
         
        </p>
        <p className="optout">Não quer aparecer no prédio? Mande uma DM pro @{ig} que a portaria tira sua janela.</p>
      </section>
    </main>
  );
}
