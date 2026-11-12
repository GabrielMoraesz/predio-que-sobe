'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import Building from './Building';
import Elevador from './Elevador';
import Carteirinha from './Carteirinha';
import Joystick from './Joystick';
import { PREDIO, type Morador, rotulo } from '@/lib/config';

const RELACAO: Record<string, string> = {
  porta_esquerda: 'Porta da esquerda', porta_direita: 'Porta da direita', de_cima: 'Andar de cima', de_baixo: 'Andar de baixo',
};

export default function MoradorClient({ m, viz, ocupados }: { m: Morador; viz: Morador[]; ocupados: number }) {
  const [andar, setAndar] = useState(0);
  const [aviso, setAviso] = useState('');
  const [rua, setRua] = useState(false);
  const naRua = useRef(false);
  const joystick = useRef({ x: 0, y: 0 });
  const acenar = useRef(false);
  const [perto, setPerto] = useState<string | null>(null);
  const [todos, setTodos] = useState(false);
  const alternarRua = (v: boolean) => { naRua.current = v; setRua(v); joystick.current = { x: 0, y: 0 }; };
  const storyUrl = `/api/story/${m.handle}`;

  async function compartilhar() {
    const url = `${location.origin}/m/${m.handle}`;
    const texto = `Moro no apto ${m.apto} do Prédio que Sobe. Siga o @${PREDIO.instagram} e vire meu vizinho:`;
    try {
      const blob = await (await fetch(storyUrl)).blob();
      const file = new File([blob], `apto-${m.apto}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], text: `${texto} ${url}` }); return; }
      if (navigator.share) { await navigator.share({ title: PREDIO.nome, text: texto, url }); return; }
      await navigator.clipboard.writeText(`${texto} ${url}`); setAviso('Link copiado. Cola no story ou manda pros amigos.');
    } catch { /* compartilhamento cancelado */ }
  }

  return (
    <main className="tela">
      <Building ocupados={ocupados} foco={{ andar: m.andar, unidade: m.unidade, handle: m.handle }} rotulos={viz} onAndar={setAndar} naRua={naRua} joystick={joystick} visualFoco={m.visual} acenar={acenar} onPerto={setPerto} todos={todos} />
      {!rua && <button type="button" className="todos-arrobas" aria-pressed={todos} onClick={() => setTodos((t) => !t)}>{todos ? 'Mostrar só os vizinhos' : 'Mostrar todos os @'}</button>}
      {rua && (
        <>
          <button type="button" className="subir" onClick={() => alternarRua(false)}>Voltar pro apê</button>
          <p className="dica-rua">Arraste o controle ou use as setas pra andar. Chegue perto dos vizinhos e acene.</p>
          <Joystick saida={joystick} />
          <button type="button" className="acenar" onClick={() => { acenar.current = true; }}>Acenar</button>
          {perto && <Link className="perto" href={`/m/${perto}`}>Visitar o apê de @{perto}</Link>}
        </>
      )}
      <Elevador andar={andar} subindo={andar < m.andar} />
      <section className="painel morador" aria-label={`Apartamento de ${rotulo(m)}`} hidden={rua}>
        <Carteirinha m={m} />
        <div className="acoes">
          <a className="primario" href={storyUrl} download={`apto-${m.apto}.png`}>Baixar pro story</a>
          <button type="button" className="secundario" onClick={compartilhar}>Chamar um vizinho</button>
        </div>
        <button type="button" className="descer" onClick={() => alternarRua(true)}>Descer pra rua e passear</button>
        <Link className="editar" href={`/loja?u=${m.handle}`}>{m.staff ? "Ver a loja" : "Reformar meu boneco"}</Link>
        {aviso && <p className="aviso" role="status">{aviso}</p>}


        <h2>Seus vizinhos</h2>
        {viz.length ? (
          <ul className="vizinhos">
            {viz.map((v) => (
              <li key={v.numero}><Link href={`/m/${v.handle}`}><span className="rel">{RELACAO[v.relacao || ''] || 'Vizinho'}</span><span className="nome">{rotulo(v)}</span><span className="apto lcd">{v.apto}</span></Link></li>
            ))}
          </ul>
        ) : (
          <p className="vazio">Ninguém do lado ainda. Chama alguém pra ser seu vizinho de porta.</p>
        )}
        <p className="voltar"><Link href="/">Ver o prédio inteiro</Link></p>
      </section>
    </main>
  );
}
