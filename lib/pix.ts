// Cobrança Pix no padrão da API Pix do Banco Central (o Itaú implementa esse padrão).
// PIX_MODO=teste gera cobranças de mentira pra testar a loja sem dinheiro de verdade.
// PIX_MODO=chave gera o Pix copia e cola direto da chave (sem API do banco); a portaria confirma o pagamento no admin.
import https from 'node:https';
import { randomBytes } from 'node:crypto';

export const PIX_MODO = (process.env.PIX_MODO || 'teste') as 'teste' | 'itau' | 'chave';
const EXPIRA_SEG = PIX_MODO === 'chave' ? 48 * 60 * 60 : 60 * 60;

export function novoTxid() {
  if (PIX_MODO === 'chave') { // código curto pra conferir no extrato: PQS + 7 letras/números sem ambiguidade
    const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; const b = randomBytes(7);
    return 'PQS' + Array.from(b, (x) => A[x % A.length]).join('');
  }
  return randomBytes(16).toString('hex'); // 32 caracteres alfanuméricos (BACEN: 26 a 35)
}

// Pix copia e cola (BR Code estático do Banco Central) com valor e identificador do pedido.
const campo = (id: string, v: string) => id + String(v.length).padStart(2, '0') + v;
function crc16(t: string) {
  let c = 0xffff;
  for (let i = 0; i < t.length; i++) { c ^= t.charCodeAt(i) << 8; for (let j = 0; j < 8; j++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xffff : (c << 1) & 0xffff; }
  return c.toString(16).toUpperCase().padStart(4, '0');
}
const semAcento = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9 ]/g, '').toUpperCase();
export function brCode(chave: string, centavos: number, txid: string, nome = 'PREDIO QUE SOBE', cidade = 'SAO PAULO') {
  const corpo = campo('00', '01') + campo('26', campo('00', 'br.gov.bcb.pix') + campo('01', chave)) + campo('52', '0000') + campo('53', '986')
    + campo('54', (centavos / 100).toFixed(2)) + campo('58', 'BR') + campo('59', semAcento(nome).slice(0, 25)) + campo('60', semAcento(cidade).slice(0, 15))
    + campo('62', campo('05', txid)) + '6304';
  return corpo + crc16(corpo);
}

type Cobranca = { txid: string; copiaECola: string; expiraEm: Date };

function pem(nome: string) {
  const b64 = process.env[nome];
  if (!b64) throw new Error(`variável ${nome} não configurada`);
  return Buffer.from(b64, 'base64').toString('utf8');
}

// Requisição HTTPS com certificado de cliente (mTLS), exigido pelo Itaú.
function req(method: string, url: string, headers: Record<string, string>, body?: string): Promise<{ status: number; json: any }> {
  const u = new URL(url);
  return new Promise((resolve, reject) => {
    const r = https.request({
      method, hostname: u.hostname, path: u.pathname + u.search, port: 443,
      cert: pem('ITAU_CERT_PEM_B64'), key: pem('ITAU_KEY_PEM_B64'),
      headers: { ...headers, ...(body ? { 'content-length': Buffer.byteLength(body).toString() } : {}) },
      timeout: 15000,
    }, (res) => {
      let d = ''; res.on('data', (c) => (d += c));
      res.on('end', () => { try { resolve({ status: res.statusCode || 0, json: d ? JSON.parse(d) : {} }); } catch { resolve({ status: res.statusCode || 0, json: { raw: d } }); } });
    });
    r.on('error', reject); r.on('timeout', () => r.destroy(new Error('timeout')));
    if (body) r.write(body); r.end();
  });
}

let tokenCache: { valor: string; expira: number } | null = null;
async function tokenItau() {
  if (tokenCache && tokenCache.expira > Date.now() + 30000) return tokenCache.valor;
  const body = new URLSearchParams({ grant_type: 'client_credentials', client_id: process.env.ITAU_CLIENT_ID || '', client_secret: process.env.ITAU_CLIENT_SECRET || '' }).toString();
  const r = await req('POST', process.env.ITAU_TOKEN_URL || 'https://sts.itau.com.br/api/oauth/token', { 'content-type': 'application/x-www-form-urlencoded' }, body);
  if (r.status !== 200 || !r.json.access_token) throw new Error(`token Itaú falhou (${r.status})`);
  tokenCache = { valor: r.json.access_token, expira: Date.now() + (Number(r.json.expires_in) || 300) * 1000 };
  return tokenCache.valor;
}
const baseItau = () => (process.env.ITAU_PIX_URL || 'https://secure.api.itau/pix_recebimentos/v2').replace(/\/$/, '');

export async function criarCobranca(txid: string, centavos: number, descricao: string): Promise<Cobranca> {
  const expiraEm = new Date(Date.now() + EXPIRA_SEG * 1000);
  if (PIX_MODO === 'chave') {
    const chave = process.env.PIX_CHAVE;
    if (!chave) throw new Error('PIX_CHAVE não configurada');
    return { txid, expiraEm, copiaECola: brCode(chave, centavos, txid, process.env.PIX_NOME, process.env.PIX_CIDADE) };
  }
  if (PIX_MODO === 'teste') {
    return { txid, expiraEm, copiaECola: `00020101MODO-TESTE-PREDIO-QUE-SOBE${txid}5204000053039865406${(centavos / 100).toFixed(2)}5802BR` };
  }
  const token = await tokenItau();
  const body = JSON.stringify({
    calendario: { expiracao: EXPIRA_SEG },
    valor: { original: (centavos / 100).toFixed(2) },
    chave: process.env.PIX_CHAVE,
    solicitacaoPagador: descricao.slice(0, 140),
  });
  const r = await req('PUT', `${baseItau()}/cob/${txid}`, { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'x-itau-apikey': process.env.ITAU_CLIENT_ID || '' }, body);
  if (r.status >= 300 || !r.json.pixCopiaECola) throw new Error(`cobrança Itaú falhou (${r.status})`);
  return { txid, expiraEm, copiaECola: r.json.pixCopiaECola };
}

// Pergunta ao banco se a cobrança foi paga. Nunca confiamos só no aviso recebido.
export async function cobrancaPaga(txid: string): Promise<boolean> {
  if (PIX_MODO !== 'itau') return false; // teste: botão "simular"; chave: a portaria confirma no admin
  const token = await tokenItau();
  const r = await req('GET', `${baseItau()}/cob/${txid}`, { authorization: `Bearer ${token}`, 'x-itau-apikey': process.env.ITAU_CLIENT_ID || '' });
  return r.status === 200 && r.json.status === 'CONCLUIDA';
}
