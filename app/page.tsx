import HomeClient from '@/components/HomeClient';
import { estatisticas } from '@/lib/supabase';

export const revalidate = 20;

export default async function Page() {
  const stats = await estatisticas();
  return <HomeClient stats={stats} />;
}
