// Aparência do boneco: pele e gênero são grátis; cabelo, camisa e itens da loja entram no Pix.
export type Visual = {
  pele: number; genero: number; cabelo: number; corCabelo: number; camisa: number;
  cabeca?: string; rosto?: string; roupa?: string; janela?: string; luz?: string;
};
export type Slot = 'cabeca' | 'rosto' | 'roupa' | 'janela' | 'luz';
export type Item = { id: string; nome: string; slot: Slot; preco: number; raro: boolean };

export const PELES = ['#F6D3B3', '#E9B48A', '#C98B5E', '#9C6440', '#6E4429', '#F2C48D'];
export const GENEROS = ['Masculino', 'Feminino'];
export const GRATIS = ['pele', 'genero'] as const;
export const CABELOS = ['Careca', 'Curto', 'Longo', 'Coque', 'Black power'];
export const CORES_CABELO = ['#1D1611', '#4A2C1A', '#8A5A2B', '#D9A441', '#B23A2A', '#8E8E99'];
export const CAMISAS = ['#2B63B0', '#B5533C', '#F7C531', '#2F8F6B', '#7A4FB8', '#E2557A', '#1E2A4A', '#F08A24'];
export const ROUPA_COR: Record<string, string> = { camisa_amarela: '#F7D23E', terno: '#22283F' };
export const LUZ_COR: Record<string, string> = { neon_rosa: '#FF5FB0', neon_azul: '#4FC3FF', pisca_pisca: '#FFD36E' };
export const SLOTS: { id: Slot; nome: string }[] = [
  { id: 'cabeca', nome: 'Cabeça' }, { id: 'rosto', nome: 'Rosto' }, { id: 'roupa', nome: 'Roupa' }, { id: 'janela', nome: 'Janela' }, { id: 'luz', nome: 'Luz' },
];

export function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function visualPadrao(handle: string): Visual {
  const h = hashStr(handle || 'x');
  return { pele: h % 6, genero: (h >>> 20) % 2, cabelo: (h >>> 8) % 5, corCabelo: (h >>> 12) % 6, camisa: (h >>> 16) % 8 };
}

export function visualDe(handle: string, salvo?: Partial<Visual> | null): Visual {
  const base = visualPadrao(handle);
  if (!salvo || typeof salvo !== 'object') return base;
  return { ...base, ...Object.fromEntries(Object.entries(salvo).filter(([, v]) => v !== null && v !== undefined)) } as Visual;
}

export const reais = (centavos: number) => (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
