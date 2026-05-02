import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = createClient(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_KEY
  );

  const { count } = await supabase
    .from('montadores_pendentes')
    .select('*', { count: 'exact', head: true });

  const { data } = await supabase
    .from('montadores_pendentes')
    .select('cidade_estado');

  const cidadesUnicas = new Set(data?.map(d => d.cidade_estado));

  return new Response(
    JSON.stringify({
      total: count,
      cidades: cidadesUnicas.size
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }
  );
}