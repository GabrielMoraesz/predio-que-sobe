'use client';
export default function Elevador({ andar, subindo }: { andar: number; subindo: boolean }) {
  const txt = andar <= 0 ? 'T' : String(andar).padStart(3, '!');
  return (
    <div className="elevador" aria-live="polite" aria-label={andar <= 0 ? 'Térreo' : `Andar ${andar}`}>
      <span className={'seta' + (subindo ? ' ativa' : '')} aria-hidden>▲</span>
      <span className="digitos" aria-hidden>
        <span className="fantasma">888</span>
        <span className="aceso">{txt}</span>
      </span>
    </div>
  );
}
