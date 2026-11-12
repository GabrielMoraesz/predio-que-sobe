import { avatarSvg } from '@/lib/avatar';
import { PREDIO, type Morador, numeroFormatado, rotulo } from '@/lib/config';

export default function Carteirinha({ m }: { m: Morador }) {
  const data = new Date(m.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' });
  return (
    <article className="carteirinha" aria-label={`Carteirinha de morador de ${rotulo(m)}`}>
      <header>
        <span className="edificio">{PREDIO.edificio}</span>
        <span className="tipo">Carteirinha de morador</span>
      </header>
      <div className="corpo">
        <div className="foto" dangerouslySetInnerHTML={{ __html: avatarSvg(m.handle, 120, m.visual) }} />
        <dl>
          <div className="quem"><dt className="sr">Morador</dt><dd>{rotulo(m)}</dd></div>
          <div><dt>Apto</dt><dd className="lcd">{m.apto}</dd></div>
          <div><dt>Andar</dt><dd className="lcd">{m.andar}</dd></div>
          <div><dt>Morador nº</dt><dd className="lcd">{numeroFormatado(m.numero)}</dd></div>
          <div><dt>{m.staff ? 'Desde' : 'Chegou em'}</dt><dd>{data}</dd></div>
        </dl>
      </div>
      <footer>
        <svg className="assinatura" viewBox="0 0 160 44" aria-hidden>
          <path d="M6 30 q10-26 18-4 q4 12 10-6 q6-16 10 2 q3 12 9-4 q8-14 12 6 q4 10 14-10 q10 4 2 14 q16-6 28-8 q12 0 40-6" fill="none" stroke="#1B2140" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
        <span className="sindico">Paulim, síndico</span>
        <span className="selo ok">{m.staff ? 'Síndico' : 'Morador oficial'}</span>
      </footer>
    </article>
  );
}
