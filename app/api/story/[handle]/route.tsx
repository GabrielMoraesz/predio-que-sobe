import { ImageResponse } from 'next/og';
import { buscarMorador, estatisticas } from '@/lib/supabase';
import { avatarDataUri } from '@/lib/avatar';
import { PREDIO, numeroFormatado, rotulo } from '@/lib/config';

export const runtime = 'nodejs';

const CDN: Record<string, string> = {
  'archivo-400.woff': 'https://cdn.jsdelivr.net/npm/@fontsource/archivo@5.2.8/files/archivo-latin-400-normal.woff',
  'archivo-800.woff': 'https://cdn.jsdelivr.net/npm/@fontsource/archivo@5.2.8/files/archivo-latin-800-normal.woff',
  'dseg7.ttf': 'https://cdn.jsdelivr.net/npm/dseg@0.46.0/fonts/DSEG7-Classic/DSEG7Classic-Bold.ttf',
};
const cache = new Map<string, Promise<ArrayBuffer>>();
const fonte = (f: string) => {
  if (!cache.has(f)) cache.set(f, fetch(CDN[f]).then((r) => { if (!r.ok) throw new Error('fonte ' + f); return r.arrayBuffer(); }));
  return cache.get(f)!;
};

export async function GET(_req: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const [m, stats, a400, a800, lcd] = await Promise.all([buscarMorador(handle), estatisticas(), fonte('archivo-400.woff'), fonte('archivo-800.woff'), fonte('dseg7.ttf')]);
  if (!m) return new Response('não encontrado', { status: 404 });

  const U = PREDIO.aptosPorAndar;
  const andares = [m.andar + 2, m.andar + 1, m.andar, m.andar - 1, m.andar - 2].filter((a) => a >= 1);
  const ink = '#1B2140';

  return new ImageResponse(
    (
      <div style={{ width: 1080, height: 1920, display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'Archivo', color: '#fff',
        backgroundImage: 'linear-gradient(180deg, #1B2140 0%, #5B4A86 52%, #E98A6B 82%, #F6C08A 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 120, background: '#0E1226', border: '6px solid #3A4170', borderRadius: 28, padding: '22px 40px', gap: 28 }}>
          <div style={{ display: 'flex', width: 0, height: 0, borderLeft: '22px solid transparent', borderRight: '22px solid transparent', borderBottom: '34px solid #FF4B3A' }} />
          <div style={{ display: 'flex', fontFamily: 'DSEG7', fontSize: 120, color: '#FF4B3A' }}>{String(m.andar).padStart(3, '!')}</div>
        </div>
        <div style={{ display: 'flex', fontSize: 44, marginTop: 34, fontWeight: 800 }}>Eu moro no andar {m.andar}</div>

        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 50, background: '#C9C2B6', padding: '14px 18px', borderRadius: 6, border: `6px solid ${ink}` }}>
          {andares.map((a) => (
            <div key={a} style={{ display: 'flex', gap: 14, padding: '12px 0', borderBottom: '8px solid #E9E2D6' }}>
              {Array.from({ length: U }, (_, i) => {
                const n = (a - 1) * U + i + 1; const eu = n === m.numero;
                return <div key={i} style={{ display: 'flex', width: 92, height: 108, borderRadius: 4, background: eu ? '#F7C531' : n <= stats.ultimo_numero ? '#FFD36E' : '#273055', border: eu ? '8px solid #ffffff' : `3px solid ${ink}`, boxShadow: eu ? '0 0 40px #F7C531' : 'none' }} />;
              })}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', width: 900, marginTop: 60, background: '#F7F3EC', color: ink, borderRadius: 36, padding: 40, gap: 36, border: `6px solid ${ink}` }}>
          <div style={{ display: 'flex', width: 220, height: 260, background: '#DDE7F3', borderRadius: 18, alignItems: 'center', justifyContent: 'center', border: `4px solid ${ink}` }}>
            <img src={avatarDataUri(m.handle, 210, m.visual)} width={210} height={210} alt="" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ display: 'flex', fontSize: 28, color: '#2B63B0', fontWeight: 800 }}>{PREDIO.edificio}</div>
            <div style={{ display: 'flex', fontSize: rotulo(m).length > 18 ? 46 : 58, fontWeight: 800, marginTop: 8 }}>{rotulo(m)}</div>
            <div style={{ display: 'flex', gap: 40, marginTop: 26 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}><div style={{ display: 'flex', fontSize: 26 }}>Apto</div><div style={{ display: 'flex', fontFamily: 'DSEG7', fontSize: 56, color: '#B5533C' }}>{m.apto}</div></div>
              <div style={{ display: 'flex', flexDirection: 'column' }}><div style={{ display: 'flex', fontSize: 26 }}>Morador nº</div><div style={{ display: 'flex', fontFamily: 'DSEG7', fontSize: 56, color: '#B5533C' }}>{numeroFormatado(m.numero)}</div></div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 'auto', marginBottom: 110, color: ink }}>
          <div style={{ display: 'flex', fontSize: 50, fontWeight: 800 }}>Siga @{PREDIO.instagram} e vire meu vizinho</div>
          <div style={{ display: 'flex', fontSize: 38, marginTop: 10 }}>{PREDIO.site}</div>
        </div>
      </div>
    ),
    {
      width: 1080, height: 1920,
      fonts: [
        { name: 'Archivo', data: a400, weight: 400, style: 'normal' },
        { name: 'Archivo', data: a800, weight: 800, style: 'normal' },
        { name: 'DSEG7', data: lcd, weight: 400, style: 'normal' },
      ],
      headers: { 'cache-control': 'public, max-age=60, s-maxage=300' },
    },
  );
}
