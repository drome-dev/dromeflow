# Tutorial de Comandos — DromeFlow

Guia rápido para desenvolvimento, validação e deploy com segurança.

## 1) Desenvolver local sem publicar

```bash
npm run dev:local
```

Abra no navegador a URL exibida pelo Vite, normalmente `http://localhost:5173`.

## 2) Validar build de DEV

```bash
npm run build:dev
```

## 3) Publicar no DEV (`dev.dromeflow.com`)

```bash
npm run deploy:dev
```

Esse comando valida:

- `.env.dev`
- Supabase DEV `xivgioxraznqshlbgxdj`
- `VITE_BASE_DOMAIN=dev.dromeflow.com`
- `FTP_DEST=public_html/dev`

## 4) Validar build de PRODUÇÃO

Antes de rodar, confirme que `.env.production` tem valores reais de produção, não placeholders.

```bash
npm run build:prod
```

## 5) Publicar em PRODUÇÃO (`dromeflow.com`)

```bash
npm run deploy:prod
```

Esse comando valida:

- `.env.production`
- Supabase PROD diferente do projeto DEV
- `VITE_BASE_DOMAIN=dromeflow.com`
- `SFTP_DEST=domains/dromeflow.com/public_html`

## 6) Conferir ambientes sem expor chaves

```bash
node -e "const fs=require('fs');for(const f of ['.env.dev','.env.production']){const e=Object.fromEntries(fs.readFileSync(f,'utf8').split(/\n/).filter(l=>l.includes('=')&&!l.trim().startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1)]}));const ref=e.VITE_SUPABASE_URL?new URL(e.VITE_SUPABASE_URL).hostname.replace('.supabase.co',''):'missing';console.log(f,{env:e.VITE_APP_ENV||'missing',baseDomain:e.VITE_BASE_DOMAIN||'missing',supabaseRef:ref,ftpDest:e.FTP_DEST||'missing',sftpDest:e.SFTP_DEST||'missing'})}"
```

## 7) Checar sintaxe dos scripts de deploy

```bash
node --check scripts/deploy-dev.js
node --check scripts/deploy.js
```

## 8) Comando bloqueado

Não use:

```bash
npm run deploy
```

O deploy genérico é bloqueado por segurança para evitar publicar com ambiente errado.

## Fluxo recomendado

1. `npm run dev:local`
2. `npm run deploy:dev`
3. testar em `https://dev.dromeflow.com`
4. confirmar `.env.production`
5. `npm run deploy:prod`
6. testar em `https://dromeflow.com`
