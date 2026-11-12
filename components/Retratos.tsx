'use client';
import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { animar, corpoInteiro } from '@/lib/boneco3d';
import type { Visual } from '@/lib/visual';

type Janela = [number, string, Partial<Visual> | null];
const FUNDOS = ['#F7C531,#FF8A3D', '#FF8FC8,#E2557A', '#B7A2FF,#7A4FB8', '#7FE3FF,#2B63B0', '#9BE58F,#2F8F6B', '#FFD2A8,#B5533C'];
const EXEMPLOS: Partial<Visual>[] = [
  { cabeca: 'coroa', roupa: 'terno', genero: 1 }, { cabeca: 'bone_laranja', rosto: 'oculos_escuros' }, { cabeca: 'fone', roupa: 'camisa_amarela', genero: 1 },
  { cabeca: 'chapeu_palha', rosto: 'bigode' }, { cabeca: 'capacete_obra', rosto: 'oculos_redondos', genero: 1 }, { rosto: 'oculos_escuros', roupa: 'terno' },
];

// Retratos 3D dos moradores reformados (renderizados uma vez cada, num único renderizador fora da tela).
export default function Retratos() {
  const [fotos, setFotos] = useState<{ h: string; src: string; exemplo: boolean }[]>([]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      let lista: Janela[] = [];
      try { lista = await (await fetch('/api/janelas?ate=600')).json(); } catch { /* sem rede */ }
      const reformados = lista.filter(([n, , vis]) => n > 1 && vis && ['cabeca', 'rosto', 'roupa'].some((k) => (vis as Record<string, unknown>)[k]))
        .sort(() => Math.random() - 0.5).slice(0, 10).map(([, h, vis]) => ({ h, vis, exemplo: false }));
      const alvo = reformados.length >= 4 ? reformados : [...reformados, ...EXEMPLOS.map((vis, i) => ({ h: `exemplo${i}`, vis, exemplo: true }))].slice(0, 8);

      const W = 240, H = 280;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
      const scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight('#FFF1DE', '#6A6F96', 2.2));
      const sol = new THREE.DirectionalLight('#FFE2C4', 2.2); sol.position.set(-2, 4, 5); scene.add(sol);
      const cam = new THREE.PerspectiveCamera(26, W / H, 0.1, 50); cam.position.set(0.9, 1.75, 4.1); cam.lookAt(0, 1.5, 0);
      const out: { h: string; src: string; exemplo: boolean }[] = [];
      for (const r of alvo) {
        const c = corpoInteiro(r.h, r.vis, 0.8);
        c.g.rotation.y = -0.18; animar(c, 'parado', 0); scene.add(c.g);
        renderer.render(scene, cam);
        out.push({ h: r.h, exemplo: r.exemplo, src: renderer.domElement.toDataURL('image/png') });
        scene.remove(c.g);
      }
      renderer.dispose();
      if (vivo) setFotos(out);
    })();
    return () => { vivo = false; };
  }, []);

  if (!fotos.length) return <div className="retratos vazio" aria-hidden />;
  const loop = [...fotos, ...fotos];
  return (
    <section className="retratos" aria-label="Moradores reformados">
      <div className="fita">
        {loop.map((f, i) => (
          <figure key={i} aria-hidden={i >= fotos.length}>
            <div className="moldura" style={{ background: `linear-gradient(160deg, ${FUNDOS[i % FUNDOS.length]})` }}><img src={f.src} alt="" width={120} height={140} /></div>
            <figcaption>{f.exemplo ? 'exemplo' : '@' + f.h}</figcaption>
          </figure>
        ))}
      </div>
      <p>{fotos.some((f) => !f.exemplo) ? 'Quem reformou aparece aqui e no próximo vídeo do prédio 🎬' : 'Seja o primeiro a aparecer aqui (e no próximo vídeo do prédio) 🎬'}</p>
    </section>
  );
}
