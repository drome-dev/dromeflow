import * as ftp from 'basic-ftp';
import path from 'path';
import { readFileSync, existsSync } from 'fs';

/**
 * Script de Deploy FTP para DromeFlow (Ambiente de Desenvolvimento)
 *
 * Utiliza FTP tradicional (porta 21) para transferir arquivos.
 * Carrega credenciais do .env.dev antes de qualquer execução.
 * 
 * SEGURANÇA:
 * - Valida que FTP_DEST é exatamente "public_html/dev"
 * - Bloqueia caminhos perigosos (produção, raiz, etc.)
 * - Limpa o diretório remoto antes do upload
 * - Envia apenas conteúdo de ./dist
 */

// Carrega .env.dev manualmente (sem dependência do dotenv)
try {
    const envContent = readFileSync(path.resolve('.env.dev'), 'utf8');
    for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) process.env[key] = value;
    }
} catch {
    console.warn('⚠️  .env.dev não encontrado — usando variáveis de ambiente do sistema.');
}

/**
 * Caminhos perigosos que devem ser bloqueados
 */
const DANGEROUS_PATHS = [
    'public_html',
    'public_html/',
    'domains/dromeflow.com/public_html',
    'domains/dromeflow.com',
    '/',
    '/public_html',
    '/domains',
    'domains',
    'prod',
    'production',
    'public_html/prod',
    'public_html/production'
];

/**
 * O caminho seguro permitido para deploy DEV
 */
const SAFE_DEV_PATH = 'public_html/dev';

/**
 * Valida se todas as variáveis FTP_* necessárias estão presentes
 */
function validateEnv() {
    const required = ['FTP_HOST', 'FTP_PORT', 'FTP_USER', 'FTP_PASSWORD', 'FTP_DEST'];
    const missing = [];

    for (const key of required) {
        if (!process.env[key]) {
            missing.push(key);
        }
    }

    if (missing.length > 0) {
        console.error('❌ Erro: Variáveis de ambiente ausentes no .env.dev:');
        missing.forEach(key => console.error(`   - ${key}`));
        console.error('\nAdicione as seguintes variáveis ao seu .env.dev:');
        console.error('   FTP_HOST=seu_host');
        console.error('   FTP_PORT=21');
        console.error('   FTP_USER=seu_usuario');
        console.error('   FTP_PASSWORD=sua_senha');
        console.error('   FTP_DEST=public_html/dev');
        process.exit(1);
    }
}

/**
 * Garante que o deploy DEV está apontando para o projeto Supabase de DEV
 * e não para produção.
 */
function validateDevSupabaseTarget() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const baseDomain = process.env.VITE_BASE_DOMAIN || '';
    const devProjectRef = 'xivgioxraznqshlbgxdj';

    if (!supabaseUrl.includes(`${devProjectRef}.supabase.co`)) {
        console.error('❌ Erro: VITE_SUPABASE_URL/SUPABASE_URL não aponta para o projeto DEV.');
        console.error(`   Esperado conter: ${devProjectRef}.supabase.co`);
        console.error(`   Atual: ${supabaseUrl || '(vazio)'}`);
        console.error('\nDeploy abortado para evitar publicar DEV conectado em produção.');
        process.exit(1);
    }

    if (baseDomain && baseDomain !== 'dev.dromeflow.com') {
        console.error('❌ Erro: VITE_BASE_DOMAIN inválido para deploy DEV.');
        console.error(`   Esperado: dev.dromeflow.com`);
        console.error(`   Atual: ${baseDomain}`);
        console.error('\nDeploy abortado para evitar configuração incorreta.');
        process.exit(1);
    }

    console.log('✅ Supabase DEV validado:', supabaseUrl);
}

/**
 * Valida se FTP_DEST é seguro para deploy DEV
 * Aborta se o caminho for perigoso ou diferente de public_html/dev
 */
function validateRemotePath() {
    const remoteDir = process.env.FTP_DEST;

    if (!remoteDir || remoteDir.trim() === '') {
        console.error('❌ Erro: FTP_DEST está vazio.');
        console.error('\nO deploy foi abortado para proteger o servidor.');
        process.exit(1);
    }

    const normalizedPath = remoteDir.trim();

    // Validação estrita: deve ser EXATAMENTE "public_html/dev"
    if (normalizedPath !== SAFE_DEV_PATH) {
        // Verifica se é um caminho perigoso
        for (const dangerous of DANGEROUS_PATHS) {
            if (normalizedPath === dangerous || 
                normalizedPath === dangerous + '/' ||
                normalizedPath.startsWith(dangerous + '/') ||
                normalizedPath.startsWith(dangerous)) {
                console.error(`❌ Erro: Caminho perigoso detectado: "${normalizedPath}"`);
                console.error(`\nO caminho "${dangerous}" é bloqueado por segurança.`);
                console.error('\nO deploy foi abortado para proteger o servidor.');
                process.exit(1);
            }
        }

        // Se não é perigoso mas também não é o caminho seguro
        console.error('❌ Erro: FTP_DEST inválido para deploy DEV.');
        console.error(`\nValor atual: "${normalizedPath}"`);
        console.error(`Valor esperado: "${SAFE_DEV_PATH}"`);
        console.error('\nO deploy foi abortado para proteger o servidor.');
        console.error('\nSe você quer fazer deploy em DEV, use:');
        console.error('   FTP_DEST=public_html/dev');
        console.error('\nSe você quer fazer deploy em PRODUÇÃO, use:');
        console.error('   npm run deploy:prod');
        process.exit(1);
    }

    console.log(`✅ FTP_DEST validado: "${normalizedPath}"`);
}

/**
 * Valida se a pasta dist existe
 */
function validateDistFolder() {
    const distPath = path.resolve('./dist');
    if (!existsSync(distPath)) {
        console.error('❌ Erro: Pasta dist/ não encontrada.');
        console.error('\nExecute o build antes do deploy:');
        console.error('   npm run build:dev');
        process.exit(1);
    }
    console.log(`✅ Pasta dist/ encontrada: ${distPath}`);
}

/**
 * Lista arquivos e diretórios em um caminho remoto
 */
async function listRemoteFiles(client, remotePath) {
    try {
        const files = await client.list(remotePath);
        return files || [];
    } catch (err) {
        if (err.code === 550 || err.message.includes('No such file')) {
            return [];
        }
        throw err;
    }
}

/**
 * Remove recursivamente um arquivo ou diretório remoto
 */
async function removeRemotePath(client, remotePath, itemName) {
    const fullPath = remotePath.endsWith('/') ? `${remotePath}${itemName}` : `${remotePath}/${itemName}`;
    
    try {
        const files = await client.list(fullPath);
        if (files && files.length > 0) {
            for (const file of files) {
                if (file.name !== '.' && file.name !== '..') {
                    await removeRemotePath(client, fullPath, file.name);
                }
            }
            await client.removeDir(fullPath);
        } else {
            await client.removeFile(fullPath);
        }
    } catch (err) {
        if (err.code !== 550 && !err.message.includes('No such file')) {
            throw err;
        }
    }
}

/**
 * Limpa o conteúdo de um diretório remoto
 */
async function cleanRemoteDirectory(client, remotePath) {
    console.log(`🧹 Limpando diretório remoto: ${remotePath}`);
    
    const files = await listRemoteFiles(client, remotePath);
    const filesToDelete = files.filter(f => f.name !== '.' && f.name !== '..');
    
    if (filesToDelete.length === 0) {
        console.log('   Diretório já está vazio.');
        return;
    }
    
    console.log(`   Encontrados ${filesToDelete.length} itens para remover...`);
    
    let removedCount = 0;
    for (const file of filesToDelete) {
        try {
            await removeRemotePath(client, remotePath, file.name);
            removedCount++;
        } catch (err) {
            console.warn(`   ⚠️  Não foi possível remover: ${file.name}`);
        }
    }
    
    console.log(`   ✅ ${removedCount}/${filesToDelete.length} itens removidos.`);
}

async function deploy() {
    validateEnv();
    validateDevSupabaseTarget();
    validateRemotePath();
    validateDistFolder();

    const client = new ftp.Client();

    const config = {
        host: process.env.FTP_HOST,
        port: parseInt(process.env.FTP_PORT, 10),
        user: process.env.FTP_USER,
        password: process.env.FTP_PASSWORD
    };

    const remoteDir = process.env.FTP_DEST;
    const localDir = path.resolve('./dist');

    try {
        console.log('\n🚀 Iniciando deploy via FTP...');
        console.log(`🌐 Servidor: ${config.host}:${config.port}`);
        console.log(`👤 Usuário: ${config.user}`);
        console.log(`📂 Destino: ${remoteDir}`);
        console.log(`📁 Origem: ${localDir}`);

        await client.access(config);
        console.log('✅ Conectado com sucesso.\n');

        await cleanRemoteDirectory(client, remoteDir);
        
        console.log('\n📤 Enviando arquivos do build...');
        await client.uploadDir(localDir, remoteDir);

        console.log('\n✅ Upload concluído!');
        console.log('🚀 Deploy finalizado com sucesso!');
        console.log('🔗 Verifique em: https://dev.dromeflow.com');

    } catch (err) {
        console.error('\n❌ Erro durante o deploy FTP:');
        console.error(err.message);

        if (err.message.includes('Login incorrect') || err.message.includes('authentication')) {
            console.log('\n⚠️  Dica: Verifique se o usuário e senha no .env.dev estão corretos.');
        } else if (err.message.includes('ECONNREFUSED')) {
            console.log('\n⚠️  Dica: Verifique se o servidor FTP está acessível e a porta está correta.');
        } else if (err.message.includes('ENOENT')) {
            console.log('\n⚠️  Dica: Verifique se o diretório de destino existe no servidor.');
        }

        process.exit(1);
    } finally {
        try {
            await client.close();
            console.log('🔒 Conexão FTP fechada.');
        } catch {
        }
    }
}

deploy();
