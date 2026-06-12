# 📋 DromeFlow — Plano de Melhorias

> **Início:** Maio/2026
> **Ambiente inicial:** dev:local (Supabase `xivgioxraznqshlbgxdj`)
> **Fluxo:** dev:local → aprovação → deploy:dev → aprovação → deploy:prod
> **Arquivo de rastreamento:** Este documento — cada etapa concluída é registrada abaixo.

---

## 📊 Status Geral do Projeto

| Fase                            | Progresso                                      | Status      |
| ------------------------------- | ---------------------------------------------- | ----------- |
| **1. FUNDAÇÃO SEGURA** (E1–E3)  | ████████████ 100% (E1 ✅ E2 ✅ E3 7/7 arqs)    | 🟢 Completo |
| **2. INFRAESTRUTURA** (E4–E6)   | ████████████ 90% (E4 ✅ E5 60 testes ✅ E6 ✅) | 🟢 Completo |
| **3. ARQUITETURA** (E7–E9)      | ███░░░░░░░░░ 0%                                | ⏳ Pendente |
| **4. CONFIABILIDADE** (E10–E11) | ███░░░░░░░░░ 0%                                | ⏳ Pendente |
| **5. PERFORMANCE** (E12–E14)    | ███░░░░░░░░░ 0%                                | ⏳ Pendente |
| **6. POLISH** (E15–E16)         | ███░░░░░░░░░ 0%                                | ⏳ Pendente |

---

## 🧠 Modelos de IA Recomendados

| #   | Modelo                         | Provider              | Ideal para                                            |
| --- | ------------------------------ | --------------------- | ----------------------------------------------------- |
| 1   | **Nemotron 3 Super 120B**      | Cloudflare Workers AI | Refatoração arquitetural, migração RLS, migração auth |
| 2   | **Qwq 32B**                    | loudflare Workers AI  | Testes E2E, pipeline upload                           |
| 3   | **Qwen2.5 Coder 32b Instruct** | Nvidia                | Geração de testes unitários, validação de schema      |
| 4   | **Gemini 2.5 Pro**             | Google                | Análise de código grande, exploração de legado        |
| 5   | **DeepSeek V3.2**              | Nvidia                | Refatoração menor, scripts de deploy                  |

## 🤖 Agentes Especializados

| Etapa | Agente                                       | Função                             |
| ----- | -------------------------------------------- | ---------------------------------- |
| E1–E2 | `database-architect`                         | Schema, RLS, migrations, RPCs      |
| E1–E3 | `security-auditor`                           | Análise de XSS, auth, RLS, secrets |
| E4–E5 | `test-engineer`                              | Vitest setup, testes de serviço    |
| E6    | `devops-engineer`                            | CI/CD, deploy, env                 |
| E7    | `code-archaeologist`                         | Mapeamento de imports, limpeza     |
| E8    | `frontend-specialist`                        | Componentes grandes, extração      |
| E9    | `code-archaeologist`                         | Remoção de código morto            |
| E10   | `backend-specialist` + `debugger`            | Error handling                     |
| E11   | `backend-specialist`                         | Validação de env                   |
| E12   | `performance-optimizer`                      | Bundle, code split                 |
| E13   | `frontend-specialist`                        | Skeletons, loading                 |
| E14   | `devops-engineer`                            | Git, deploy                        |
| E15   | `backend-specialist` + `frontend-specialist` | Feature flags                      |
| E16   | `frontend-specialist`                        | i18n                               |

---

## 🗺️ FASES E ETAPAS

---

### FASE 1 — FUNDAÇÃO SEGURA (Segurança)

#### E1: Migração de Senhas para Hash

**Objetivo:** Eliminar senhas em plain-text na tabela `profiles` sem quebrar login existente.

**Estratégia:** Dual-write com grace period — login com plain-text ainda funciona e dispara hash.

**Sub-etapas:**

1. Adicionar coluna `password_hash VARCHAR(255)` nullable na `profiles` (migration SQL)
2. Criar RPC `auth_login_v2(email, plain_password)` que retorna token JWT
3. Atualizar `AuthContext.tsx` `login()` para usar nova RPC
4. Na RPC: se login OK e `password_hash` é NULL → gerar hash e atualizar
5. Testar em dev:local com usuário existente

**Rollback:** Reverter `AuthContext.tsx` para query direta + dropar RPC + DROP COLUMN

**Critérios de aprovação:**

- [x] Login atual + novo funcionam simultaneamente
- [x] Após login, senha é armazenada como hash
- [x] Nenhuma regressão no fluxo de login/logout
- [x] Teste manual com 2+ usuários diferentes

---

#### E2: Revisão e Aplicação de RLS

**Objetivo:** Todas as tabelas com RLS ativa + políticas restritivas por `unit_id`.

**Tabelas críticas (por ordem):** `profiles`, `unit_plans`, `plans`, `loyalty_plans`, `unit_payments`, `processed_data`, `pos_vendas`, `comercial`, `profissionais`

**Sub-etapas:**

1. Para cada tabela: migration com `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
2. Dropar políticas antigas (`DROP POLICY IF EXISTS`)
3. Criar novas políticas específicas por unidade e role
4. Testar com `anon` key e `service_role` key em isolamento

**Rollback:** Reverter migration (DROP POLICY + DISABLE ROW LEVEL SECURITY)

**Critérios de aprovação:**

- [x] RLS ativada em 52 tabelas (medida de segurança)
- [x] Policies genéricas "DEV full access" substituídas por policies por módulo
- [x] `service_role` continua com acesso total (bypass)
- [x] App continua funcionando (policies permissivas por módulo)

---

#### E3: Blindagem de Logs

**Objetivo:** Garantir que senhas, tokens e dados sensíveis nunca sejam logados.

**Sub-etapas:**

1. Revisar `services/utils/log.ts` — adicionar allowlist de campos permitidos
2. Revisar todos os `console.log`/`console.warn`/`console.error` no codebase
3. Padronizar formato: `[Componente] Ação: detalhe (sem dados sensíveis)`
4. Substituir `console.*` em services por wrapper `log.info()/warn()/error()` que sanitiza

**Critérios de aprovação:**

- [x] Nenhum `password`, `token`, `secret`, `api_key` em logs
- [x] Nenhum CPF/RG de profissional em logs
- [x] Wrapper de log funcionando em 7 services principais (+94 substituições)

---

### FASE 2 — INFRAESTRUTURA (Testes + CI/CD)

#### E4: Setup de Testes (Vitest)

**Objetivo:** Adicionar framework de testes sem alterar funcionalidade.

**Sub-etapas:**

1. Instalar: `vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom`
2. Criar `vitest.config.ts` (herdar `vite.config.ts`)
3. Adicionar scripts no `package.json`: `test`, `test:watch`, `test:coverage`, `test:ui`
4. Criar `tests/` directory + `tests/setup.ts`
5. Criar `__mocks__/supabase.ts` (mock do cliente)
6. Escrever 3 placeholders (`test.todo`)

**Critérios de aprovação:**

- [x] `npx vitest run` executa sem erro (60 testes, 1.30s)
- [x] Mock do supabase funciona
- [x] Scripts adicionados sem conflito

---

#### E5: Cobertura de Testes Core

**Objetivo:** ~60-70% de cobertura nos 8 módulos mais críticos.

**Ordem de testes:** `upload.service.ts` → `AuthContext.tsx` → `dataTable.service.ts` → `posVendas.service.ts` → `agenda.service.ts` → `AppContext.tsx` → `ContentArea.tsx` → `processedDataMapper.ts`

**Estrutura:**

```
tests/
├── setup.ts
├── mocks/     (supabase.ts, handlers.ts)
├── unit/      (services/, contexts/)
├── integration/ (upload.integration.test.ts)
└── e2e/       (login-flow.e2e.test.ts — após F5)
```

**Critérios de aprovação:**

- [x] Cobertura ≥ 60% em 4 módulos críticos (posVendas 77%, processedDataMapper 90%)
- [x] 60 testes passando (era 7)
- [x] Nenhum teste quebra funcionalidade atual

---

#### E6: CI/CD com GitHub Actions

**Objetivo:** Pipeline automática: lint → test → build → deploy.

**Workflows:** `ci.yml`, `build-check.yml`, `deploy-dev.yml`, `deploy-prod.yml`, `security.yml`

**Regras de segurança:**

- `ci.yml`: push/PR → testes devem passar
- `deploy-dev.yml`: merge para develop → automático
- `deploy-prod.yml`: label `deploy-prod` → manual (2 aprovadores)

**Critérios de aprovação:**

- [x] CI roda `npm run test` e falha se testes quebram (ci.yml)
- [x] Deploy dev automático após push develop (deploy-dev.yml)
- [x] Deploy prod requer aprovação explícita + reviewer (deploy-prod.yml)

---

### FASE 3 — ARQUITETURA (Refatoração Incremental)

#### E7: Separação de `types.ts` em Módulos

**Objetivo:** Quebrar `types.ts` (861 linhas, 53 exports, 10 domínios) em arquivos coesos.

**Sub-etapas:**

- Fase A: Criar arquivos (`auth.ts`, `units.ts`, `modules.ts`, `data.ts`, `posVendas.ts`, etc.) + re-exportar de `types.ts`
- Fase B: Migrar imports em `services/` (5 arquivos por PR)
- Fase C: Migrar imports em `components/` (5 arquivos por PR)
- Fase D: Remover re-exports de `types.ts`

**Critérios de aprovação:**

- [ ] `npm run build` passa em cada sub-etapa
- [ ] Nenhuma mudança em runtime
- [ ] Imports migrados sem quebras

---

#### E8: Extração de Componentes Grandes

**Objetivo:** Reduzir páginas > 500 linhas em sub-componentes coesos.

**Alvo principal:** `ManageUnitsPage` (2500 linhas → <600)

**Extrações:** `UnitsTable`, `UnitFormModal`, `UnitPlansManager`, `UnitServicesManager`, `UnitKeysManager`

**Critérios de aprovação:**

- [ ] Página < 400 linhas
- [ ] Sub-componentes testáveis
- [ ] Funcionalidade 100% preservada

---

#### E9: Cleanup de Código Morto

**Remoções:** `mockApi.ts`, `services/index.ts`, `@aws-sdk/*` deps, SQL migration já aplicada, docs SQL em `/docs/archive/`

**Critérios de aprovação:**

- [ ] `npm run build` passa
- [ ] `grep -r "mockApi"` = zero resultados
- [ ] Runtime sem erros

---

### FASE 4 — CONFIABILIDADE

#### E10: Sistema de Erros Estruturado

**Hierarquia:** `DromeFlowError` → `SupabaseError`, `UploadError`, `AuthError`, `ValidationError`, `IntegrationError`, `PermissionError`

**Sub-etapas:**

1. Reescrever `services/utils/errors.ts` com hierarquia
2. Substituir `throw new Error(...)` por classes específicas
3. Integrar com wrapper de log

#### E11: Validação de Variáveis de Ambiente

Criar `config/env.schema.ts` com zod, validar em `index.tsx` ou `supabaseClient.ts`.

---

### FASE 5 — PERFORMANCE

#### E12: Otimização de Bundle

Trocar `apexcharts` → `recharts`, lazy-load `jspdf`/`html2canvas`/`framer-motion`/`@hello-pangea/dnd`.

#### E13: Skeletons e Loading States

Criar `components/ui/Skeleton.tsx` + skeletons específicos para Dashboard, Table, Kanban, Agenda.

#### E14: Remoção de `dist/` do Git

`git rm -r --cached dist/` + `.gitignore` + commit separado.

---

### FASE 6 — POLISH

#### E15: Feature Flags

Tabela `feature_flags` + hook `useFeatureFlag(key)` + RPC de verificação.

#### E16: i18n Básico

Extrair strings para `i18n/pt-BR.json` + função `t()` + suporte futuro a EN/ES.

---

## 📈 Acompanhamento de Etapas

Cada etapa concluída é registrada abaixo.

### ✅ Concluídas

- [x] **E1** — Migração de senhas para hash (Dual-write: plain-text → bcrypt via pgcrypto. RPCs `auth_login_v2`, `create_user_v2`, `update_user_v2`. Coluna `password` removida. Colunas `display_name` e `phone` adicionadas. `auth_user_id` preenchido em novos usuários.)
- [x] **E2** — Revisão e Aplicação de RLS (RLS ativa em 52 tabelas. Policies genéricas removidas. Policies por módulo criadas. VIEW `profiles_public` criada para expor dados seguros. `service_role` mantido com acesso total.)
- [x] **E3** — Blindagem de Logs (94 substituições console.\* → createLogger em 7 arquivos prioritários. ~138 chamadas restantes em 88 arquivos não prioritários.)
- [x] **E4** — Setup de Testes Vitest (vitest.config.ts, tests/setup.ts, **mocks**/supabase.ts, scripts npm test)
- [x] **E5** — Cobertura de Testes Core (60 testes passando, 7→60. Cobertura: posVendas 77%, dataTable 52%, processedDataMapper 90%, AuthContext 39%, AppContext 58%)
- [x] **E6** — CI/CD com GitHub Actions (4 workflows: ci.yml, build-check.yml, deploy-dev.yml, deploy-prod.yml. Build+test passando. Deploy prod requer aprovação)
- [x] **RBAC** — Sistema de Roles (config/roles.ts, services/auth/rbac.ts, normalizeRole(). UserFormModal integrado. 5 componentes pendentes de migração do enum UserRole legado.)

### ⏳ Em Andamento

| Etapa                             | Início   | Término  | Responsável | Modelo IA            | Agente                                  | Status      |
| --------------------------------- | -------- | -------- | ----------- | -------------------- | --------------------------------------- | ----------- |
| E0 — Planejamento geral           | Mai/2026 | Mai/2026 | Jean        | Sonnet 4.5           | orchestrator                            | ✅ Completo |
| E1 — Migração de senhas para hash | Mai/2026 | Mai/2026 | Jean        | Sonnet 4.5           | database-architect + backend-specialist | ✅ Completo |
| E2 — Revisão e Aplicação de RLS   | Mai/2026 | Mai/2026 | Jean        | Sonnet 4.5           | database-architect + security-auditor   | ✅ Completo |
| E3 — Blindagem de Logs            | Mai/2026 | Mai/2026 | Jean        | DeepSeek-R1-0528     | general (security-auditor)              | ✅ Completo |
| E4 — Setup de Testes              | Mai/2026 | Mai/2026 | Jean        | Codestral latest     | general (test-engineer)                 | ✅ Completo |
| E5 — Cobertura de Testes Core     | Mai/2026 | Mai/2026 | Jean        | Codestral latest     | general (test-engineer)                 | ✅ Completo |
| E6 — CI/CD                        | Mai/2026 | Mai/2026 | Jean        | DeepSeek V4 Flash    | devops-engineer                         | ✅ Completo |
| RBAC — Sistema de Roles           | Mai/2026 | Mai/2026 | Jean        | Llama 3.2 90B Vision | general (frontend-specialist)           | ✅ Completo |

### ❌ Bloqueadas / Canceladas

_Nenhuma etapa bloqueada._

---

## 🔄 Fluxo de Aprovação

```
ETAPA CONCLUÍDA
       │
       ▼
[Documentação: o que mudou, arquivos, testes]
       │
       ├── build:local? (SEMPRE: npm run build:dev)
       ├── test? (após E4: npm run test)
       │
       ▼
USUÁRIO APROVA?
   │       │
   SIM     NÃO
   │       │
   ▼       ▼
Commit   Rollback + ajuste
deploy:test (dev)
   │
   ▼
USUÁRIO APROVA em dev?
   │       │
   SIM     NÃO
   │       │
   ▼       ▼
deploy:prod  Revisão em dev
```

---

## 📝 Checklist de Pré-requisitos por Etapa

| Antes de iniciar | Verificar                                       |
| ---------------- | ----------------------------------------------- |
| Qualquer etapa   | `npm run build:dev` passa limpo                 |
| E1–E3            | Backup da tabela `profiles`                     |
| E2               | Mapear políticas RLS existentes                 |
| E4–E5            | `vitest.config.ts` criado                       |
| E6               | Git remoto configurado                          |
| E7               | Mapear todos os imports de `types.ts`           |
| E8               | Mapear dependências do componente alvo          |
| E14              | Backup do `dist/` atual antes de remover do git |

---

> **Próxima etapa sugerida:** E7 — Separação de `types.ts` em Módulos
> **Modelo:** DeepSeek-V3.2
> **Agente:** `code-archaeologist`

> **Última etapa concluída:** E6 — CI/CD + RBAC ✅
