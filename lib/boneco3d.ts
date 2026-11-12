// Boneco 3D no estilo blocado: as mesmas peças servem pro busto na janela (instanciado) e pro corpo inteiro na rua.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { CAMISAS, CORES_CABELO, PELES, ROUPA_COR, visualDe, type Visual } from './visual';

export const CALCA = '#2B2F45';
export type Membro = 'pernaE' | 'pernaD' | 'bracoE' | 'bracoD';
export type Peca = { k: string; x: number; y: number; z: number; cor?: string; rx?: number; ry?: number; rz?: number; membro?: Membro };
export const PIVOS: Record<Membro, [number, number, number]> = { pernaE: [-0.25, 0.95, 0], pernaD: [0.25, 0.95, 0], bracoE: [-0.74, 1.88, 0], bracoD: [0.74, 1.88, 0] };

function rostoTextura() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff'; g.fillRect(0, 0, 512, 256);
  g.fillStyle = '#1B2140';
  for (const x of [228, 284]) { g.beginPath(); g.ellipse(x, 102, 10, 17, 0, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#fff'; for (const x of [231, 287]) { g.beginPath(); g.arc(x, 95, 4, 0, Math.PI * 2); g.fill(); }
  g.strokeStyle = '#1B2140'; g.lineWidth = 9; g.lineCap = 'round';
  g.beginPath(); g.arc(256, 140, 34, Math.PI * 0.18, Math.PI * 0.82); g.stroke();
  g.fillStyle = 'rgba(226,85,122,.18)'; for (const x of [206, 306]) { g.beginPath(); g.ellipse(x, 140, 16, 9, 0, 0, Math.PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

type Reg = Record<string, { geo: THREE.BufferGeometry; mat: THREE.Material | THREE.Material[] }>;
let REG: Reg | null = null;
export function registro(): Reg {
  if (REG) return REG;
  const std = (color: THREE.ColorRepresentation, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0, ...extra });
  const rb = (w: number, h: number, d: number, r = 0.08) => new RoundedBoxGeometry(w, h, d, 3, r);
  const tingivel = () => std('#ffffff');
  const face = std('#ffffff', { map: rostoTextura() });
  REG = {
    cabeca: { geo: new THREE.CylinderGeometry(0.33, 0.33, 0.62, 40, 1, false, -Math.PI, Math.PI * 2), mat: [face, tingivel(), tingivel()] },
    tronco: { geo: rb(1.0, 0.95, 0.5, 0.1), mat: tingivel() },
    manga: { geo: rb(0.46, 0.56, 0.46), mat: tingivel() },
    mao: { geo: rb(0.42, 0.42, 0.42), mat: tingivel() },
    perna: { geo: rb(0.48, 0.95, 0.48), mat: tingivel() },
    sapato: { geo: rb(0.5, 0.16, 0.56, 0.06), mat: std('#1B2140') },
    cabeloCurto: { geo: rb(0.74, 0.22, 0.74, 0.1), mat: tingivel() },
    cabeloLongo: { geo: rb(0.72, 0.8, 0.18, 0.07), mat: tingivel() },
    coque: { geo: rb(0.26, 0.22, 0.26, 0.08), mat: tingivel() },
    black: { geo: rb(1.0, 0.8, 0.9, 0.34), mat: tingivel() },
    boneCopa: { geo: new THREE.CylinderGeometry(0.36, 0.37, 0.2, 32), mat: std('#FF7A1A') },
    boneAba: { geo: rb(0.46, 0.05, 0.36, 0.02), mat: std('#E0620A') },
    capacete: { geo: new THREE.SphereGeometry(0.42, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat: std('#F7C531', { roughness: 0.35 }) },
    capaceteAba: { geo: new THREE.CylinderGeometry(0.47, 0.47, 0.05, 32), mat: std('#F7C531', { roughness: 0.35 }) },
    palhaAba: { geo: new THREE.CylinderGeometry(0.72, 0.72, 0.05, 36), mat: std('#E3C27A', { roughness: 0.9 }) },
    palhaCopa: { geo: new THREE.CylinderGeometry(0.3, 0.34, 0.28, 28), mat: std('#E9CD8A', { roughness: 0.9 }) },
    palhaFita: { geo: new THREE.CylinderGeometry(0.345, 0.345, 0.07, 28), mat: std('#B5533C') },
    fone: { geo: new THREE.TorusGeometry(0.4, 0.05, 10, 28, Math.PI), mat: std('#1B2140') },
    foneConcha: { geo: rb(0.12, 0.24, 0.22, 0.05), mat: std('#E2557A') },
    coroa: { geo: new THREE.CylinderGeometry(0.27, 0.3, 0.24, 5, 1, true), mat: std('#F7C531', { side: THREE.DoubleSide, metalness: 0.6, roughness: 0.3, emissive: '#4A3500' }) },
    oculos: { geo: rb(0.52, 0.13, 0.05, 0.03), mat: std('#111522', { roughness: 0.2 }) },
    lente: { geo: new THREE.TorusGeometry(0.085, 0.018, 8, 20), mat: std('#1B2140') },
    bigode: { geo: rb(0.26, 0.07, 0.05, 0.03), mat: std('#3B2416') },
    camisaBranca: { geo: rb(0.32, 0.5, 0.03, 0.01), mat: std('#FFFFFF') },
    gravata: { geo: rb(0.09, 0.4, 0.03, 0.01), mat: std('#C8352B') },
    gola: { geo: new THREE.TorusGeometry(0.17, 0.035, 8, 20, Math.PI), mat: std('#2F8F6B') },
    sombra: { geo: new THREE.CircleGeometry(0.75, 28), mat: new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.22, depthWrite: false }) },
  };
  return REG;
}

// Lista de peças do boneco, em unidades do corpo (pés em y=0, olhando pra +z).
export function pecas(handle: string, salvo: Partial<Visual> | null | undefined, corpoInteiro: boolean): Peca[] {
  const v = visualDe(handle, salvo);
  const pele = PELES[v.pele] ?? PELES[0], cab = CORES_CABELO[v.corCabelo] ?? CORES_CABELO[0];
  const camisa = (v.roupa && ROUPA_COR[v.roupa]) || CAMISAS[v.camisa] || CAMISAS[0];
  const L: Peca[] = [];
  L.push({ k: 'tronco', x: 0, y: 1.425, z: 0, cor: camisa });
  for (const [s, m] of [[-1, 'bracoE'], [1, 'bracoD']] as const) {
    L.push({ k: 'manga', x: s * 0.74, y: 1.6, z: 0, cor: camisa, membro: m });
    L.push({ k: 'mao', x: s * 0.74, y: 1.12, z: 0, cor: pele, membro: m });
  }
  if (corpoInteiro) for (const [s, m] of [[-1, 'pernaE'], [1, 'pernaD']] as const) {
    L.push({ k: 'perna', x: s * 0.25, y: 0.52, z: 0, cor: CALCA, membro: m });
    L.push({ k: 'sapato', x: s * 0.25, y: 0.08, z: 0.04, membro: m });
  }
  L.push({ k: 'cabeca', x: 0, y: 2.23, z: 0, cor: pele });
  const chapeu = v.cabeca === 'bone_laranja' || v.cabeca === 'capacete_obra' || v.cabeca === 'chapeu_palha';
  if (v.cabelo === 4) L.push({ k: 'black', x: 0, y: 2.44, z: -0.1, cor: cab });
  if (v.cabelo >= 1 && v.cabelo <= 3 && !chapeu) L.push({ k: 'cabeloCurto', x: 0, y: 2.6, z: -0.02, cor: cab });
  if (v.cabelo === 2) L.push({ k: 'cabeloLongo', x: 0, y: 2.18, z: -0.3, cor: cab });
  if (v.cabelo === 3 && !chapeu) L.push({ k: 'coque', x: 0, y: 2.8, z: -0.06, cor: cab });
  if (v.roupa === 'terno') { L.push({ k: 'camisaBranca', x: 0, y: 1.62, z: 0.255 }); L.push({ k: 'gravata', x: 0, y: 1.58, z: 0.275 }); }
  if (v.roupa === 'camisa_amarela') L.push({ k: 'gola', x: 0, y: 1.9, z: 0.24, rz: Math.PI });
  switch (v.cabeca) {
    case 'bone_laranja': L.push({ k: 'boneCopa', x: 0, y: 2.62, z: 0 }, { k: 'boneAba', x: 0, y: 2.55, z: 0.4 }); break;
    case 'capacete_obra': L.push({ k: 'capacete', x: 0, y: 2.46, z: 0 }, { k: 'capaceteAba', x: 0, y: 2.48, z: 0 }); break;
    case 'chapeu_palha': L.push({ k: 'palhaAba', x: 0, y: 2.56, z: 0 }, { k: 'palhaCopa', x: 0, y: 2.72, z: 0 }, { k: 'palhaFita', x: 0, y: 2.64, z: 0 }); break;
    case 'fone': L.push({ k: 'fone', x: 0, y: 2.3, z: 0 }, { k: 'foneConcha', x: -0.38, y: 2.24, z: 0 }, { k: 'foneConcha', x: 0.38, y: 2.24, z: 0 }); break;
    case 'coroa': L.push({ k: 'coroa', x: 0, y: 2.68, z: 0 }); break;
  }
  if (v.rosto === 'oculos_escuros') L.push({ k: 'oculos', x: 0, y: 2.3, z: 0.335 });
  if (v.rosto === 'oculos_redondos') L.push({ k: 'lente', x: -0.112, y: 2.3, z: 0.335 }, { k: 'lente', x: 0.112, y: 2.3, z: 0.335 });
  if (v.rosto === 'bigode') L.push({ k: 'bigode', x: 0, y: 2.2, z: 0.335 });
  return L;
}

// Corpo inteiro (rua): braços e pernas presos em pivôs pra animar o passo, o aceno e a conversa.
export type Corpo = { g: THREE.Group; pivos: Record<Membro, THREE.Group>; fase: number };
export function corpoInteiro(handle: string, salvo?: Partial<Visual> | null, escala = 0.72): Corpo {
  const R = registro();
  const g = new THREE.Group();
  const corpo = new THREE.Group(); corpo.scale.setScalar(escala); g.add(corpo);
  const pivos = {} as Record<Membro, THREE.Group>;
  (Object.keys(PIVOS) as Membro[]).forEach((m) => { const p = new THREE.Group(); p.position.set(...PIVOS[m]); corpo.add(p); pivos[m] = p; });
  for (const pc of pecas(handle, salvo, true)) {
    const r = R[pc.k];
    let mat = r.mat;
    if (pc.cor) mat = Array.isArray(r.mat) ? r.mat.map((m) => { const c = (m as THREE.MeshStandardMaterial).clone(); c.color.set(pc.cor!); return c; }) : (() => { const c = (r.mat as THREE.MeshStandardMaterial).clone(); c.color.set(pc.cor!); return c; })();
    const mesh = new THREE.Mesh(r.geo, mat);
    mesh.rotation.set(pc.rx || 0, pc.ry || 0, pc.rz || 0);
    if (pc.membro) { const pv = PIVOS[pc.membro]; mesh.position.set(pc.x - pv[0], pc.y - pv[1], pc.z - pv[2]); pivos[pc.membro].add(mesh); }
    else { mesh.position.set(pc.x, pc.y, pc.z); corpo.add(mesh); }
  }
  const sombra = new THREE.Mesh(R.sombra.geo, R.sombra.mat); sombra.rotation.x = -Math.PI / 2; sombra.position.y = 0.02; g.add(sombra);
  return { g, pivos, fase: 0 };
}

// Animações: andar (balança braços e pernas), acenar (braço direito pra cima) e conversar (gesticula).
export function animar(c: Corpo, estado: 'parado' | 'andando' | 'acenando' | 'conversando', t: number) {
  const P = c.pivos;
  if (estado === 'andando') {
    const a = Math.sin(c.fase) * 0.65;
    P.pernaE.rotation.x = a; P.pernaD.rotation.x = -a; P.bracoE.rotation.x = -a * 0.9; P.bracoD.rotation.x = a * 0.9; P.bracoD.rotation.z = 0;
    c.g.children[0].position.y = Math.abs(Math.sin(c.fase)) * 0.05;
    return;
  }
  for (const m of ['pernaE', 'pernaD', 'bracoE'] as const) P[m].rotation.x *= 0.8;
  c.g.children[0].position.y *= 0.8;
  if (estado === 'acenando') { P.bracoD.rotation.x = 0; P.bracoD.rotation.z = 2.6 + Math.sin(t * 12) * 0.35; }
  else if (estado === 'conversando') { P.bracoD.rotation.z *= 0.8; P.bracoD.rotation.x = -0.5 - Math.sin(t * 5) * 0.35; P.bracoE.rotation.x = -0.2 + Math.sin(t * 4 + 1) * 0.15; }
  else { P.bracoD.rotation.z *= 0.8; P.bracoD.rotation.x *= 0.8; }
}
