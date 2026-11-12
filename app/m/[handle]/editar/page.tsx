import { redirect } from 'next/navigation';
// A personalização agora é a loja, já aberta no @ do morador.
export default async function Page({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  redirect(`/loja?u=${encodeURIComponent(handle)}`);
}
