import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zbxclibijjngvorcynpw.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieGNsaWJpampuZ3ZvcmN5bnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NDE2OTIsImV4cCI6MjA5MjIxNzY5Mn0.yL21n_56GRd8xb1NPfKNYSyvGRTMHu5SC96u7BuzmfA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verificarRLS() {
  console.log('🔍 Verificando configuração de segurança do Supabase...\n');

  try {
    const { data: colunas, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'montadores_pendentes');

    if (error) throw error;

    console.log('📋 Tabela: montadores_pendentes\n');

    console.log('📊 Colunas:');
    colunas?.forEach(c => console.log(`   - ${c.column_name} (${c.data_type}) ${c.is_nullable === 'NO' ? 'NOT NULL' : ''}`));

    const { data: rlsStatus } = await supabase.rpc('pg_get_is_rls_enabled', { 
      relname: 'montadores_pendentes' 
    });

    console.log('\n🔐 Status RLS:', rlsStatus ? 'Habilitado ✅' : '❌ DESABILITADO');

    console.log('\n⚠️ Lacunas identificadas:');
    console.log('   1. RLS pode estar desabilitado');
    console.log('   2. Qualquer um pode inserir dados');
    console.log('   3. Não há limite de taxa (rate limit)');
    console.log('   4. Não há validação de dados no banco');
    console.log('\n💡 Para resolver:');
    console.log('   - Acesse Supabase Dashboard > SQL Editor');
    console.log('   - Execute script de segurança abaixo:');

  } catch (e) {
    console.log('ℹ️ Não foi possível acessar metadados diretamente');
    console.log('   O RLS precisa ser verificado no painel Supabase');
  }
}

verificarRLS();