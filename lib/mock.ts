// Dados falsos SÓ pra testar sem banco (MOCK_DB=1). Nunca usado em produção.
const ITENS = [['bone_laranja','Boné laranja','cabeca',190],['capacete_obra','Capacete de obra','cabeca',190],['chapeu_palha','Chapéu de palha','cabeca',290],['fone','Fone de ouvido','cabeca',290],['coroa','Coroa','cabeca',990],['oculos_escuros','Óculos escuros','rosto',190],['oculos_redondos','Óculos redondos','rosto',100],['bigode','Bigode','rosto',100],['camisa_amarela','Camisa amarela de jogo','roupa',390],['terno','Terno de síndico','roupa',490],['planta','Vaso de planta','janela',190],['gato','Gatinho na janela','janela',490],['caramelo','Cachorro caramelo','janela',490],['neon_rosa','Luz neon rosa','luz',290],['neon_azul','Luz neon azul','luz',290],['pisca_pisca','Pisca-pisca de Natal','luz',390]].map(([id,nome,slot,preco]) => ({ id, nome, slot, preco, raro: ['coroa','terno','caramelo'].includes(id as string) }));
const NOMES = ['sindico','ana.lu','joaopedro_','mari.santos','gui.ferreira','bia_oliveira','rafa.dev','camila.rr','teste.um','lucas.m','duda_','pedrinho.br'];
const N = 75;
const pick = (i: number, arr: unknown[]) => arr[i % arr.length];
const visual = (i: number) => i % 2 ? {} : { cabeca: pick(i, ['bone_laranja','coroa','capacete_obra','chapeu_palha','fone',null]), rosto: pick(i * 3, ['oculos_escuros','bigode','oculos_redondos',null]), janela: pick(i * 7, ['gato','caramelo','planta',null,null]), luz: pick(i * 5, ['neon_rosa','neon_azul','pisca_pisca',null,null,null]), roupa: pick(i, [null,'terno','camisa_amarela']) };
const apto = (n: number, handle: string) => ({ numero: n, handle, nome: n === 1 ? 'Paulim, o Síndico' : null, staff: n === 1, verificado: n % 3 === 0, andar: Math.floor((n - 1) / 8) + 1, unidade: ((n - 1) % 8) + 1, apto: (Math.floor((n - 1) / 8) + 1) * 100 + ((n - 1) % 8) + 1, criado_em: new Date().toISOString(), visual: visual(n) });
const nome = (n: number) => (n === 1 ? 'sindico' : `${NOMES[n % NOMES.length]}${n}`);
const pedidos: Record<string, { status: string }> = {};
export const mockClient = {
  rpc: async (fn: string, a: Record<string, any> = {}) => {
    const ok = (data: unknown) => ({ data, error: null });
    switch (fn) {
      case 'estatisticas': return ok({ moradores: N, ultimo_numero: N, recentes: Array.from({ length: 12 }, (_, i) => apto(N - i, nome(N - i))) });
      case 'buscar_morador': return ok(a.p_handle === 'ninguem' ? null : { ...apto(a.p_handle === 'sindico' ? 1 : 42, a.p_handle), visual: a.p_handle === 'teste.um' ? { cabeca: 'coroa', janela: 'caramelo', luz: 'neon_rosa' } : {} });
      case 'vizinhos': return ok([[a.p_numero - 1, 'porta_esquerda'], [a.p_numero + 1, 'porta_direita'], [a.p_numero + 8, 'de_cima'], [a.p_numero - 8, 'de_baixo']].map(([n, r]) => ({ ...apto(n as number, nome(n as number)), relacao: r })));
      case 'janelas': return ok(Array.from({ length: N }, (_, i) => [i + 1, nome(i + 1), visual(i + 1)]).filter((x) => x[0] !== 2));
      case 'catalogo': return ok(ITENS);
      case 'meus_itens': return a.p_chave === 'a'.repeat(32) ? ok(['bone_laranja', 'bigode']) : { data: null, error: { message: 'chave_invalida' } };
      case 'salvar_visual': return ok(a.p_visual);
      case 'cotar': return ok({ numero: 42, valor_centavos: (a.p_itens as string[]).reduce((t, id) => t + (ITENS.find((i) => i.id === id)?.preco as number || 0), 0), itens: a.p_itens });
      case 'criar_pedido': { const id = '00000000-0000-0000-0000-' + String(Date.now()).slice(-12).padStart(12, '0'); pedidos[id] = { status: 'pendente' }; return ok({ id }); }
      case 'pedido_status': return ok({ status: pedidos[a.p_id]?.status || 'pendente', provedor: 'teste', txid: 'x', itens: [], valor_centavos: 0 });
      case 'confirmar_pagamento': Object.values(pedidos).forEach((p) => (p.status = 'pago')); return ok({ status: 'pago' });
      case 'registrar_morador': return ok({ ...apto(76, a.p_handle), novo: true, codigo: 'AB12C', chave: 'a'.repeat(32) });
    }
    return { data: null, error: { message: 'falha' } };
  },
};
