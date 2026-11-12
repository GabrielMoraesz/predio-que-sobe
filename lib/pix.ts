// Cobrança Pix no padrão da API Pix do Banco Central (o Itaú implementa esse padrão).
// PIX_MODO=teste gera cobranças de mentira pra testar a loja sem dinheiro de verdade.
import https from 'node:https';
import { randomBytes } from 'node:crypto';

export const PIX_MODO = (process.env.PIX_MODO || 'teste') as 'teste' | 'itau';
const EXPIRA_SEG = 60 * 60;

export function novoTxid() {
  return randomBytes(16).toString('hex'); // 32 caracteres alfanuméricos (BACEN: 26 a 35)
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
  if (PIX_MODO === 'teste') return false; // no modo teste, só o botão "simular pagamento" confirma
  const token = await tokenItau();
  const r = await req('GET', `${baseItau()}/cob/${txid}`, { authorization: `Bearer ${token}`, 'x-itau-apikey': process.env.ITAU_CLIENT_ID || '' });
  return r.status === 200 && r.json.status === 'CONCLUIDA';
}
