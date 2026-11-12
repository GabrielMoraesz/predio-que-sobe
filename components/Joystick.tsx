'use client';
import { useRef, useState } from 'react';

// Controle de toque: arrasta a bolinha pra andar. Escreve a direção em `saida` (y = pra frente).
export default function Joystick({ saida }: { saida: React.MutableRefObject<{ x: number; y: number }> }) {
  const base = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const R = 46;
  function mover(e: React.PointerEvent) {
    const r = base.current!.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy); if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
    setPos({ x: dx, y: dy }); saida.current = { x: dx / R, y: -dy / R };
  }
  function soltar() { setPos({ x: 0, y: 0 }); saida.current = { x: 0, y: 0 }; }
  return (
    <div ref={base} className="joystick" aria-label="Controle pra andar" role="application"
      onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); mover(e); }}
      onPointerMove={(e) => { if (e.buttons || e.pointerType === 'touch') mover(e); }}
      onPointerUp={soltar} onPointerCancel={soltar}>
      <span style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }} />
    </div>
  );
}
