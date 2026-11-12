import { createClient } from '@supabase/supabase-js';
import { normalizarHandle, type Estatisticas, type Morador } from './config';
import type { Item } from './visual';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

import { mockClient } from './mock';

// Só usamos funções do banco (rpc); a tabela em si fica fechada pra leitura pública.
type Rpc = { rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: any; error: { message: string } | null }> }; // eslint-disable-line @typescript-eslint/no-explicit-any
export const supabase: Rpc = process.env.MOCK_DB === '1' ? mockClient : (createClient(url, key, { auth: { persistSession: false } }) as unknown as Rpc);

export async function estatisticas(): Promise<Estatisticas> {
  const { data, error } = await supabase.rpc('estatisticas');
  if (error || !data) return { moradores: 1, ultimo_numero: 1, recentes: [], na_fila: 0, ultimo_censo: null };
  return data as Estatisticas;
}

export async function buscarMorador(handle: string): Promise<Morador | null> {
  const { data, error } = await supabase.rpc('buscar_morador', { p_handle: normalizarHandle((() => { try { return decodeURIComponent(handle); } catch { return handle; } })()) });
  if (error || !data) return null;
  return data as Morador;
}

export async function vizinhos(numero: number): Promise<Morador[]> {
  const { data, error } = await supabase.rpc('vizinhos', { p_numero: numero });
  if (error || !data) return [];
  return data as Morador[];
}

export async function catalogo(): Promise<Item[]> {
  const { data, error } = await supabase.rpc('catalogo');
  if (error || !data) return [];
  return data as Item[];
}

// Erros do banco viram códigos curtos que a interface sabe explicar.
export function codigoErro(msg: string) {
  for (const c of ['nao_pago', 'prazo', 'espere', 'nao_encontrado', 'itens_invalidos', 'valor_divergente', 'proibido', 'handle_invalido', 'sem_consentimento', 'pedido_nao_encontrado']) if (msg.includes(c)) return c;
  return 'falha';
}
