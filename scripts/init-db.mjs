import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

async function initDatabase() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Erro: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados no ambiente.');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const sqlPath = path.join(process.cwd(), 'backup-cosmic-ai.sql');

  if (!fs.existsSync(sqlPath)) {
    console.log('ℹ️ Arquivo backup-cosmic-ai.sql não encontrado na raiz. Pulando inicialização do banco.');
    return;
  }

  try {
    console.log('🚀 Lendo arquivo de backup SQL...');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('⏳ Executando SQL no banco de dados...');
    
    // Split the SQL into statements by semicolons to execute them separately
    // Note: This is a simple split and might need adjustment for complex SQL (triggers, functions)
    // but the generated backup is mostly table creation and inserts.
    // For Supabase/PostgREST, we use the raw SQL RPC if available or try to execute.
    
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      if (error.message.includes('function "exec_sql" does not exist')) {
        console.error('❌ Erro: A função RPC "exec_sql" não existe no seu Supabase.');
        console.log('💡 Dica: Você precisa criar essa função manualmente uma vez no SQL Editor do Supabase:');
        console.log(`
          CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
          RETURNS void AS $$
          BEGIN
            EXECUTE sql_query;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        `);
      } else {
        console.error('❌ Erro ao executar SQL:', error.message);
      }
      process.exit(1);
    }

    console.log('✅ Banco de dados inicializado com sucesso!');
  } catch (err) {
    console.error('❌ Erro inesperado:', err);
    process.exit(1);
  }
}

initDatabase();
