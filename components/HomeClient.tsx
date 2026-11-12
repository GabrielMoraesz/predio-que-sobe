'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Building from './Building';
import Elevador from './Elevador';
import { salvarChave } from '@/lib/chave';
import { HANDLE_RE, normalizarHandle, PREDIO, type Estatisticas } from '@/lib/config';

const ERROS: Record<string, string> = {
  handle_invalido: 'Esse @ não parece válido. Use só letras, números, ponto e underline.',
  sem_consentimento: 'Marque a caixinha pra liberar sua janela.',
  nao_encontrado: 'Ninguém mora com esse @ ainda. Toque em "Pegar meu apartamento".',
  falha: 'Não deu pra falar com a portaria agora. Tenta de novo em alguns segundos.',
};

export default function HomeClient({ stats }: { stats: Estatisticas }) {
  const router = useRouter();
  const [andar, setAndar] = useState(0);
  const [handle, setHandle] = useState('');
  const [consent, setConsent] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState<'' | 'pegar' | 'achar'>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const andares = Math.max(1, Math.ceil(stats.ultimo_numero / PREDIO.aptosPorAndar));

  function validar() {
    const h = normalizarHandle(handle);
    if (!HANDLE_RE.test(h)) { setErro(ERROS.handle_invalido); inputRef.current?.focus(); return null; }
    return h;
  }

  async function pegar(e: React.FormEvent) {
    e.preventDefault(); setErro('');
    const h = validar(); if (!h) return;
    if (!consent) { setErro(ERROS.sem_consentimento); return; }
    setEnviando('pegar');
    try {
      const r = await fetch('/api/registrar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ handle: h, consentiu: true }) });
      const j = await r.json();
      if (!r.ok) { setErro(ERROS[j.erro] || ERROS.falha); setEnviando(''); return; }
      if (j.chave) salvarChave(j.handle, j.chave);
      router.push(`/m/${j.handle}?c=${j.codigo}${j.novo ? '&novo=1' : ''}`);
    } catch { setErro(ERROS.falha); setEnviando(''); }
  }

  async function achar() {
    setErro(''); const h = validar(); if (!h) return;
    setEnviando('achar');
    const r = await fetch(`/api/morador/${h}`);
    if (r.status === 404) { setErro(ERROS.nao_encontrado); setEnviando(''); return; }
    router.push(`/m/${h}`);
  }

  return (
    <main className="tela">
      <Building ocupados={stats.ultimo_numero} rotulos={stats.recentes} onAndar={setAndar} />
      <Elevador andar={andar} subindo={false} />
      <section className="painel" aria-labelledby="titulo">
        <h1 id="titulo">Cada seguidor ganha um apartamento.</h1>
        <p className="lead">O prédio sobe um andar a cada {PREDIO.aptosPorAndar} moradores. Quem chega antes fica com o número mais baixo, pra sempre.</p>
        <form onSubmit={pegar} noValidate>
          <label htmlFor="handle" className="rotulo">Seu @ do Instagram</label>
          <div className="campo">
            <span aria-hidden>@</span>
            <input id="handle" ref={inputRef} value={handle} onChange={(e) => setHandle(e.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} inputMode="email" placeholder="seu.arroba" maxLength={31} aria-describedby={erro ? 'erro' : undefined} aria-invalid={!!erro} />
          </div>
          <label className="check">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>Topo meu @ aparecer na janela do prédio e nos vídeos do @{PREDIO.instagram}.</span>
          </label>
          {erro && <p id="erro" className="erro" role="alert">{erro}</p>}
          <div className="acoes">
            <button type="submit" className="primario" disabled={!!enviando}>{enviando === 'pegar' ? 'Separando a chave…' : 'Pegar meu apartamento'}</button>
            <button type="button" className="secundario" onClick={achar} disabled={!!enviando}>{enviando === 'achar' ? 'Procurando…' : 'Achar meu apê'}</button>
          </div>
        </form>
        <p className="censo">{stats.moradores.toLocaleString('pt-BR')} moradores em {andares.toLocaleString('pt-BR')} {andares === 1 ? 'andar' : 'andares'}. O síndico mora no 101. <Link href="/loja">Ver a loja de acessórios</Link></p>
      </section>
    </main>
  );
}
