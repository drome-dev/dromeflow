import SftpClient from 'ssh2-sftp-client';
import path from 'path';
import { readFileSync, existsSync } from 'fs';

/**
 * Script de Deploy SFTP (SSH) para DromeFlow (Produção)
 *
 * SEGURANÇA:
 * - Carrega .env.production como fallback manual
 * - Exige variáveis SFTP_* explícitas, sem defaults perigosos
 * - Bloqueia deploy se Supabase apontar para DEV ou placeholder
 * - Exige domínio base de produção
 * - Permite apenas o destino remoto de produção
 */

const ENV_FILE = '.env.production';
const DEV_SUPABASE_PROJECT_REF = 'xivgioxraznqshlbgxdj';
const SAFE_PROD_PATH = 'domains/dromeflow.com/public_html';

function loadEnvFile(fileName) {
    try {
        const envContent = readFileSync(path.resolve(fileName), 'utf8');
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
        console.warn(`⚠️  ${fileName} não encontrado — usando variáveis de ambiente do sistema.`);
    }
}

function getSupabaseProjectRef(url) {
    try {
        return new URL(url).hostname.replace('.supabase.co', '');
    } catch {
        return '';
    }
}

function validateRequiredEnv() {
    const required = [
        'VITE_SUPABASE_URL',
        'VITE_SUPABASE_ANON_KEY',
        'VITE_BASE_DOMAIN',
        'SFTP_HOST',
        'SFTP_PORT',
        'SFTP_USER',
        'SFTP_PASSWORD',
        'SFTP_DEST',
    ];

    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        console.error(`❌ Erro: Variáveis obrigatórias ausentes no ${ENV_FILE}:`);
        missing.forEach(key => console.error(`   - ${key}`));
        console.error('\nDeploy de produção abortado.');
        process.exit(1);
    }
}

function validateProductionSupabaseTarget() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
    const projectRef = getSupabaseProjectRef(supabaseUrl);

    if (!projectRef || !supabaseUrl.includes('.supabase.co')) {
        console.error('❌ Erro: VITE_SUPABASE_URL inválida para produção.');
        console.error('\nDeploy de produção abortado.');
        process.exit(1);
    }

    if (projectRef === DEV_SUPABASE_PROJECT_REF) {
        console.error('❌ Erro: VITE_SUPABASE_URL aponta para o projeto DEV.');
        console.error(`   Projeto DEV bloqueado: ${DEV_SUPABASE_PROJECT_REF}`);
        console.error('\nDeploy abortado para evitar produção conectada ao banco DEV.');
        process.exit(1);
    }

    if (projectRef === 'seu-projeto' || projectRef.includes('example')) {
        console.error('❌ Erro: VITE_SUPABASE_URL ainda parece ser placeholder.');
        console.error('\nConfigure o projeto Supabase real de produção antes do deploy.');
        process.exit(1);
    }

    console.log('✅ Supabase PROD validado:', projectRef);
}

function validateProductionDomain() {
    const baseDomain = process.env.VITE_BASE_DOMAIN || '';
    if (baseDomain !== 'dromeflow.com') {
        console.error('❌ Erro: VITE_BASE_DOMAIN inválido para produção.');
        console.error('   Esperado: dromeflow.com');
        console.error(`   Atual: ${baseDomain || '(vazio)'}`);
        console.error('\nDeploy de produção abortado.');
        process.exit(1);
    }

    console.log('✅ Domínio PROD validado: dromeflow.com');
}

function validateRemotePath() {
    const remoteDir = (process.env.SFTP_DEST || '').trim().replace(/\/+$/, '');

    const blockedPaths = new Set([
        '',
        '/',
        '.',
        'public_html',
        'public_html/',
        'public_html/dev',
        'public_html/destino',
        'domains',
        'domains/dromeflow.com',
        'dev',
        'prod',
        'production',
    ]);

    if (blockedPaths.has(remoteDir)) {
        console.error(`❌ Erro: SFTP_DEST perigoso ou placeholder: "${remoteDir || '(vazio)'}"`);
        console.error(`   Valor esperado: ${SAFE_PROD_PATH}`);
        console.error('\nDeploy de produção abortado.');
        process.exit(1);
    }

    if (remoteDir !== SAFE_PROD_PATH) {
        console.error('❌ Erro: SFTP_DEST inválido para produção.');
        console.error(`   Atual: ${remoteDir}`);
        console.error(`   Esperado: ${SAFE_PROD_PATH}`);
        console.error('\nDeploy de produção abortado.');
        process.exit(1);
    }

    console.log(`✅ SFTP_DEST PROD validado: "${remoteDir}"`);
    return `${remoteDir}/`;
}

function validateDistFolder() {
    const distPath = path.resolve('./dist');
    if (!existsSync(distPath)) {
        console.error('❌ Erro: Pasta dist/ não encontrada.');
        console.error('\nExecute o build antes do deploy:');
        console.error('   npm run build:prod');
        process.exit(1);
    }

    console.log(`✅ Pasta dist/ encontrada: ${distPath}`);
}

async function deploy() {
    loadEnvFile(ENV_FILE);
    validateRequiredEnv();
    validateProductionSupabaseTarget();
    validateProductionDomain();
    const remoteDir = validateRemotePath();
    validateDistFolder();

    const sftp = new SftpClient();
    const config = {
        host: process.env.SFTP_HOST,
        port: parseInt(process.env.SFTP_PORT, 10),
        username: process.env.SFTP_USER,
        password: process.env.SFTP_PASSWORD,
    };

    if (!Number.isInteger(config.port) || config.port <= 0) {
        console.error('❌ Erro: SFTP_PORT inválida.');
        process.exit(1);
    }

    const localDir = path.resolve('./dist');

    try {
        console.log('\n🚀 Iniciando deploy PROD via SFTP (SSH)...');
        console.log(`🌐 Servidor: ${config.host}:${config.port}`);
        console.log(`👤 Usuário: ${config.username}`);
        console.log(`📂 Destino: ${remoteDir}`);
        console.log(`📁 Origem: ${localDir}`);

        await sftp.connect(config);
        console.log('✅ Conectado com sucesso.');

        console.log('📤 Sincronizando arquivos (uploadDir)...');
        const result = await sftp.uploadDir(localDir, remoteDir);

        console.log(`\n✅ ${result}`);
        console.log('🚀 Deploy PROD finalizado com sucesso!');
        console.log('🔗 Verifique em: https://dromeflow.com');
    } catch (err) {
        console.error('\n❌ Erro durante o deploy SFTP PROD:');
        console.error(err.message);

        if (err.message?.includes('Authentication failure')) {
            console.log(`⚠️ Dica: Verifique usuário e senha no ${ENV_FILE}.`);
        }

        process.exit(1);
    } finally {
        await sftp.end();
    }
}

deploy();
