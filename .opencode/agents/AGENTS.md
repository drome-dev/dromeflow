# DromeFlow — AI Agent Instructions

## 📋 Contexto do Projeto

- **Stack**: React 19 + TypeScript + Vite 6.2 + Supabase + Tailwind CSS 4
- **Roteamento**: Sem React Router. Controle via `AppContext.activeView` em `ContentArea.tsx`. Navegação: `setView('nome-da-view')`
- **Autenticação**: Custom (sem `supabase.auth`). Consulta direta na tabela `profiles` (senha em texto puro, MVP). Sessão em `localStorage`
- **Permissões**: Baseada em unidades
  - `super_admin` → apenas módulos com `'super_admin'` em `allowed_profiles`
  - `admin` → todos os `unit_modules` da unidade
  - `user` → interseção `user_modules ∩ unit_modules`
- **Rotas públicas**: `cadastro.*`, `landpage.*`, `onboarding.*`, `agenda.*` (tratadas no `App.tsx` antes do `AuthProvider`)
- **Alias**: `@/*` → raiz do projeto
- **Wrappers**: `<React.StrictMode>` + `@tanstack/react-query` no `index.tsx`

## 🧠 Diretrizes de Comportamento (OBRIGATÓRIAS)

1. **Pensar antes de codar**
   - Declare suposições explicitamente. Na dúvida, pergunte.
   - Se houver múltiplas interpretações, liste-as (não escolha em silêncio).
   - Se uma solução mais simples existir, sugira-a. Recue quando necessário.
   - Se algo não estiver claro, pare. Nomeie a dúvida. Pergunte.

2. **Simplicidade Primeiro**
   - Código mínimo para resolver o problema. Nada especulativo.
   - Zero features além do solicitado. Zero abstrações para uso único.
   - Sem "flexibilidade" ou "configurabilidade" não pedida.
   - Sem tratamento de erro para cenários impossíveis.
   - Se 200 linhas podem virar 50, reescreva. Simplifique.

3. **Mudanças Cirúrgicas**
   - Toque apenas no necessário. Limpe apenas a bagunça que você criou.
   - Não "melhore" código, comentários ou formatação vizinhos.
   - Não refatore o que não está quebrado. Mantenha o estilo existente.
   - Se notar código morto não relacionado, mencione (não apague).
   - Remova apenas imports/variáveis/funções que **suas alterações** tornaram órfãos.
   - Teste mental: toda linha alterada deve rastrear diretamente ao pedido do usuário.

4. **Execução Orientada a Objetivos**
   - Transforme tarefas em critérios verificáveis antes de começar.
   - Ex: "Adicionar validação" → "Escrever testes para entradas inválidas e fazê-los passar"
   - Para tarefas em etapas, liste um plano breve:
     1. [Etapa] → verificar: [check]
     2. [Etapa] → verificar: [check]
   - Critérios fortes permitem autonomia. Critérios fracos ("faz funcionar") exigem microgerenciamento.

## 🚫 Regras Críticas (NÃO MODIFICAR SEM AUTORIZAÇÃO)

- **Realtime Golden Rule**:
  - ✅ COM Realtime: **NUNCA** chame `loadData()` após CRUD (causa spinner infinito por dupla atualização).
  - ❌ SEM Realtime: Mantenha `loadData()` após save/delete.
  - Afeta: Pós-Vendas, Dados/Agendamentos, Dashboard.
- **Upload Pipeline** (`services/ingestion/upload.service.ts`):
  - Não modifique este arquivo, `UploadModal.tsx`, schema `processed_data` ou o trigger bidirecional sem autorização explícita.
  - Lógica fixa: SheetJS → expansão multi-profissional (`;`) → divisão de repasse → STATUS `"esperar"` só se todos serviços forem `"Tarde"` → cleanup → batch 500 via RPC `process_xlsx_upload` → upsert key: `(unidade_code, atendimento_id)`.
- **Ambientes & Deploy**:
  - `.env.*` são ignorados no git (exceto `.env.example`).
  - `deploy:dev` lê `.env.dev` | `deploy:prod` lê `.env.production`.
  - `dist/` **é commitado** no git.
  - `npm run deploy` está **bloqueado** por segurança.
- **Phase 6 Cleanup**: Deps não usadas (`@aws-sdk/*`, `services/index.ts`, `services/mockApi.ts`) aguardam PR dedicado. **Não remova ainda**.

## 📐 Convenções & Padrões

- **Nomes**: Páginas `PascalCase + Page.tsx` | Serviços `camelCase.service.ts`
- **Logs**: `[ComponentName] Ação: detalhes` (removidos em produção via Terser `drop_console: true`)
- **Estilo**: Tailwind CSS 4, ícones Lucide React, zero CSS modules
- **Lógica de Negócio**: Sempre em serviços, nunca em componentes
- **Build**: Vite 6.2 + Terser | PWA com Workbox | Compressão dupla (Brotli + Gzip, threshold 10KB) | Code splitting manual (`vendor-react` + `vendor-supabase`)

## ✅ Fluxo de Trabalho Recomendado

1. Leia o pedido → identifique o objetivo exato
2. Verifique regras críticas e contexto antes de propor solução
3. Liste suposições + plano curto (se multi-etapa)
4. Implemente apenas o necessário, seguindo convenções
5. Verifique contra os critérios de sucesso → ajuste se necessário
6. Confirme que nenhuma regra crítica foi violada antes de finalizar

---

_Trade-off: Estas diretrizes priorizam segurança e clareza sobre velocidade. Para tarefas triviais, use o bom senso._
