# Resend — E-mail de Recuperação de Senha

## Visão Geral

O fluxo "Esqueci Senha" envia e-mail com código de 6 dígitos via **Resend** (`api.resend.com`).  
Substituiu o webhook n8n (`n8n.dromedario.cloud`) que estava fora do ar.

## Fluxo

```
LoginPage (step: email)
  → Edge Function: request-password-reset
    → Gera código de 6 dígitos
    → Salva hash na tabela password_reset_tokens
    → Envia e-mail via Resend
LoginPage (step: reset)
  → Edge Function: verify-reset-code
    → Verifica código vs hash
    → Atualiza password_hash na profiles
```

## Configuração

| Item | Valor |
|------|-------|
| Domínio verificado | `dromeflow.com` (Hostinger) |
| API Key | `re_FyYUdzq2_3RBLEhm2jH4GArCARmRgD31y` |
| Remetente | `DromeFlow <noreply@dromeflow.com>` |
| Secrets (Supabase) | `RESEND_API_KEY` |

## Código

Edge Function em `supabase/functions/request-password-reset/index.ts`:

```ts
const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    from: "DromeFlow <noreply@dromeflow.com>",
    to: email,
    subject: "Código de recuperação de senha - DromeFlow",
    html: `<div>...${code}...</div>`,
  }),
})
```

## DNS (Hostinger)

Registros TXT e MX adicionados no painel da Hostinger para verificar o domínio `dromeflow.com` no Resend.

## Manutenção

- Template HTML do e-mail está inline no `index.ts`
- Para alterar o remetente, mude `FROM_EMAIL` no topo do arquivo
- Limite da Resend: 100 e-mails/dia no plano gratuito
