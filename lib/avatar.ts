import { SINDICO } from './config';
import { CAMISAS, CORES_CABELO, PELES, ROUPA_COR, type Visual, visualDe } from './visual';

const INK = '#1B2140';

// Desenho 2D do boneco no estilo blocado (cabeça de cilindro, tronco e braços de bloco).
function busto(v: Visual) {
  const pele = PELES[v.pele] ?? PELES[0];
  const cab = CORES_CABELO[v.corCabelo] ?? CORES_CABELO[0];
  const camisa = (v.roupa && ROUPA_COR[v.roupa]) || CAMISAS[v.camisa] || CAMISAS[0];
  const chapeu = v.cabeca === 'bone_laranja' || v.cabeca === 'capacete_obra' || v.cabeca === 'chapeu_palha';
  const s = `stroke="${INK}" stroke-width="4" stroke-linejoin="round"`;
  let tras = '', frente = '';
  if (v.cabelo === 2) tras = `<rect x="42" y="38" width="76" height="84" rx="8" fill="${cab}" ${s}/>`;
  if (v.cabelo === 4) tras = `<rect x="32" y="22" width="96" height="78" rx="30" fill="${cab}" ${s}/>`;
  if ((v.cabelo === 1 || v.cabelo === 2 || v.cabelo === 3) && !chapeu) frente = `<path d="M46 62 v-14 q0-12 12-12 h44 q12 0 12 12 v14 h-10 v-8 h-58 v8z" fill="${cab}" ${s}/>`;
  if (v.cabelo === 3 && !chapeu) frente += `<rect x="68" y="18" width="24" height="20" rx="5" fill="${cab}" ${s}/>`;

  let roupa = `<rect x="22" y="112" width="20" height="56" rx="4" fill="${camisa}" ${s}/><rect x="118" y="112" width="20" height="56" rx="4" fill="${camisa}" ${s}/>
  <rect x="40" y="108" width="80" height="66" rx="6" fill="${camisa}" ${s}/>`;
  if (v.roupa === 'camisa_amarela') roupa += `<path d="M64 110 l16 14 l16 -14" fill="none" stroke="#2F8F6B" stroke-width="6" stroke-linejoin="round"/>`;
  if (v.roupa === 'terno') roupa += `<path d="M66 110 l14 30 l14 -30z" fill="#fff"/><path d="M77 118 h6 l2 22 l-5 6 l-5 -6z" fill="#C8352B"/>`;

  let rosto = '';
  if (v.rosto === 'oculos_escuros') rosto = `<rect x="56" y="60" width="22" height="13" rx="4" fill="${INK}"/><rect x="82" y="60" width="22" height="13" rx="4" fill="${INK}"/><path d="M78 65 h4" stroke="${INK}" stroke-width="4"/>`;
  if (v.rosto === 'oculos_redondos') rosto = `<g fill="none" stroke="${INK}" stroke-width="3.5"><circle cx="68" cy="66" r="10"/><circle cx="92" cy="66" r="10"/><path d="M78 66 h4"/></g>`;
  if (v.rosto === 'bigode') rosto = `<path d="M62 80 q9 -9 18 -2 q9 -7 18 2 q-9 4 -18 -1 q-9 5 -18 1z" fill="#3B2416"/>`;

  let cabeca = '';
  if (v.cabeca === 'bone_laranja') cabeca = `<path d="M44 52 q0-26 36-26 q36 0 36 26z" fill="#FF7A1A" ${s}/><path d="M80 50 h50 q6 0 2 9 h-52z" fill="#E0620A" ${s}/>`;
  if (v.cabeca === 'capacete_obra') cabeca = `<path d="M42 54 q0-32 38-32 q38 0 38 32z" fill="#F7C531" ${s}/><rect x="36" y="50" width="88" height="9" rx="4" fill="#F7C531" ${s}/><path d="M80 24 v28" stroke="${INK}" stroke-width="3"/>`;
  if (v.cabeca === 'chapeu_palha') cabeca = `<ellipse cx="80" cy="48" rx="62" ry="11" fill="#E3C27A" ${s}/><path d="M54 48 q0-28 26-28 q26 0 26 28z" fill="#E9CD8A" ${s}/><path d="M55 40 h50" stroke="#B5533C" stroke-width="6"/>`;
  if (v.cabeca === 'fone') cabeca = `<path d="M42 66 q0-48 38-48 q38 0 38 48" fill="none" stroke="${INK}" stroke-width="7"/><rect x="34" y="54" width="16" height="28" rx="5" fill="#E2557A" ${s}/><rect x="110" y="54" width="16" height="28" rx="5" fill="#E2557A" ${s}/>`;
  if (v.cabeca === 'coroa') cabeca = `<path d="M52 40 l6 -22 l12 15 l10 -21 l10 21 l12 -15 l6 22z" fill="#F7C531" ${s}/><circle cx="80" cy="31" r="4" fill="#E2557A"/>`;

  return `${tras}${roupa}<rect x="46" y="38" width="68" height="70" rx="16" fill="${pele}" ${s}/>${frente}
  <ellipse cx="68" cy="66" rx="4" ry="6" fill="${INK}"/><ellipse cx="92" cy="66" rx="4" ry="6" fill="${INK}"/>${v.genero === 1 ? `<path d="M64 59 l-5 -5 M67 58 l-3 -6 M96 59 l5 -5 M93 58 l3 -6" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>` : ''}
  <path d="M66 84 q14 12 28 0" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>${rosto}${cabeca}`;
}

// Síndico: caveira de moletom azul-marinho com trevo.
function sindico() {
  const s = `stroke="${INK}" stroke-width="4" stroke-linejoin="round"`;
  return `<rect x="22" y="112" width="20" height="56" rx="4" fill="#16224F" ${s}/><rect x="118" y="112" width="20" height="56" rx="4" fill="#16224F" ${s}/>
  <rect x="40" y="108" width="80" height="66" rx="6" fill="#16224F" ${s}/><rect x="52" y="150" width="56" height="16" rx="3" fill="#101A3D"/>
  <path d="M72 112 v22 M88 112 v22" stroke="#F4F2EC" stroke-width="3.5" stroke-linecap="round"/>
  <g fill="#2FA35A"><circle cx="100" cy="124" r="4.5"/><circle cx="108" cy="124" r="4.5"/><circle cx="100" cy="132" r="4.5"/><circle cx="108" cy="132" r="4.5"/></g>
  <rect x="38" y="28" width="84" height="80" rx="20" fill="#F4F2EC" ${s}/>
  <ellipse cx="62" cy="62" rx="14" ry="16" fill="${INK}"/><ellipse cx="98" cy="62" rx="14" ry="16" fill="${INK}"/>
  <circle cx="57" cy="56" r="4.5" fill="#fff"/><circle cx="93" cy="56" r="4.5" fill="#fff"/><circle cx="67" cy="69" r="2" fill="#fff"/><circle cx="103" cy="69" r="2" fill="#fff"/>
  <path d="M80 87 c-7 -5 -6 -11 -2 -10 c1 0 2 1 2 2 c0 -1 1 -2 2 -2 c4 -1 5 5 -2 10z" fill="${INK}"/>
  <path d="M60 92 q20 16 40 0 q-20 7 -40 0z" fill="#fff" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M70 95 v6 M80 96 v7 M90 95 v6" stroke="${INK}" stroke-width="2"/>`;
}

export function avatarSvg(handle: string, size = 160, salvo?: Partial<Visual> | null) {
  if (handle === SINDICO) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="${size}" height="${size}">${sindico()}</svg>`;
  const v = visualDe(handle, salvo);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="${size}" height="${size}">${busto(v)}</svg>`;
}

export function avatarDataUri(handle: string, size = 160, salvo?: Partial<Visual> | null) {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(avatarSvg(handle, size, salvo));
}

