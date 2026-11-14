export const PREDIO = {
  nome: 'O Prédio que Sobe',
  edificio: 'Edifício Que Sobe',
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM || 'paulimsortudo',
  site: process.env.NEXT_PUBLIC_SITE_URL || 'predio-que-sobe.vercel.app',
  aptosPorAndar: 8,
  andaresEmObra: 2,
};

import type { Visual } from './visual';

export type Morador = {
  numero: number;
  handle: string;
  nome: string | null;
  staff: boolean;
  verificado: boolean;
  andar: number;
  unidade: number;
  apto: number;
  predio?: 'principal' | 'simba';
  criado_em: string;
  relacao?: 'porta_esquerda' | 'porta_direita' | 'de_cima' | 'de_baixo';
  visual?: Partial<Visual> | null;
};

export type Estatisticas = { moradores: number; ultimo_numero: number; recentes: Morador[]; na_fila?: number; ultimo_censo?: { rodado_em: string; novos: number } | null; simba?: { moradores: number; ultimo: number } };

// O síndico é o dono do perfil: o boneco dele é a caveira de moletom.
export const SINDICO = 'paulimsortudo';

// Próximo censo: todo dia às 12h de Brasília (UTC-3, sem horário de verão).
export function proximoCenso(agora = new Date()) {
  const alvo = new Date(agora);
  alvo.setUTCHours(15, 0, 0, 0);
  if (alvo <= agora) alvo.setUTCDate(alvo.getUTCDate() + 1);
  return alvo;
}

export const HANDLE_RE = /^(?!\.)(?!.*\.\.)[a-z0-9._]{1,30}(?<!\.)$/;
export function normalizarHandle(raw: string) {
  return raw.trim().toLowerCase().replace(/^@+/, '').replace(/-/g, '_'); // @ do YouTube com hífen vira underline
}
export function rotulo(m: Pick<Morador, 'handle' | 'nome' | 'staff'>) {
  return m.staff && m.nome ? m.nome : '@' + m.handle;
}
export function numeroFormatado(n: number) {
  return String(n).padStart(4, '0');
}
