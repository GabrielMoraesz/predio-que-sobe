'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { animar, corpoInteiro, dourar, type Corpo } from '@/lib/boneco3d';
import { LUZ_COR, visualDe, type Visual } from '@/lib/visual';

// Vitrine: o boneco de corpo inteiro girando num pedestal, na frente da janela dele. Arraste pra girar.
export default function Vitrine3D({ handle, visual, perto = false }: { handle: string; visual?: Partial<Visual> | null; perto?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const trocar = useRef<((v?: Partial<Visual> | null) => void) | null>(null);
  const chave = JSON.stringify(visual || {});

  useEffect(() => {
    const el = ref.current!;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, el.clientWidth / el.clientHeight, 0.1, 100);
    if (perto) camera.position.set(1.5, 2.0, 4.3); else camera.position.set(2.6, 2.1, 5.6);
    scene.add(new THREE.HemisphereLight('#FFE6CC', '#5A5F86', 1.8), new THREE.AmbientLight('#fff', 0.4));
    const sol = new THREE.DirectionalLight('#FFD2A8', 2); sol.position.set(-3, 5, 4); scene.add(sol);
    const std = (c: THREE.ColorRepresentation, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, ...extra });

    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.6, 0.22, 48), std('#E9E2D6')); pedestal.position.y = -0.11; scene.add(pedestal);
    const faixa = new THREE.Mesh(new THREE.CylinderGeometry(1.61, 1.61, 0.08, 48), std('#2B63B0')); faixa.position.y = -0.17; scene.add(faixa);
    // parede com a janela atrás
    const parede = new THREE.Mesh(new RoundedBoxGeometry(2.7, 2.9, 0.16, 2, 0.05), std('#DDD6CA')); parede.position.set(0, 1.5, -1.05); scene.add(parede);
    const vidro = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9), new THREE.MeshBasicMaterial({ color: '#FFD36E', toneMapped: false })); vidro.position.set(0, 1.65, -0.96); scene.add(vidro);
    const parapeito = new THREE.Mesh(new RoundedBoxGeometry(2.1, 0.14, 0.36, 2, 0.04), std('#EFE9DE')); parapeito.position.set(0, 0.66, -0.86); scene.add(parapeito);
    const extras = new THREE.Group(); scene.add(extras);

    let corpo: Corpo | null = null; let acenaAte = 0;
    trocar.current = (v) => {
      if (corpo) scene.remove(corpo.g);
      corpo = corpoInteiro(handle, v, 0.8); if (v?.fama) dourar(corpo); scene.add(corpo.g);
      extras.clear();
      const vis = visualDe(handle, v);
      (vidro.material as THREE.MeshBasicMaterial).color.set(vis.luz && vis.luz !== 'pisca_pisca' ? LUZ_COR[vis.luz] : '#FFD36E');
      const add = (geo: THREE.BufferGeometry, cor: string, x: number, y: number, z: number, basico = false) => { const m = new THREE.Mesh(geo, basico ? new THREE.MeshBasicMaterial({ color: cor, toneMapped: false }) : std(cor)); m.position.set(x, y, z); extras.add(m); return m; };
      if (vis.luz === 'pisca_pisca') for (let k = 0; k < 9; k++) add(new THREE.SphereGeometry(0.06, 10, 10), ['#FF4B3A', '#F7C531', '#2F8F6B', '#4FC3FF'][k % 4], -0.88 + k * 0.22, 2.56 - (k % 2) * 0.07, -0.9, true);
      if (vis.janela === 'planta') { add(new THREE.CylinderGeometry(0.2, 0.15, 0.34, 18), '#B5533C', 1.0, 0.17, 0.5); add(new THREE.IcosahedronGeometry(0.3, 1), '#3FA77E', 1.0, 0.56, 0.5); }
      if (vis.janela === 'gato' || vis.janela === 'caramelo') {
        const dog = vis.janela === 'caramelo'; const c1 = dog ? '#C98B4A' : '#5B5F6E', c2 = dog ? '#D99A55' : '#6A6E7E';
        add(new RoundedBoxGeometry(0.62, 0.36, 0.34, 2, 0.1), c1, 1.02, 0.3, 0.5);
        add(new RoundedBoxGeometry(0.36, 0.32, 0.32, 2, 0.1), c2, 1.26, 0.56, 0.5);
        for (const s of [-1, 1]) { add(new THREE.ConeGeometry(0.07, dog ? 0.12 : 0.16, 4), dog ? '#8A5A2B' : c1, 1.26, 0.77, 0.5 + s * 0.1); add(new THREE.SphereGeometry(0.03, 8, 8), '#1B2140', 1.44, 0.6, 0.5 + s * 0.08, true); }
        for (const [x, z] of [[0.82, 0.38], [0.82, 0.62], [1.2, 0.38], [1.2, 0.62]]) add(new RoundedBoxGeometry(0.1, 0.16, 0.1, 1, 0.03), c1, x, 0.08, z);
        add(new RoundedBoxGeometry(0.08, 0.08, 0.3, 1, 0.03), c1, 0.7, 0.44, 0.5).rotation.x = dog ? 0.4 : -0.5;
      }
      acenaAte = performance.now() + 1500;
    };
    trocar.current(JSON.parse(chave));

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, perto ? 1.35 : 1.15, 0); controls.enablePan = false; controls.enableZoom = false; controls.enableDamping = true;
    controls.minPolarAngle = Math.PI * 0.3; controls.maxPolarAngle = Math.PI * 0.52; controls.minAzimuthAngle = -1.1; controls.maxAzimuthAngle = 1.1;
    let raf = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (corpo) { animar(corpo, !reduce && now < acenaAte ? 'acenando' : 'parado', now / 1000); if (!reduce) corpo.g.rotation.y = Math.sin(now / 1600) * 0.35; }
      controls.update(); renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);
    const ro = new ResizeObserver(() => { camera.aspect = el.clientWidth / el.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(el.clientWidth, el.clientHeight); });
    ro.observe(el);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); renderer.dispose(); el.removeChild(renderer.domElement); trocar.current = null; };
  }, [handle]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { trocar.current?.(JSON.parse(chave)); }, [chave]);

  return <div ref={ref} className="vitrine" role="img" aria-label="Seu boneco em 3D. Arraste pra girar." />;
}
