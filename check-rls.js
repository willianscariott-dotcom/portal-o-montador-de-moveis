import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('❌ Variável de ambiente ausente: PUBLIC_SUPABASE_URL (ou SUPABASE_URL).');
  process.exit(1);
}

if (!supabaseAnonKey) {
  console.error('❌ Variável de ambiente ausente: PUBLIC_SUPABASE_ANON_KEY (ou SUPABASE_ANON_KEY).');
  process.exit(1);
}

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