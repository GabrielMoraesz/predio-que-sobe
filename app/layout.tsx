import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PREDIO } from '@/lib/config';
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  title: PREDIO.nome,
  description: 'Cada seguidor do @paulimsortudo ganha um apartamento. Todo dia às 12h o prédio recebe os novos moradores.',
  openGraph: { title: PREDIO.nome, description: 'Siga o @paulimsortudo e ganhe um apartamento com o seu @ na janela.', locale: 'pt_BR', type: 'website' },
};
export const viewport: Viewport = { themeColor: '#1B2140', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&display=swap" />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
