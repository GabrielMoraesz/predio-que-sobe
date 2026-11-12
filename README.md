# O Prédio que Sobe

Cada seguidor ganha um apartamento com o seu @ na janela. Next.js + Three.js + Supabase, publicado na Vercel.

- `app/` páginas e rotas de API (cadastro, loja, pedidos, Pix, imagem do story)
- `components/Building.tsx` prédio, cidade, bonecos nas janelas e passeio na rua
- `lib/boneco3d.ts` peças 3D do boneco (janela, rua e vitrine usam as mesmas)
- `lib/pix.ts` cobrança Pix: modo `teste` ou `itau` (padrão API Pix do Banco Central)

Variáveis de ambiente: veja `.env.example`. O banco só é acessado por funções (RPC); as tabelas ficam fechadas.
