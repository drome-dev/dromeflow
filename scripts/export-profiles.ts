// scripts/export-profiles.ts
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Load .env.local manually
import { config } from 'dotenv';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias no .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  console.log('📥 Exportando perfis...');

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, password_hash, full_name, role, display_name, phone, auth_user_id');

  if (error) {
    console.error('❌ Erro ao exportar:', error.message);
    process.exit(1);
  }

  const outputPath = path.resolve(__dirname, '../profiles-export.json');
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`✅ Exportados ${data.length} perfis para ${outputPath}`);
}

main().catch(console.error);
