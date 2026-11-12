export const PREDIO = {
  nome: 'O Prédio que Sobe',
  edificio: 'Edifício Que Sobe',
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM || 'opredioquesobe',
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
  criado_em: string;
  relacao?: 'porta_esquerda' | 'porta_direita' | 'de_cima' | 'de_baixo';
  novo?: boolean;
  codigo?: string;
  chave?: string | null;
  visual?: Partial<Visual> | null;
};

export type Estatisticas = { moradores: number; ultimo_numero: number; recentes: Morador[] };

export const HANDLE_RE = /^(?!\.)(?!.*\.\.)[a-z0-9._]{1,30}(?<!\.)$/;
export function normalizarHandle(raw: string) {
  return raw.trim().toLowerCase().replace(/^@+/, '');
}
export function rotulo(m: Pick<Morador, 'handle' | 'nome' | 'staff'>) {
  return m.staff && m.nome ? m.nome : '@' + m.handle;
}
export function numeroFormatado(n: number) {
  return String(n).padStart(4, '0');
}
