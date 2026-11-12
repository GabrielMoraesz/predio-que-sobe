'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { PREDIO, type Morador, rotulo } from '@/lib/config';
import { LUZ_COR, visualDe, type Visual } from '@/lib/visual';
import { animar, corpoInteiro, pecas, registro, type Corpo } from '@/lib/boneco3d';

const U = PREDIO.aptosPorAndar;
const WIN_W = 1.25, WIN_H = 1.45, GAP = 0.65, FH = 2.7;
const FACE_W = U * WIN_W + (U + 1) * GAP;
const DEPTH = 9;
const RUA_Z = 20; // rua na frente do prédio
const COLS = { concreto: '#DDD6CA', pastilha: '#2B63B0', faixa: '#E9E2D6', acesa: '#FFD36E', apagada: '#273055', grua: '#F7C531' };
const PASTEIS = ['#E8B4A0', '#F2D28B', '#A8D5C2', '#9DB8E0', '#E9A6B9', '#D9D2C4', '#C7B8E6', '#F0C8A0', '#B9D7A1'];

export type Foco = { andar: number; unidade: number; handle: string } | null;
type Janela = [number, string, Partial<Visual> | null];
type Caixa = { x0: number; x1: number; z0: number; z1: number };
type Carros = { mesh: THREE.InstancedMesh; teto: THREE.InstancedMesh; dados: { x: number; z: number; v: number; cor: string }[] };

function windowPos(andar: number, unidade: number) {
  const x = -FACE_W / 2 + GAP + (unidade - 1) * (WIN_W + GAP) + WIN_W / 2;
  const y = (andar - 1) * FH + FH * 0.55;
  return new THREE.Vector3(x, y, DEPTH / 2 + 0.03);
}

function mulberry(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function textSprite(text: string, big = false) {
  const c = document.createElement('canvas');
  const fs = big ? 64 : 40;
  const ctx = c.getContext('2d')!;
  ctx.font = `800 ${fs}px Archivo, sans-serif`;
  const w = Math.ceil(ctx.measureText(text).width) + fs;
  c.width = w; c.height = fs * 1.7;
  ctx.font = `800 ${fs}px Archivo, sans-serif`;
  ctx.fillStyle = big ? '#F7C531' : 'rgba(27,33,64,.88)';
  ctx.beginPath(); ctx.roundRect(0, 0, w, c.height, c.height / 2); ctx.fill();
  ctx.fillStyle = big ? '#1B2140' : '#FFFFFF';
  ctx.textBaseline = 'middle'; ctx.fillText(text, fs / 2, c.height / 2 + 2);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  const scale = big ? 0.0062 : 0.0046;
  sp.scale.set(w * scale, c.height * scale, 1);
  sp.renderOrder = 10;
  return sp;
}

function skyTexture() {
  const c = document.createElement('canvas'); c.width = 4; c.height = 512;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#1B2140'); g.addColorStop(0.55, '#5B4A86'); g.addColorStop(0.82, '#E98A6B'); g.addColorStop(1, '#F6C08A');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Texturas de fachada dos prédios vizinhos: parede com janelas e um mapa só das janelas acesas.
function fachadas(rnd: () => number) {
  return Array.from({ length: 4 }, () => {
    const a = document.createElement('canvas'), b = document.createElement('canvas');
    a.width = b.width = 64; a.height = b.height = 64;
    const ca = a.getContext('2d')!, cb = b.getContext('2d')!;
    ca.fillStyle = '#fff'; ca.fillRect(0, 0, 64, 64); cb.fillStyle = '#000'; cb.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const acesa = rnd() < 0.45;
      ca.fillStyle = acesa ? '#FFE2A0' : '#3A4166'; ca.fillRect(x * 16 + 3, y * 16 + 3, 10, 11);
      if (acesa) { cb.fillStyle = rnd() < 0.2 ? '#9FD8FF' : '#FFC86B'; cb.fillRect(x * 16 + 3, y * 16 + 3, 10, 11); }
    }
    const map = new THREE.CanvasTexture(a), em = new THREE.CanvasTexture(b);
    [map, em].forEach((t) => { t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; });
    return { map, em };
  });
}

// Um InstancedMesh por peça; `por` posiciona a próxima instância.
function inst(geo: THREE.BufferGeometry, mat: THREE.Material, n: number) {
  const m = new THREE.InstancedMesh(geo, mat, Math.max(1, n)); m.count = 0; return m;
}
const aux = new THREE.Object3D();
function por(m: THREE.InstancedMesh, x: number, y: number, z: number, cor?: THREE.ColorRepresentation, rot?: [number, number, number], esc?: [number, number, number]) {
  if (m.count >= m.instanceMatrix.count) return;
  aux.position.set(x, y, z); aux.rotation.set(...(rot || [0, 0, 0])); aux.scale.set(...(esc || [1, 1, 1])); aux.updateMatrix();
  m.setMatrixAt(m.count, aux.matrix); if (cor !== undefined) m.setColorAt(m.count, new THREE.Color(cor)); m.count++;
}

function montarCidade(scene: THREE.Scene, colisores: Caixa[]): Carros {
  const rnd = mulberry(20261112);
  const fac = fachadas(rnd);
  const lamb = (color: THREE.ColorRepresentation) => new THREE.MeshLambertMaterial({ color });

  const chao = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), lamb('#46523F')); chao.rotation.x = -Math.PI / 2; scene.add(chao);
  const asfalto = lamb('#34363F');
  for (let k = -6; k <= 2; k++) { const r = new THREE.Mesh(new THREE.PlaneGeometry(440, 10), asfalto); r.rotation.x = -Math.PI / 2; r.position.set(0, 0.03, RUA_Z + 40 * k); scene.add(r); }
  for (let k = -5; k <= 4; k++) { const r = new THREE.Mesh(new THREE.PlaneGeometry(10, 360), asfalto); r.rotation.x = -Math.PI / 2; r.position.set(22 + 44 * k, 0.031, -60); scene.add(r); }
  const faixas = inst(new THREE.BoxGeometry(2.2, 0.02, 0.22), new THREE.MeshBasicMaterial({ color: '#E9E2D6' }), 800);
  for (let k = -6; k <= 2; k++) for (let x = -210; x < 210; x += 6) if (Math.abs((((x % 44) + 44) % 44) - 22) > 6) por(faixas, x, 0.05, RUA_Z + 40 * k);
  scene.add(faixas);

  const calcadaGeo = new THREE.BoxGeometry(1, 0.25, 1); const calcadaMat = lamb('#CFC8BA');
  const arvTronco = inst(new THREE.CylinderGeometry(0.18, 0.25, 2, 6), lamb('#6B4A32'), 400);
  const arvCopa = inst(new THREE.IcosahedronGeometry(1.5, 0), lamb('#ffffff'), 400);
  const arvore = (x: number, z: number, s = 1) => { por(arvTronco, x, 1, z); por(arvCopa, x, 2.6 * s, z, rnd() < 0.3 ? '#5FA35C' : '#3E8A57', [rnd(), rnd(), 0], [s, s * 1.1, s]); };
  const postes = inst(new THREE.CylinderGeometry(0.08, 0.1, 5, 6), lamb('#2A2E3A'), 80);
  const lampadas = inst(new THREE.SphereGeometry(0.32, 8, 6), new THREE.MeshBasicMaterial({ color: '#FFE0A0', toneMapped: false }), 80);
  for (let x = -66; x <= 66; x += 12) for (const z of [RUA_Z - 6, RUA_Z + 6]) { por(postes, x, 2.5, z); por(lampadas, x, 5.1, z); }

  const casaGeo = new THREE.BoxGeometry(1, 1, 1); const telhadoGeo = new THREE.ConeGeometry(0.75, 1, 4); telhadoGeo.rotateY(Math.PI / 4);
  const telhadoMat = lamb('#B5533C');
  const banco = inst(new THREE.BoxGeometry(2.2, 0.5, 0.7), lamb('#8A5A2B'), 40);

  for (let i = -4; i <= 4; i++) for (let j = -5; j <= 1; j++) {
    const cx = i * 44, cz = j * 40;
    const cal = new THREE.Mesh(calcadaGeo, calcadaMat); cal.scale.set(36, 1, 31); cal.position.set(cx, 0.12, cz); scene.add(cal);
    if (i === 0 && j === 0) { [-14, 14].forEach((x) => arvore(x, 12.5, 0.9)); continue; } // lote do nosso prédio
    if (j === 1) {
      if (i === 0) { // praça na frente do prédio
        const g = new THREE.Mesh(new THREE.BoxGeometry(32, 0.3, 26), lamb('#5FA35C')); g.position.set(cx, 0.2, cz); scene.add(g);
        for (let t = 0; t < 14; t++) arvore(cx - 14 + rnd() * 28, cz - 11 + rnd() * 22, 0.8 + rnd() * 0.5);
        for (let b = 0; b < 4; b++) por(banco, cx - 9 + b * 6, 0.55, cz - 9);
        const fonte = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.3, 0.8, 20), lamb('#CFC8BA')); fonte.position.set(cx, 0.6, cz + 2); scene.add(fonte); colisores.push({ x0: cx - 3.4, x1: cx + 3.4, z0: cz - 1.4, z1: cz + 5.4 });
        const agua = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.1, 20), new THREE.MeshBasicMaterial({ color: '#6FB7E8' })); agua.position.set(cx, 1.02, cz + 2); scene.add(agua);
        continue;
      }
      for (let c = 0; c < 3; c++) { // casinhas baixas pra não tapar a vista do prédio
        const w = 7 + rnd() * 3, d = 8 + rnd() * 4, h = 3 + Math.floor(rnd() * 2) * 2.7;
        const x = cx - 11 + c * 11, z = cz - 4 + rnd() * 6;
        const casa = new THREE.Mesh(casaGeo, lamb(PASTEIS[Math.floor(rnd() * PASTEIS.length)])); casa.scale.set(w, h, d); casa.position.set(x, h / 2 + 0.25, z); scene.add(casa); colisores.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
        const tel = new THREE.Mesh(telhadoGeo, telhadoMat); tel.scale.set(w * 1.05, 2.2, d * 1.05); tel.position.set(x, h + 1.35, z); scene.add(tel);
      }
      arvore(cx - 16, cz - 13); arvore(cx + 16, cz - 13);
      continue;
    }
    const n = 1 + Math.floor(rnd() * 3); let x0 = cx - 16;
    for (let b = 0; b < n; b++) {
      const w = 32 / n - 1.5 - rnd() * 2, d = 12 + rnd() * 14;
      const andaresB = j === 0 ? 3 + Math.floor(rnd() * (Math.abs(i) === 1 ? 5 : 8)) : 6 + Math.floor(rnd() * (10 + Math.abs(j) * 6));
      const h = andaresB * FH;
      const f = fac[Math.floor(rnd() * fac.length)];
      const map = f.map.clone(), em = f.em.clone(); map.needsUpdate = em.needsUpdate = true;
      map.repeat.set(w / 10, h / 10.8); em.repeat.copy(map.repeat);
      const parede = new THREE.MeshLambertMaterial({ color: PASTEIS[Math.floor(rnd() * PASTEIS.length)], map, emissive: '#ffffff', emissiveMap: em, emissiveIntensity: 0.9 });
      const teto = lamb('#8C8577');
      const p = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [parede, parede, teto, teto, parede, parede]);
      p.position.set(x0 + w / 2, h / 2 + 0.25, cz - 15 + d / 2 + rnd() * (30 - d)); scene.add(p);
      colisores.push({ x0: p.position.x - w / 2, x1: p.position.x + w / 2, z0: p.position.z - d / 2, z1: p.position.z + d / 2 });
      if (rnd() < 0.35) { const caixa = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 2.4), lamb('#2F7FD1')); caixa.position.set(p.position.x, h + 1.1, p.position.z); scene.add(caixa); }
      x0 += 32 / n;
    }
    if (j === 0) for (let t = 0; t < 3; t++) arvore(cx - 14 + t * 14, cz + 14);
  }
  [faixas, arvTronco, arvCopa, postes, lampadas, banco].forEach((m) => { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; });
  scene.add(arvTronco, arvCopa, postes, lampadas, banco);

  // carros andando nas ruas
  const N = 26;
  const carros: Carros = { mesh: inst(new THREE.BoxGeometry(3.6, 1, 1.7), lamb('#ffffff'), N), teto: inst(new THREE.BoxGeometry(2, 0.8, 1.5), lamb('#ffffff'), N), dados: [] };
  const coresCarro = ['#E2493B', '#F7C531', '#2B63B0', '#F2F2F2', '#2F8F6B', '#1E2A4A', '#E2557A'];
  for (let c = 0; c < N; c++) {
    const k = [-1, 0, 0, 1][c % 4]; const sentido = c % 2 ? 1 : -1;
    carros.dados.push({ x: -200 + rnd() * 400, z: RUA_Z + 40 * k + sentido * 2.4, v: sentido * (7 + rnd() * 7), cor: coresCarro[c % coresCarro.length] });
  }
  scene.add(carros.mesh, carros.teto);
  return carros;
}

function moverCarros(carros: Carros, dt: number) {
  carros.mesh.count = 0; carros.teto.count = 0;
  for (const c of carros.dados) {
    c.x += c.v * dt; if (c.x > 210) c.x = -210; if (c.x < -210) c.x = 210;
    por(carros.mesh, c.x, 0.85, c.z, c.cor); por(carros.teto, c.x - Math.sign(c.v) * 0.2, 1.7, c.z, '#BFE3F2');
  }
  carros.mesh.instanceMatrix.needsUpdate = carros.teto.instanceMatrix.needsUpdate = true;
  if (carros.mesh.instanceColor) carros.mesh.instanceColor.needsUpdate = true;
  if (carros.teto.instanceColor) carros.teto.instanceColor.needsUpdate = true;
}

// Bonecos nas janelas: mesmas peças do boneco da rua, em busto, instanciadas (milhares de moradores, poucas chamadas de desenho).
function montarBonecos(lista: Janela[], janelas: THREE.InstancedMesh, total: number) {
  const R = registro();
  const g = new THREE.Group();
  const S = 0.5;
  const porK: Record<string, { m: THREE.Matrix4; c: THREE.Color }[]> = {};
  const q = new THREE.Quaternion(), e = new THREE.Euler(), esc = new THREE.Vector3(S, S, S), pos = new THREE.Vector3();
  const lamb = (color: THREE.ColorRepresentation) => new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
  const extras = {
    vaso: inst(new THREE.CylinderGeometry(0.1, 0.075, 0.18, 14), lamb('#B5533C'), lista.length),
    folhas: inst(new THREE.IcosahedronGeometry(0.15, 1), lamb('#3FA77E'), lista.length),
    gatoCorpo: inst(new RoundedBoxGeometry(0.24, 0.18, 0.16, 2, 0.05), lamb('#5B5F6E'), lista.length),
    gatoCabeca: inst(new RoundedBoxGeometry(0.17, 0.15, 0.15, 2, 0.05), lamb('#5B5F6E'), lista.length),
    dogCorpo: inst(new RoundedBoxGeometry(0.32, 0.2, 0.18, 2, 0.06), lamb('#C98B4A'), lista.length),
    dogCabeca: inst(new RoundedBoxGeometry(0.2, 0.17, 0.17, 2, 0.06), lamb('#D99A55'), lista.length),
    pisca: inst(new THREE.SphereGeometry(0.045, 8, 8), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), lista.length * 6),
  };
  const ocupado = new Set<number>();
  const luzDe = new Map<number, string>();
  for (const [numero, handle, salvo] of lista) {
    if (numero > total) continue;
    ocupado.add(numero);
    const v = visualDe(handle, salvo);
    const andar = Math.floor((numero - 1) / U) + 1, un = ((numero - 1) % U) + 1;
    const p = windowPos(andar, un);
    const bx = p.x - (v.janela ? 0.1 : 0), by = p.y - 0.36 - 1.425 * S, bz = p.z + 0.2;
    for (const pc of pecas(handle, salvo, false)) {
      e.set(pc.rx || 0, pc.ry || 0, pc.rz || 0); q.setFromEuler(e); pos.set(bx + pc.x * S, by + pc.y * S, bz + pc.z * S);
      (porK[pc.k] ||= []).push({ m: new THREE.Matrix4().compose(pos, q, esc), c: new THREE.Color(pc.cor || '#ffffff') });
    }
    const sy = p.y - WIN_H / 2 + 0.16;
    if (v.janela === 'planta') { por(extras.vaso, p.x + 0.42, sy + 0.09, p.z + 0.18); por(extras.folhas, p.x + 0.42, sy + 0.28, p.z + 0.18); }
    if (v.janela === 'gato') { por(extras.gatoCorpo, p.x + 0.42, sy + 0.09, p.z + 0.18); por(extras.gatoCabeca, p.x + 0.47, sy + 0.25, p.z + 0.2); }
    if (v.janela === 'caramelo') { por(extras.dogCorpo, p.x + 0.4, sy + 0.1, p.z + 0.18); por(extras.dogCabeca, p.x + 0.47, sy + 0.28, p.z + 0.22); }
    if (v.luz) luzDe.set(numero, v.luz);
    if (v.luz === 'pisca_pisca') for (let k = 0; k < 6; k++) por(extras.pisca, p.x - 0.55 + k * 0.22, p.y + WIN_H / 2 - 0.08 - (k % 2) * 0.05, p.z + 0.08, ['#FF4B3A', '#F7C531', '#2F8F6B', '#4FC3FF'][k % 4]);
  }
  for (const [k, itens] of Object.entries(porK)) {
    const m = new THREE.InstancedMesh(R[k].geo, R[k].mat, itens.length);
    itens.forEach((it, i) => { m.setMatrixAt(i, it.m); m.setColorAt(i, it.c); });
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; g.add(m);
  }
  Object.values(extras).forEach((m) => { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; g.add(m); });
  // reacende as janelas: só quem mora de verdade fica com a luz acesa
  const cor = new THREE.Color();
  for (let num = 1; num <= total; num++) {
    if (ocupado.has(num)) {
      const l = luzDe.get(num);
      cor.set(l && l !== 'pisca_pisca' ? LUZ_COR[l] : COLS.acesa);
      if (!l) cor.offsetHSL(((num * 37) % 11) / 400 - 0.012, 0, ((num * 13) % 7) / 90 - 0.03);
    } else cor.set(COLS.apagada);
    janelas.setColorAt(num - 1, cor);
  }
  if (janelas.instanceColor) janelas.instanceColor.needsUpdate = true;
  return { grupo: g, pisca: extras.pisca };
}

// Balão de fala sobre a cabeça (com o @ de quem fala).
function balao(quem: string, texto: string) {
  const c = document.createElement('canvas'); const ctx = c.getContext('2d')!;
  const fs = 38, fq = 26;
  ctx.font = `800 ${fs}px Archivo, sans-serif`; const w1 = ctx.measureText(texto).width;
  ctx.font = `700 ${fq}px Archivo, sans-serif`; const w2 = ctx.measureText(quem).width;
  const w = Math.ceil(Math.max(w1, w2)) + 48, h = 112 + 22;
  c.width = w; c.height = h;
  ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#1B2140'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.roundRect(3, 3, w - 6, 106, 26); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w / 2 - 14, 107); ctx.lineTo(w / 2, h - 4); ctx.lineTo(w / 2 + 14, 107); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(w / 2 - 12, 100, 24, 9);
  ctx.textBaseline = 'middle'; ctx.fillStyle = '#545A78'; ctx.font = `700 ${fq}px Archivo, sans-serif`; ctx.fillText(quem, 24, 34);
  ctx.fillStyle = '#1B2140'; ctx.font = `800 ${fs}px Archivo, sans-serif`; ctx.fillText(texto, 24, 74);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sp.scale.set(w * 0.0062, h * 0.0062, 1); sp.renderOrder = 12; sp.center.set(0.5, 0);
  return sp;
}
const FALAS = ['Salve, vizinho!', 'E aí, tudo certo?', 'Bora pra praça?', 'Viu a grua hoje?', 'O prédio não para de subir!', 'Já pegou seu apê?', 'Que pôr do sol, hein', 'Partiu padaria!', 'O síndico tá de olho…', 'Curti seu visual!', 'Mora em que andar?'];
const RESPOSTAS = ['Salve!', 'Tudo na paz!', 'Bora!', 'Vi sim, tá rápido!', 'Demais!', 'Peguei o meu ontem', 'Kkkkkk', 'Fechou!', 'Valeu, vizinho!', 'No 3º, e você?'];
const sorteia = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

function colide(cx: Caixa[], x: number, z: number, r = 0.5) {
  for (const c of cx) if (x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r) return true;
  return false;
}

export default function Building({
  ocupados, foco = null, rotulos = [], onAndar, naRua, joystick, visualFoco = null, acenar, onPerto,
}: {
  ocupados: number; foco?: Foco; rotulos?: Morador[]; onAndar?: (andar: number) => void;
  naRua?: React.MutableRefObject<boolean>; joystick?: React.MutableRefObject<{ x: number; y: number }>; visualFoco?: Partial<Visual> | null;
  acenar?: React.MutableRefObject<boolean>; onPerto?: (handle: string | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current!;
    let vivo = true;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = skyTexture();
    const andaresProntos = Math.max(1, Math.ceil(ocupados / U));
    const andares = andaresProntos + PREDIO.andaresEmObra;
    const H = andares * FH;
    scene.fog = new THREE.Fog('#B9867E', 90 + H * 0.6, 330 + H * 2.2);

    const camera = new THREE.PerspectiveCamera(42, el.clientWidth / el.clientHeight, 0.1, 5000 + H * 4);
    let visivel = 1; // fração da altura visível acima do painel (celular)
    const ajustarOffset = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (w >= 860) { visivel = 1; camera.setViewOffset(w, h, -238, 0, w, h); }
      else { const painel = Math.min(h * 0.64, (document.querySelector('.painel') as HTMLElement | null)?.offsetHeight ?? h * 0.6); visivel = (h - painel) / h; camera.setViewOffset(w, h, 0, painel / 2, w, h); }
      camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    ajustarOffset();
    scene.add(new THREE.HemisphereLight('#FFE6CC', '#5A5F86', 1.7));
    scene.add(new THREE.AmbientLight('#ffffff', 0.35));
    const sun = new THREE.DirectionalLight('#FFC59A', 1.6); sun.position.set(-30, 40 + H, 40); scene.add(sun);

    const colisores: Caixa[] = [{ x0: -FACE_W / 2, x1: FACE_W / 2, z0: -DEPTH / 2, z1: DEPTH / 2 }];
    const carros = montarCidade(scene, colisores);

    // corpo do prédio (andares prontos)
    const B = 0.25; // altura da calçada
    const hp = andaresProntos * FH;
    const corpo = new THREE.Mesh(new THREE.BoxGeometry(FACE_W, hp, DEPTH), new THREE.MeshLambertMaterial({ color: COLS.concreto }));
    corpo.position.y = hp / 2 + B; scene.add(corpo);
    const lajeGeo = new THREE.BoxGeometry(FACE_W + 0.5, 0.22, DEPTH + 0.5);
    const lajes = new THREE.InstancedMesh(lajeGeo, new THREE.MeshLambertMaterial({ color: COLS.faixa }), andaresProntos + 1);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i <= andaresProntos; i++) { m4.makeTranslation(0, i * FH + B, 0); lajes.setMatrixAt(i, m4); }
    scene.add(lajes);
    const pastilha = new THREE.Mesh(new THREE.BoxGeometry(FACE_W + 0.1, 0.9, DEPTH + 0.1), new THREE.MeshLambertMaterial({ color: COLS.pastilha }));
    pastilha.position.y = 0.45 + B; scene.add(pastilha);

    // janelas da frente e parapeitos (tudo num grupo elevado pela calçada)
    const predio = new THREE.Group(); predio.position.y = B; scene.add(predio);
    const total = andaresProntos * U;
    const winGeo = new THREE.PlaneGeometry(WIN_W, WIN_H);
    const janelas = new THREE.InstancedMesh(winGeo, new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), total);
    const parapeito = new THREE.InstancedMesh(new THREE.BoxGeometry(WIN_W + 0.14, 0.16, 0.32), new THREE.MeshLambertMaterial({ color: '#EFE9DE' }), total);
    const cor = new THREE.Color();
    for (let n = 1; n <= total; n++) {
      const andar = Math.floor((n - 1) / U) + 1, un = ((n - 1) % U) + 1;
      const p = windowPos(andar, un);
      m4.makeTranslation(p.x, p.y, p.z); janelas.setMatrixAt(n - 1, m4);
      m4.makeTranslation(p.x, p.y - WIN_H / 2 + 0.08, p.z + 0.16); parapeito.setMatrixAt(n - 1, m4);
      if (n <= ocupados) { cor.set(COLS.acesa); cor.offsetHSL(((n * 37) % 11) / 400 - 0.012, 0, ((n * 13) % 7) / 90 - 0.03); } else cor.set(COLS.apagada);
      janelas.setColorAt(n - 1, cor);
    }
    predio.add(janelas, parapeito);
    const lat = new THREE.InstancedMesh(winGeo, new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), andaresProntos * 6);
    let k = 0;
    for (let a = 1; a <= andaresProntos; a++) for (let s = 0; s < 2; s++) for (let j = 0; j < 3; j++) {
      const z = -DEPTH / 2 + 1.6 + j * 2.9; const x = s ? FACE_W / 2 + 0.03 : -FACE_W / 2 - 0.03;
      const o = new THREE.Object3D(); o.position.set(x, (a - 1) * FH + FH * 0.55, z); o.rotation.y = s ? Math.PI / 2 : -Math.PI / 2; o.updateMatrix();
      lat.setMatrixAt(k, o.matrix); cor.set((a * 7 + j * 3 + s) % 3 === 0 && a * U <= ocupados + U ? COLS.acesa : COLS.apagada); lat.setColorAt(k, cor); k++;
    }
    predio.add(lat);

    // bonecos (carregados depois, pra página abrir rápido)
    let pisca: THREE.InstancedMesh | null = null;
    type Npc = { c: Corpo; handle: string; vis: Partial<Visual> | null; estado: 'saindo' | 'andando' | 'conversando' | 'acenando' | 'parado' | 'entrando'; alvo: THREE.Vector3; ate: number; nasceu: number; vel: number; fala?: THREE.Sprite; falaAte: number; papo: number; par?: Npc; cumprimentou: number };
    const fila: Janela[] = []; const npcs: Npc[] = [];
    const PORTA = new THREE.Vector3(0, B, DEPTH / 2 + 0.6);
    const AREAS: [number, number, number, number, number][] = [[-60, 60, 11.6, 14.6, 4], [-60, 60, 25.8, 27.2, 2], [-13, 13, 29, 50, 3], [-60, 60, -14.6, -14.2, 1]];
    const pesoTotal = AREAS.reduce((t, a) => t + a[4], 0);
    const pontoAleatorio = () => {
      for (let i = 0; i < 12; i++) {
        let r = Math.random() * pesoTotal, a = AREAS[0]; for (const ar of AREAS) { r -= ar[4]; if (r <= 0) { a = ar; break; } }
        const x = a[0] + Math.random() * (a[1] - a[0]), z = a[2] + Math.random() * (a[3] - a[2]);
        if (!colide(colisores, x, z, 0.7)) return new THREE.Vector3(x, B, z);
      }
      return new THREE.Vector3(Math.random() * 40 - 20, B, 13);
    };
    const livre = (a: THREE.Vector3, b: THREE.Vector3) => { for (let i = 1; i <= 10; i++) { const t = i / 10; if (colide(colisores, a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, 0.5)) return false; } return true; };
    const proximoAlvo = (de: THREE.Vector3) => { for (let i = 0; i < 8; i++) { const p = pontoAleatorio(); if (livre(de, p)) return p; } return new THREE.Vector3(de.x + (Math.random() - 0.5) * 6, B, Math.max(11.6, Math.min(14.6, de.z))); };
    const falar = (n: { fala?: THREE.Sprite; falaAte: number }, quem: string, texto: string, agora: number, dura = 3.2) => {
      if (n.fala) { scene.remove(n.fala); n.fala.material.map?.dispose(); n.fala.material.dispose(); }
      n.fala = balao(quem, texto); n.falaAte = agora + dura * 1000; scene.add(n.fala);
    };
    let ultimoNasc = 0, pertoAtual: string | null = null;
    fetch(`/api/janelas?ate=${Math.min(4000, total)}`).then((r) => (r.ok ? r.json() : [])).then((lista: Janela[]) => {
      if (!vivo || !Array.isArray(lista)) return;
      const b = montarBonecos(lista, janelas, total);
      predio.add(b.grupo); pisca = b.pisca;
      // moradores que vão sair do prédio pra passear
      fila.push(...lista.filter((x) => !foco || x[1] !== foco.handle).sort(() => Math.random() - 0.5).slice(0, 60));
    }).catch(() => { /* sem bonecos, o prédio continua de pé */ });

    // andares em obra: pilares + grua
    const obra = new THREE.Group(); obra.position.y = B;
    const pilarGeo = new THREE.BoxGeometry(0.45, FH, 0.45); const pilarMat = new THREE.MeshLambertMaterial({ color: '#B8B0A2' });
    for (let a = 0; a < PREDIO.andaresEmObra; a++) {
      for (const px of [-FACE_W / 2 + 0.3, -FACE_W / 6, FACE_W / 6, FACE_W / 2 - 0.3]) for (const pz of [-DEPTH / 2 + 0.3, DEPTH / 2 - 0.3]) {
        const p = new THREE.Mesh(pilarGeo, pilarMat); p.position.set(px, hp + a * FH + FH / 2, pz); obra.add(p);
      }
      const l = new THREE.Mesh(lajeGeo, pilarMat); l.position.y = hp + (a + 1) * FH; obra.add(l);
    }
    const gruaMat = new THREE.MeshLambertMaterial({ color: COLS.grua });
    const torre = new THREE.Mesh(new THREE.BoxGeometry(0.9, 16, 0.9), gruaMat); torre.position.set(FACE_W / 2 - 2, H + 8, -1); obra.add(torre);
    const lanca = new THREE.Group(); lanca.position.set(FACE_W / 2 - 2, H + 16, -1);
    const braco = new THREE.Mesh(new THREE.BoxGeometry(22, 0.7, 0.7), gruaMat); braco.position.x = -7; lanca.add(braco);
    const cabo = new THREE.Mesh(new THREE.BoxGeometry(0.08, 6, 0.08), new THREE.MeshBasicMaterial({ color: '#222' })); cabo.position.set(-14, -3, 0); lanca.add(cabo);
    const carga = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1, 1.6), new THREE.MeshLambertMaterial({ color: '#B5533C' })); carga.position.set(-14, -6.5, 0); lanca.add(carga);
    obra.add(lanca); scene.add(obra);

    // rótulos com @
    rotulos.forEach((m) => {
      if (foco && m.handle === foco.handle) return;
      const s = textSprite(rotulo(m)); const p = windowPos(m.andar, m.unidade); s.position.set(p.x, p.y + B + 1.3, p.z + 0.5); scene.add(s);
    });
    let beacon: THREE.Mesh | null = null;
    if (foco) {
      const s = textSprite('@' + foco.handle, true); const p = windowPos(foco.andar, foco.unidade);
      s.position.set(p.x, p.y + B + 1.65, p.z + 0.7); scene.add(s);
      beacon = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.45, 40), new THREE.MeshBasicMaterial({ color: COLS.grua, transparent: true, toneMapped: false }));
      beacon.position.set(p.x, p.y + B, p.z + 0.05); scene.add(beacon);
    }

    // câmera
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.screenSpacePanning = true; controls.maxPolarAngle = Math.PI * 0.53;
    controls.minDistance = 4; controls.maxDistance = 300 + H * 3;
    const visaoGeral = () => {
      const alvo = new THREE.Vector3(0, H * 0.5, 0);
      const fit = (H * 0.5 + 6) / Math.tan(THREE.MathUtils.degToRad(21)) / Math.max(0.6, visivel) * (el.clientHeight > el.clientWidth ? 1.05 : 0.95);
      const dist = Math.max(40, fit);
      return { alvo, pos: new THREE.Vector3(dist * 0.42, Math.max(6, H * 0.22), dist) };
    };
    const g = visaoGeral();
    let inicio = { pos: new THREE.Vector3(g.pos.x * 0.6, 4, g.pos.z * 0.5), alvo: new THREE.Vector3(0, 3, 0) };
    let fim = g;
    if (foco) {
      const p = windowPos(foco.andar, foco.unidade);
      fim = { alvo: new THREE.Vector3(p.x, p.y + B + 0.3, p.z), pos: new THREE.Vector3(p.x + 4.5, p.y + B + 1.6, p.z + 11 + (1 - visivel) * 8) };
      inicio = { pos: new THREE.Vector3(p.x + 7, 3, p.z + 15), alvo: new THREE.Vector3(p.x, 3, p.z) };
    }
    const dur = reduce ? 0 : foco ? Math.min(6.5, 2.2 + Math.log2(1 + foco.andar) * 0.55) : 2.6;
    camera.position.copy(dur ? inicio.pos : fim.pos); controls.target.copy(dur ? inicio.alvo : fim.alvo);
    let t0 = performance.now(); let anim = dur > 0;
    const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    renderer.domElement.addEventListener('pointerdown', () => { anim = false; });

    let ultimoAndar = -1, raf = 0, antes = performance.now(), ultimoPisca = 0;
    // modo rua: o boneco desce e anda pela cidade
    const teclas = new Set<string>();
    const kd = (e: KeyboardEvent) => { if (naRua?.current && ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(e.key.toLowerCase())) { teclas.add(e.key.toLowerCase()); e.preventDefault(); } };
    const ku = (e: KeyboardEvent) => teclas.delete(e.key.toLowerCase());
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    let jogador: { c: Corpo; nome: THREE.Sprite; acenaAte: number; fala?: THREE.Sprite; falaAte: number } | null = null;
    let animBase: { de: THREE.Vector3; ate: THREE.Vector3; alvoDe: THREE.Vector3; alvoAte: THREE.Vector3 } | null = null;
    const frente = new THREE.Vector3(), lado = new THREE.Vector3(), mov = new THREE.Vector3();
    const coresPisca = ['#FF4B3A', '#F7C531', '#2F8F6B', '#4FC3FF'];
    moverCarros(carros, 0);
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden) { antes = now; return; }
      const dt = Math.min(0.1, (now - antes) / 1000); antes = now;
      if (anim) {
        const x = Math.min(1, (now - t0) / 1000 / dur); const e = ease(x);
        camera.position.lerpVectors(inicio.pos, fim.pos, e); controls.target.lerpVectors(inicio.alvo, fim.alvo, e);
        if (x >= 1) anim = false;
      }
      // entra e sai do modo rua
      if (naRua?.current && !jogador && foco) {
        const c = corpoInteiro(foco.handle, visualFoco);
        const p = windowPos(foco.andar, foco.unidade);
        c.g.position.set(Math.max(-5, Math.min(5, p.x)), B, DEPTH / 2 + 2.2);
        const nome = textSprite('@' + foco.handle, true); nome.scale.multiplyScalar(0.5); scene.add(nome);
        scene.add(c.g); jogador = { c, nome, acenaAte: 0, falaAte: 0 };
        const b2 = c;
        if (beacon) beacon.visible = false;
        anim = false; controls.minDistance = 3; controls.maxDistance = 30; controls.maxPolarAngle = Math.PI * 0.47;
        const alvo = b2.g.position.clone().add(new THREE.Vector3(0, 1.4, 0));
        animBase = { de: camera.position.clone(), ate: alvo.clone().add(new THREE.Vector3(2.5, 3.2, 8)), alvoDe: controls.target.clone(), alvoAte: alvo }; t0 = now;
      }
      if (!naRua?.current && jogador) {
        scene.remove(jogador.c.g, jogador.nome); if (jogador.fala) scene.remove(jogador.fala); jogador = null; teclas.clear(); onPerto?.(null); pertoAtual = null;
        if (beacon) beacon.visible = true;
        controls.minDistance = 4; controls.maxDistance = 300 + H * 3; controls.maxPolarAngle = Math.PI * 0.53;
        animBase = { de: camera.position.clone(), ate: fim.pos.clone(), alvoDe: controls.target.clone(), alvoAte: fim.alvo.clone() }; t0 = now;
      }
      if (animBase) {
        const x = Math.min(1, (now - t0) / 1600); const e = ease(x);
        camera.position.lerpVectors(animBase.de, animBase.ate, e); controls.target.lerpVectors(animBase.alvoDe, animBase.alvoAte, e);
        if (x >= 1) animBase = null;
      }
      if (jogador && !animBase) {
        let ix = (joystick?.current.x || 0), iy = (joystick?.current.y || 0);
        if (teclas.has('w') || teclas.has('arrowup')) iy += 1; if (teclas.has('s') || teclas.has('arrowdown')) iy -= 1;
        if (teclas.has('d') || teclas.has('arrowright')) ix += 1; if (teclas.has('a') || teclas.has('arrowleft')) ix -= 1;
        const forca = now < jogador.acenaAte ? 0 : Math.min(1, Math.hypot(ix, iy));
        if (forca > 0.05) {
          frente.subVectors(controls.target, camera.position).setY(0).normalize();
          lado.crossVectors(frente, new THREE.Vector3(0, 1, 0)).normalize();
          mov.copy(frente).multiplyScalar(iy).addScaledVector(lado, ix).normalize().multiplyScalar(6.5 * forca * dt);
          const pos = jogador.c.g.position;
          const nx = Math.max(-200, Math.min(200, pos.x + mov.x)), nz = Math.max(-215, Math.min(75, pos.z + mov.z));
          const antigo = pos.clone();
          if (!colide(colisores, nx, nz)) pos.set(nx, B, nz);
          else if (!colide(colisores, nx, pos.z)) pos.x = nx;
          else if (!colide(colisores, pos.x, nz)) pos.z = nz;
          const delta = pos.clone().sub(antigo);
          camera.position.add(delta); controls.target.add(delta);
          jogador.c.g.rotation.y = Math.atan2(mov.x, mov.z);
          jogador.c.fase += dt * 10 * forca;
        }
        if (acenar?.current) {
          acenar.current = false; jogador.acenaAte = now + 1800;
          falar(jogador, '@' + foco!.handle, sorteia(['Salve!', 'Fala, vizinhança!', 'E aí, galera!']), now, 2.4);
          for (const n of npcs) if (n.estado !== 'entrando' && n.c.g.position.distanceTo(jogador.c.g.position) < 6) {
            n.estado = 'acenando'; n.ate = now + 1800 + Math.random() * 600; n.c.g.rotation.y = Math.atan2(jogador.c.g.position.x - n.c.g.position.x, jogador.c.g.position.z - n.c.g.position.z);
            setTimeout(() => falar(n, '@' + n.handle, sorteia(['Salve!', 'Opa!', `Fala, @${foco!.handle}!`, 'Tamo junto!']), performance.now(), 2.4), 300 + Math.random() * 500);
          }
        }
        animar(jogador.c, now < jogador.acenaAte ? 'acenando' : forca > 0.05 ? 'andando' : 'parado', now / 1000);
        jogador.nome.position.copy(jogador.c.g.position).add(new THREE.Vector3(0, 2.75, 0));
        if (jogador.fala) { jogador.fala.position.copy(jogador.c.g.position).add(new THREE.Vector3(0, 3.05, 0)); if (now > jogador.falaAte) { scene.remove(jogador.fala); jogador.fala = undefined; } }
      }
      controls.update();
      const andar = jogador ? 0 : foco
        ? Math.max(0, Math.min(andaresProntos, Math.round(controls.target.y / FH + 0.3)))
        : Math.round(andaresProntos * (dur ? ease(Math.min(1, (now - t0) / 1000 / dur)) : 1));
      if (andar !== ultimoAndar) { ultimoAndar = andar; onAndar?.(andar); }
      if (beacon) { const s = 1 + 0.12 * Math.sin(now / 260); beacon.scale.set(s, s, 1); (beacon.material as THREE.MeshBasicMaterial).opacity = 0.65 + 0.35 * Math.sin(now / 260); }
      if (!reduce) {
        lanca.rotation.y = Math.sin(now / 5200) * 0.5;
        moverCarros(carros, dt);
        // moradores saindo do prédio, passeando, conversando e voltando pra casa
        if (fila.length && npcs.length < 16 && now - ultimoNasc > 2200) {
          ultimoNasc = now; const [, h, vis] = fila.shift()!;
          const c = corpoInteiro(h, vis); c.g.position.copy(PORTA); scene.add(c.g);
          npcs.push({ c, handle: h, vis, estado: 'saindo', alvo: new THREE.Vector3((Math.random() - 0.5) * 6, B, 12.8), ate: 0, nasceu: now, vel: 1.5 + Math.random() * 0.8, falaAte: 0, papo: 0, cumprimentou: 0 });
        }
        const jp = jogador?.c.g.position;
        let maisPerto: Npc | null = null, dMin = 2.6;
        for (let i = npcs.length - 1; i >= 0; i--) {
          const n = npcs[i]; const pos = n.c.g.position;
          const dj = jp ? pos.distanceTo(jp) : 99;
          if (jp && dj < dMin && n.estado !== 'entrando') { maisPerto = n; dMin = dj; }
          if (n.estado === 'saindo' || n.estado === 'andando' || n.estado === 'entrando') {
            if (jp && dj < 2.4 && n.estado !== 'entrando' && now - n.cumprimentou > 20000) {
              n.estado = 'parado'; n.ate = now + 3500; n.cumprimentou = now;
              n.c.g.rotation.y = Math.atan2(jp.x - pos.x, jp.z - pos.z);
              falar(n, '@' + n.handle, sorteia([`Fala, @${foco?.handle}!`, 'E aí, vizinho!', 'Salve! Mora aqui também?', 'Curti seu visual!']), now);
              continue;
            }
            const d = new THREE.Vector3().subVectors(n.alvo, pos).setY(0); const dist = d.length();
            if (dist < 0.25) {
              if (n.estado === 'entrando') { scene.remove(n.c.g); if (n.fala) scene.remove(n.fala); npcs.splice(i, 1); fila.push([0, n.handle, n.vis]); continue; }
              if (now - n.nasceu > 45000 + Math.random() * 30000 && livre(pos, PORTA)) { n.estado = 'entrando'; n.alvo = PORTA.clone(); }
              else { n.estado = 'andando'; n.alvo = proximoAlvo(pos); }
            } else {
              d.normalize(); pos.addScaledVector(d, Math.min(dist, n.vel * dt));
              n.c.g.rotation.y = Math.atan2(d.x, d.z); n.c.fase += dt * n.vel * 6;
            }
            // encontro: dois moradores andando perto um do outro param pra conversar
            if (n.estado === 'andando' && now > n.papo) for (const o of npcs) {
              if (o === n || o.estado !== 'andando' || now < o.papo) continue;
              if (pos.distanceTo(o.c.g.position) < 1.6 && Math.random() < 0.6) {
                const fim2 = now + 4500 + Math.random() * 2500;
                for (const [a, b2] of [[n, o], [o, n]] as const) { a.estado = 'conversando'; a.ate = fim2; a.par = b2; a.papo = fim2 + 15000; a.c.g.rotation.y = Math.atan2(b2.c.g.position.x - a.c.g.position.x, b2.c.g.position.z - a.c.g.position.z); }
                falar(n, '@' + n.handle, sorteia(FALAS), now);
                setTimeout(() => falar(o, '@' + o.handle, sorteia(RESPOSTAS), performance.now()), 1600);
                break;
              }
            }
            animar(n.c, 'andando', now / 1000);
          } else {
            if (now > n.ate) { n.estado = 'andando'; n.alvo = proximoAlvo(pos); n.par = undefined; }
            animar(n.c, n.estado === 'conversando' ? 'conversando' : n.estado === 'acenando' ? 'acenando' : 'parado', now / 1000 + i);
          }
          if (n.fala) { n.fala.position.copy(pos).add(new THREE.Vector3(0, 2.3, 0)); if (now > n.falaAte) { scene.remove(n.fala); n.fala = undefined; } }
        }
        const pertoH = maisPerto ? maisPerto.handle : null;
        if (pertoH !== pertoAtual) { pertoAtual = pertoH; onPerto?.(pertoH); }
        if (pisca && pisca.count && now - ultimoPisca > 450) {
          ultimoPisca = now; const fase = Math.floor(now / 450);
          for (let i = 0; i < pisca.count; i++) pisca.setColorAt(i, new THREE.Color(coresPisca[(i + fase) % 4]));
          if (pisca.instanceColor) pisca.instanceColor.needsUpdate = true;
        }
      }
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);

    const onResize = () => { ajustarOffset(); renderer.setSize(el.clientWidth, el.clientHeight); };
    window.addEventListener('resize', onResize);
    return () => {
      vivo = false; window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
      cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); controls.dispose();
      scene.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); const mat = m.material as THREE.Material | THREE.Material[] | undefined; (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose()); });
      renderer.dispose(); el.removeChild(renderer.domElement);
    };
  }, [ocupados, foco?.handle, foco?.andar, foco?.unidade, rotulos.map((r) => r.handle).join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={ref} className="cena" aria-label="Prédio em 3D numa cidade: cada janela acesa tem o boneco de um morador" role="img" />;
}
