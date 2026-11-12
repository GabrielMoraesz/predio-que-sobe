import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PREDIO } from '@/lib/config';

export const metadata: Metadata = {
  title: PREDIO.nome,
  description: 'Cada seguidor ganha um apartamento. O prédio sobe um andar a cada 8 moradores.',
  openGraph: { title: PREDIO.nome, description: 'Pegue seu apartamento com o seu @ na janela.', locale: 'pt_BR', type: 'website' },
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
      <body>{children}</body>
    </html>
  );
}
