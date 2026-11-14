// Boneco 3D no estilo blocado: as mesmas peças servem pro busto na janela (instanciado) e pro corpo inteiro na rua.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { SINDICO } from './config';
import { CAMISAS, CORES_CABELO, PELES, ROUPA_COR, visualDe, type Visual } from './visual';

export const CALCA = '#2B2F45';
export type Membro = 'pernaE' | 'pernaD' | 'bracoE' | 'bracoD';
export type Peca = { k: string; x: number; y: number; z: number; cor?: string; rx?: number; ry?: number; rz?: number; membro?: Membro };
export const PIVOS: Record<Membro, [number, number, number]> = { pernaE: [-0.25, 0.95, 0], pernaD: [0.25, 0.95, 0], bracoE: [-0.74, 1.88, 0], bracoD: [0.74, 1.88, 0] };

function rostoTextura(feminino = false) {
  // rosto quadrado (frente da cabeça arredondada): olhão com brilho, bochecha rosada e sorriso com dentinho
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff'; g.fillRect(0, 0, 512, 512);
  const tinta = '#1B1D2B';
  for (const x of [186, 326]) {
    g.fillStyle = tinta; g.beginPath(); g.ellipse(x, 236, 30, 44, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x - 9, 218, 12, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(x + 10, 258, 5, 0, Math.PI * 2); g.fill();
  }
  if (feminino) { // cílios
    g.strokeStyle = tinta; g.lineWidth = 9; g.lineCap = 'round';
    for (const [x, s] of [[186, -1], [326, 1]] as const) for (const d of [0, 14]) { g.beginPath(); g.moveTo(x + s * (16 + d), 198 + d * 0.3); g.lineTo(x + s * (34 + d), 176 + d * 0.5); g.stroke(); }
  }
  g.fillStyle = 'rgba(255,110,140,.32)'; for (const x of [120, 392]) { g.beginPath(); g.ellipse(x, 316, 34, 20, 0, 0, Math.PI * 2); g.fill(); }
  // boca aberta em D com um dentinho
  g.fillStyle = '#5B1F2E'; g.beginPath(); g.moveTo(206, 318); g.quadraticCurveTo(256, 322, 306, 318); g.quadraticCurveTo(300, 392, 256, 392); g.quadraticCurveTo(212, 392, 206, 318); g.fill();
  g.fillStyle = '#FF8FA3'; g.beginPath(); g.ellipse(256, 376, 26, 12, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff'; g.fillRect(238, 319, 20, 22); g.fillRect(260, 319, 16, 18);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

// Rosto do síndico: caveira de olhão brilhante, nariz de coração e sorriso de dentes.
function caveiraTextura() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#F4F2EC'; g.fillRect(0, 0, 512, 512);
  const tinta = '#14151C';
  for (const x of [150, 362]) {
    g.fillStyle = tinta; g.beginPath(); g.ellipse(x, 214, 100, 108, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(x - 32, 172, 32, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(x + 36, 262, 14, 0, Math.PI * 2); g.fill();
  }
  // nariz de coração
  g.fillStyle = tinta; g.beginPath();
  g.moveTo(256, 352); g.bezierCurveTo(222, 326, 226, 296, 244, 298); g.bezierCurveTo(252, 299, 256, 306, 256, 312);
  g.bezierCurveTo(256, 306, 260, 299, 268, 298); g.bezierCurveTo(286, 296, 290, 326, 256, 352); g.fill();
  // sorriso com dentes
  g.fillStyle = '#fff'; g.strokeStyle = tinta; g.lineWidth = 12; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(150, 384); g.quadraticCurveTo(256, 470, 362, 384); g.quadraticCurveTo(256, 420, 150, 384); g.closePath(); g.fill(); g.stroke();
  g.lineWidth = 7;
  for (const x of [196, 228, 260, 292, 324]) { g.beginPath(); g.moveTo(x, 384 + Math.abs(x - 256) * 0.05 + 10); g.lineTo(x, 440 - Math.abs(x - 256) * 0.38); g.stroke(); }
  g.beginPath(); g.moveTo(166, 400); g.quadraticCurveTo(256, 430, 346, 400); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

type Reg = Record<string, { geo: THREE.BufferGeometry; mat: THREE.Material | THREE.Material[] }>;
let REG: Reg | null = null;

// Coroa: aro grosso, cinco pontas com bolinha e joias vermelhas. Uma geometria só (cabe no InstancedMesh das janelas).
function coroaGeo() {
  const partes: THREE.BufferGeometry[] = [new THREE.CylinderGeometry(0.39, 0.4, 0.16, 28)];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const ponta = new THREE.ConeGeometry(0.085, 0.24, 4); ponta.rotateY(Math.PI / 4); ponta.translate(Math.sin(a) * 0.34, 0.19, Math.cos(a) * 0.34);
    const bola = new THREE.SphereGeometry(0.045, 10, 8); bola.translate(Math.sin(a) * 0.34, 0.33, Math.cos(a) * 0.34);
    partes.push(ponta, bola);
  }
  return mergeGeometries(partes.map((g) => g.toNonIndexed()))!;
}
function coroaJoias() {
  const partes: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const j = new THREE.SphereGeometry(0.055, 12, 10); j.scale(1, 1, 0.6); j.lookAt(new THREE.Vector3(Math.sin(a), 0, Math.cos(a))); j.translate(Math.sin(a) * 0.405, 0, Math.cos(a) * 0.405);
    partes.push(j);
  }
  return mergeGeometries(partes.map((g) => g.toNonIndexed()))!;
}
export function registro(): Reg {
  if (REG) return REG;
  const std = (color: THREE.ColorRepresentation, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0, ...extra });
  const rb = (w: number, h: number, d: number, r = 0.08) => new RoundedBoxGeometry(w, h, d, 3, r);
  const tingivel = () => std('#ffffff');
  const face = std('#ffffff', { map: rostoTextura() });
  const faceF = std('#ffffff', { map: rostoTextura(true) });
  REG = {
    cabeca: { geo: rb(0.72, 0.64, 0.66, 0.17), mat: (() => { const o = tingivel(); return [o, o, o, o, face, o]; })() },
    cabecaF: { geo: rb(0.72, 0.64, 0.66, 0.17), mat: (() => { const o = tingivel(); return [o, o, o, o, faceF, o]; })() },
    tronco: { geo: rb(1.0, 0.95, 0.5, 0.1), mat: tingivel() },
    troncoF: { geo: (() => { const t = rb(1.0, 0.95, 0.5, 0.12); const p = t.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) * (y > 0 ? 0.9 : 1.02 - (0.08 * y) / 0.475)); } t.computeVertexNormals(); return t; })(), mat: tingivel() },
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
    coroa: { geo: coroaGeo(), mat: std('#F7C531', { metalness: 0.55, roughness: 0.28, emissive: '#5A4000' }) },
    coroaJoia: { geo: coroaJoias(), mat: std('#E0284A', { roughness: 0.15, emissive: '#5A0A18' }) },
    oculos: { geo: rb(0.52, 0.13, 0.05, 0.03), mat: std('#111522', { roughness: 0.2 }) },
    lente: { geo: new THREE.TorusGeometry(0.085, 0.018, 8, 20), mat: std('#1B2140') },
    bigode: { geo: rb(0.26, 0.07, 0.05, 0.03), mat: std('#3B2416') },
    camisaBranca: { geo: rb(0.32, 0.5, 0.03, 0.01), mat: std('#FFFFFF') },
    gravata: { geo: rb(0.09, 0.4, 0.03, 0.01), mat: std('#C8352B') },
    gola: { geo: new THREE.TorusGeometry(0.17, 0.035, 8, 20, Math.PI), mat: std('#2F8F6B') },
    caveira: { geo: rb(0.82, 0.76, 0.74, 0.17), mat: (() => { const o = std('#F4F2EC'); const f = std('#ffffff', { map: caveiraTextura() }); return [o, o, o, o, f, o]; })() },
    capuz: { geo: rb(0.92, 0.34, 0.34, 0.14), mat: tingivel() },
    cordao: { geo: rb(0.05, 0.34, 0.05, 0.02), mat: std('#F4F2EC') },
    ponteira: { geo: new THREE.SphereGeometry(0.04, 10, 8), mat: std('#F4F2EC') },
    bolso: { geo: rb(0.64, 0.24, 0.04, 0.02), mat: tingivel() },
    folha: { geo: new THREE.SphereGeometry(0.07, 14, 10).scale(1, 1, 0.35), mat: std('#2FA35A', { roughness: 0.5 }) },
    sombra: { geo: new THREE.CircleGeometry(0.75, 28), mat: new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.22, depthWrite: false }) },
  };
  return REG;
}

// Lista de peças do boneco, em unidades do corpo (pés em y=0, olhando pra +z).
export function pecas(handle: string, salvo: Partial<Visual> | null | undefined, corpoInteiro: boolean): Peca[] {
  if (handle === SINDICO) return sindico(corpoInteiro);
  const v = visualDe(handle, salvo);
  const pele = PELES[v.pele] ?? PELES[0], cab = CORES_CABELO[v.corCabelo] ?? CORES_CABELO[0];
  const camisa = (v.roupa && ROUPA_COR[v.roupa]) || CAMISAS[v.camisa] || CAMISAS[0];
  const L: Peca[] = [];
  const fem = v.genero === 1;
  L.push({ k: fem ? 'troncoF' : 'tronco', x: 0, y: 1.425, z: 0, cor: camisa });
  for (const [s, m] of [[-1, 'bracoE'], [1, 'bracoD']] as const) {
    L.push({ k: 'manga', x: s * 0.74, y: 1.6, z: 0, cor: camisa, membro: m });
    L.push({ k: 'mao', x: s * 0.74, y: 1.12, z: 0, cor: pele, membro: m });
  }
  if (corpoInteiro) for (const [s, m] of [[-1, 'pernaE'], [1, 'pernaD']] as const) {
    L.push({ k: 'perna', x: s * 0.25, y: 0.52, z: 0, cor: CALCA, membro: m });
    L.push({ k: 'sapato', x: s * 0.25, y: 0.08, z: 0.04, membro: m });
  }
  L.push({ k: fem ? 'cabecaF' : 'cabeca', x: 0, y: 2.23, z: 0, cor: pele });
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
    case 'coroa': L.push({ k: 'coroa', x: 0, y: 2.74, z: 0 }, { k: 'coroaJoia', x: 0, y: 2.74, z: 0 }); break;
  }
  if (v.rosto === 'oculos_escuros') L.push({ k: 'oculos', x: 0, y: 2.3, z: 0.335 });
  if (v.rosto === 'oculos_redondos') L.push({ k: 'lente', x: -0.112, y: 2.3, z: 0.335 }, { k: 'lente', x: 0.112, y: 2.3, z: 0.335 });
  if (v.rosto === 'bigode') L.push({ k: 'bigode', x: 0, y: 2.2, z: 0.335 });
  return L;
}

// O síndico (@paulimsortudo): caveira de moletom azul-marinho com o trevo da sorte no peito.
const MOLETOM = '#16224F', MOLETOM_ESCURO = '#101A3D', OSSO = '#F4F2EC';
function sindico(corpoInteiro: boolean): Peca[] {
  const L: Peca[] = [{ k: 'tronco', x: 0, y: 1.425, z: 0, cor: MOLETOM }];
  for (const [s, m] of [[-1, 'bracoE'], [1, 'bracoD']] as const) {
    L.push({ k: 'manga', x: s * 0.74, y: 1.6, z: 0, cor: MOLETOM, membro: m });
    L.push({ k: 'mao', x: s * 0.74, y: 1.12, z: 0, cor: OSSO, membro: m });
  }
  if (corpoInteiro) for (const [s, m] of [[-1, 'pernaE'], [1, 'pernaD']] as const) {
    L.push({ k: 'perna', x: s * 0.25, y: 0.52, z: 0, cor: MOLETOM_ESCURO, membro: m });
    L.push({ k: 'sapato', x: s * 0.25, y: 0.08, z: 0.04, membro: m });
  }
  L.push({ k: 'capuz', x: 0, y: 1.98, z: -0.2, cor: MOLETOM });
  L.push({ k: 'caveira', x: 0, y: 2.29, z: 0 });
  for (const x of [-0.13, 0.13]) { L.push({ k: 'cordao', x, y: 1.7, z: 0.265 }, { k: 'ponteira', x, y: 1.52, z: 0.27 }); }
  L.push({ k: 'bolso', x: 0, y: 1.14, z: 0.255, cor: MOLETOM_ESCURO });
  // trevo de quatro folhas no peito
  for (const [dx, dy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) L.push({ k: 'folha', x: 0.3 + dx * 0.055, y: 1.66 + dy * 0.055, z: 0.27, rz: Math.PI / 4 });
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

// Estátua de ouro (Hall da Fama): troca todos os materiais do boneco por ouro polido.
let OURO: THREE.MeshStandardMaterial | null = null;
export function dourar(c: Corpo) {
  OURO ||= new THREE.MeshStandardMaterial({ color: '#F2C14E', metalness: 0.85, roughness: 0.28, emissive: '#7A5200', emissiveIntensity: 0.55 });
  c.g.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && m.material) m.material = OURO!; });
  return c;
}
