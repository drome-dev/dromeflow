# Tutorial de Comandos — DromeFlow DEV

Guia rápido para desenvolvimento e deploy no ambiente `dev.dromeflow.com`.

Neste fluxo:

- `.env.local` fica para testes e criação local
- `.env.dev` fica para validação com dados reais
- `.env.production` fica para o sistema principal dos clientes

## 1) Rodar local

```bash
npm run dev:local
```

## 2) Gerar build DEV

```bash
npm run build:dev
```

## 3) Publicar no DEV

```bash
npm run deploy:dev
```

Esse comando já:

1. executa `build:dev`
2. carrega `.env.dev`
3. valida Supabase DEV (`xivgioxraznqshlbgxdj`)
4. valida domínio DEV (`dev.dromeflow.com`)
5. valida destino remoto DEV (`public_html/dev`)
6. realiza upload para o destino DEV

## 4) Verificar ambiente DEV sem expor chaves

```bash
node -e "const fs=require('fs');const e=Object.fromEntries(fs.readFileSync('.env.dev','utf8').split(/\n/).filter(l=>l.includes('=')&&!l.trim().startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1)]}));console.log({env:e.VITE_APP_ENV,baseDomain:e.VITE_BASE_DOMAIN,supabaseRef:new URL(e.VITE_SUPABASE_URL).hostname.replace('.supabase.co',''),ftpDest:e.FTP_DEST})"
```

Esperado:

- `env`: `development`
- `baseDomain`: `dev.dromeflow.com`
- `supabaseRef`: `xivgioxraznqshlbgxdj`
- `ftpDest`: `public_html/dev`

## 5) Comando bloqueado

Não use:

```bash
npm run deploy
```

O deploy genérico é bloqueado por segurança. Use sempre `npm run deploy:dev` ou `npm run deploy:prod`.
