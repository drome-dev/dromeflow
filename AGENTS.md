# DromeFlow — Base de Conhecimento para Agentes de IA

## 1. IDENTIDADE DO PROJETO

- **Nome**: DromeFlow
- **Tipo**: SaaS de gestão e análise para franquias de limpeza
- **Stack**: React 18 + TypeScript + Vite + Supabase (PostgreSQL/Realtime/RLS) + Tailwind CSS
- **Repo**: `github.com/drome-dev/dromeflow`
- **Deploy**: Hostinger (SFTP) + Cloudflare (CDN/DNS/Proxy)
- **Auth**: Customizada via tabela `profiles` (NÃO usa `supabase.auth`)
- **PWA**: Instalável, Service Worker com Workbox, auto-update

## 2. STACK TECNOLÓGICA

### Frontend

| Tecnologia        | Uso                |
| ----------------- | ------------------ |
| React 19          | UI components      |
| TypeScript 5.8    | Tipagem            |
| Vite 6.2          | Build tool         |
| Tailwind CSS 4    | Estilização        |
| Lucide React      | Ícones             |
| Recharts          | Gráficos           |
| Framer Motion     | Animações          |
| @hello-pangea/dnd | Drag & Drop        |
| Sonner            | Notificações toast |

### Backend

| Tecnologia            | Uso                             |
| --------------------- | ------------------------------- |
| Supabase              | PostgreSQL + Realtime + Storage |
| @supabase/supabase-js | Client                          |
| SheetJS (xlsx)        | Processamento XLSX              |
| jsPDF                 | Geração de PDF                  |

### Deploy

| Ferramenta              | Uso                                |
| ----------------------- | ---------------------------------- |
| Hostinger               | Servidor web (Apache)              |
| Cloudflare              | CDN, DNS, Proxy (apenas isso)      |
| `scripts/deploy-dev.js` | FTP (porta 21) — ambiente DEV      |
| `scripts/deploy.js`     | SFTP (porta 65002) — ambiente PROD |

## 3. ESTRUTURA DO REPOSITÓRIO

```
DromeFlow/
├── components/          # Componentes React
│   ├── layout/          # Sidebar, ContentArea
│   ├── pages/           # ~36 páginas (Dashboard, Data, PosVendas, etc.)
│   └── ui/              # Modais, gráficos, pickers (~15)
├── services/            # Camada de dados (~45 arquivos)
│   ├── supabaseClient.ts
│   ├── auth/            # users.service
│   ├── units/           # units, unitKeys, unitModules
│   ├── modules/         # modules.service
│   ├── analytics/       # dashboard, clients, prestadoras, etc.
│   ├── data/            # dataTable, clientHistory
│   ├── ingestion/       # upload.service
│   ├── posVendas/       # posVendas, diagnostics
│   ├── comercial/       # comercial.service
│   ├── profissionais/   # profissionais.service
│   ├── recrutadora/     # recrutadora.service
│   ├── content/         # content.service
│   ├── access/          # accessCredentials
│   ├── utils/           # dates, export, activityLogger, etc.
│   └── index.ts         # Barrel temporário (Fase 6)
├── contexts/            # AuthContext, AppContext
├── hooks/               # useRealtimeSubscription
├── types/               # Tipos TypeScript
├── constants/           # Constantes
├── supabase/            # Config Supabase
├── docs/                # Documentação
├── migrations/          # SQL migrations
├── scripts/             # Deploy, sync
├── tools/               # Scripts Python utilitários
├── public/              # Ícones PWA, assets estáticos
├── App.tsx              # Componente raiz
├── index.tsx            # Entry point
├── index.html           # HTML template
├── types.ts             # Tipos globais
├── vite.config.ts       # Config Vite + PWA
└── tsconfig.json        # Config TypeScript
```

## 4. ARQUITETURA

### Fluxo de Dados

```
React Component → Hook/Service → supabaseClient → Supabase (PostgreSQL + Realtime)
                                    ↕
                              Context API (AuthContext, AppContext)
```

### Roteamento Customizado (sem React Router)

- `AppContext.activeView` controla qual página renderizar
- `ContentArea.tsx` faz switch case no `activeView`
- Navegação: `setView('dashboard')` via AppContext
- Segurança: apenas webhooks com prefixo `internal://` têm HTML injetado

### Autenticação (MVP)

- Login consulta diretamente `profiles` (email + senha em texto plano)
- Sessão persistida em `localStorage`
- Perfis: `super_admin`, `admin`, `user`
- Futuro: migrar para `auth.users` + hash bcrypt

### Hierarquia de Permissões (Unit-Based Access Control)

```
super_admin → Apenas módulos com 'super_admin' em allowed_profiles
admin       → TODOS os módulos da unidade (via unit_modules)
user        → Interseção de user_modules ∩ unit_modules
```

## 5. AMBIENTES: LOCAL, DEV E PRODUCTION

O sistema possui **três contextos documentados** e cada um tem um papel distinto.

| Contexto | Uso | Arquivo `.env` | Supabase ref | Domínio principal |
| --- | --- | --- | --- | --- |
| LOCAL | testes e criação | `.env.local` | `xivgioxraznqshlbgxdj` | ambiente local / ferramentas internas |
| DEV | testes com dados reais | `.env.dev` | `uframhbsgtxckdxttofo` | `dev.dromeflow.com` |
| PRODUCTION | sistema principal dos clientes | `.env.production` | `uframhbsgtxckdxttofo` | `dromeflow.com` |

Regras do projeto:
- `.env.local` é o arquivo operacional do desenvolvimento local e também é lido por `scripts/deploy.js` para as credenciais de deploy principal.
- `.env.dev` é o ambiente de validação com dados reais.
- `.env.production` é o ambiente usado pelos clientes.
- Nunca use `.env.dev` como atalho para produção nem troque o papel dos arquivos sem atualizar esta seção.

### Scripts Disponíveis

```bash
npm run dev:local              # Servidor local Vite (http://localhost:5173)
npm run build:dev              # Build modo DEV
npm run build:prod             # Build modo PRODUCTION
npm run deploy:dev             # Build + FTP para dev.dromeflow.com
npm run deploy:prod            # Build + SFTP para dromeflow.com
npm run deploy                 # ❌ BLOQUEADO (segurança)
npm run preview                # Preview do build
npm run lint                   # ESLint
```

### Deploy DEV

```bash
npm run deploy:dev
```

Validações automáticas (`deploy-dev.js`):

- Lê `.env.dev`
- Confirma Supabase ref = `uframhbsgtxckdxttofo`
- Confirma `VITE_BASE_DOMAIN` = `dev.dromeflow.com`
- Confirma `FTP_DEST` = `public_html/dev` ou `dev`
- Remove artefatos `.br`/`.gz` do build antes do upload
- Limpa diretório remoto antes de enviar
- Bloqueia caminhos perigosos (produção, raiz, etc.)

### Deploy PRODUCTION

```bash
npm run deploy:prod
```

Validações automáticas (`deploy.js`):

- Lê `.env.local`
- Bloqueia se faltar `SFTP_*` ou se os valores forem perigosos
- Bloqueia se placeholder (`seu-projeto`, `example`)
- Confirma `VITE_BASE_DOMAIN` = `dromeflow.com`
- Confirma `SFTP_DEST` = `domains/dromeflow.com/public_html`
- Bloqueia caminhos perigosos (vazio, `/`, `public_html`, `dev`, etc.)

### Estrutura do Destino (PRODUCTION)

```
domains/dromeflow.com/public_html/
├── .htaccess
├── index.html
├── manifest.webmanifest
├── sw.js
├── assets/
│   ├── index-*.js (.br / .gz)
│   ├── vendor-react-*.js
│   ├── vendor-supabase-*.js
│   └── [Pagina]-*.js (lazy chunks)
```

### Fluxo Recomendado

1. `npm run dev:local` — desenvolver localmente
2. `npm run deploy:dev` — publicar em `https://dev.dromeflow.com`
3. Testar no ambiente DEV
4. Confirmar `.env.dev` com valores reais de teste
5. `npm run deploy:prod` — publicar em `https://dromeflow.com`
6. Testar em produção

## 6. BANCO DE DADOS (TABELAS PRINCIPAIS)

### Atendimentos e Operacional

| Tabela           | Descrição                                          |
| ---------------- | -------------------------------------------------- |
| `processed_data` | Dados processados de upload XLSX (tabela volumosa) |
| `pos_vendas`     | Pós-vendas e reagendamentos                        |
| `profissionais`  | Prestadores de serviço                             |
| `recrutadora`    | Cards de recrutamento                              |
| `comercial`      | Oportunidades CRM                                  |

### Gestão

| Tabela         | Descrição                            |
| -------------- | ------------------------------------ |
| `units`        | Unidades/franquias                   |
| `unit_modules` | Módulos por unidade (composite PK)   |
| `unit_keys`    | Configuração dinâmica por unidade    |
| `profiles`     | Perfis de usuário (auth customizada) |
| `user_units`   | N:N usuários ↔ unidades              |
| `user_modules` | Módulos atribuídos por usuário       |

### Módulos e Navegação

| Tabela          | Descrição                        |
| --------------- | -------------------------------- |
| `modules`       | Módulos disponíveis (~15 ativos) |
| `actions`       | Ações do sistema                 |
| `activity_logs` | Logs de atividade                |
| `n8n_logs`      | Logs de webhooks N8N             |

### Integrações

| Tabela                 | Descrição              |
| ---------------------- | ---------------------- |
| `comercial_admin`      | Gestão de produção     |
| `financial_categories` | Categorias financeiras |
| `payment_records`      | Pagamentos             |
| `invoices`             | Faturas                |

### Funções RPC Relevantes

- `get_user_units`, `get_user_modules`
- `get_dashboard_metrics`
- `process_xlsx_upload`
- `delete_app_user`
- `unit_keys_list_columns`, `unit_keys_add_column`, `unit_keys_rename_column`, `unit_keys_drop_column`, `unit_keys_set_column_status`
- `get_unit_modules`, `assign_modules_to_unit`, `check_unit_module_access`

### Triggers Ativos

- `auto_create_module_action` — modules → actions
- `sync_processed_to_pos_vendas` — processed_data → pos_vendas (INSERT)
- `sync_pos_vendas_status` — pos_vendas → processed_data (UPDATE status)
- `comercial_sync_unit_clients` — comercial "ganhos" → unit_clients

## 7. SERVIÇOS POR DOMÍNIO

| Diretório        | Serviços                                                                |
| ---------------- | ----------------------------------------------------------------------- |
| `analytics/`     | dashboard, clients, prestadoras, serviceAnalysis, repasse, activityLogs |
| `units/`         | units, unitKeys, unitKeysAdmin, unitKeysColumns, unitModules            |
| `data/`          | dataTable, clientHistory, clientsDirectory                              |
| `auth/`          | users                                                                   |
| `modules/`       | modules                                                                 |
| `ingestion/`     | upload (pipeline XLSX)                                                  |
| `posVendas/`     | posVendas, diagnostics                                                  |
| `comercial/`     | comercial                                                               |
| `profissionais/` | profissionais                                                           |
| `recrutadora/`   | recrutadora                                                             |
| `utils/`         | dates, activityLogger, batch, errors, export, log, records, urlUtils    |
| `content/`       | content                                                                 |
| `access/`        | accessCredentials                                                       |

## 8. PIPELINE DE UPLOAD (XLSX)

### Etapas (`services/ingestion/upload.service.ts`)

1. **Leitura**: SheetJS no browser
2. **Validação**: Colunas obrigatórias
3. **Expansão Multi-Profissional**: `profissional` com `;` → registros com sufixo `_1`, `_2` no `atendimento_id`
4. **Divisão de Repasse**: `processRepasseValues()`
5. **STATUS Automático**: `applyWaitStatusForAfternoonShifts()` — "esperar" apenas quando TODOS os atendimentos do dia são TARDE
6. **Limpeza de Obsoletos**: `removeObsoleteRecords()` — remove baseados no `atendimento_id` base
7. **Envio**: Batches de 500 via RPC `process_xlsx_upload` com `ON CONFLICT (unidade_code, atendimento_id) DO UPDATE`

### Chave Lógica

`(unidade_code, atendimento_id)` — upsert idempotente

### Métricas Retornadas

```typescript
{ inserted: number, updated: number, ignored: number, deleted: number }
```

## 9. SISTEMA REALTIME

### Módulos com Realtime

| Módulo       | Tabela           | Status       |
| ------------ | ---------------- | ------------ |
| Pós-Vendas   | `pos_vendas`     | ✅           |
| Dados        | `processed_data` | ✅           |
| Dashboard    | Múltiplas        | ✅           |
| Agendamentos | `processed_data` | ✅           |
| Comercial    | —                | 🔄 Planejado |
| Recrutadora  | —                | 🔄 Planejado |

### Hook Padrão

```typescript
useRealtimeSubscription({
  tableName: 'pos_vendas',
  filter: `unit_id=eq.${unitId}`,
  onUpdate: () => {
    loadData();
  },
});
```

### Regra de Ouro

- **COM Realtime**: NUNCA chamar `loadData()` após CRUD (causa spinner infinito)
- **SEM Realtime**: Manter `loadData()` após save/delete

## 10. CONFIGURAÇÃO DE SUBDOMÍNIOS E URLs

- Padrão: `https://<unit-slug>.dromeflow.com/<module-code>`
- Cloudflare: A record raiz + CNAME wildcard `*` → `@` (proxied)
- Hostinger: `.htaccess` com SPA fallback (RewriteRule para `index.html`)
- Tabela `units`: coluna `slug` para kebab-case do nome da unidade
- Tabela `modules`: coluna `code` para path do módulo

## 11. CONFIGURAÇÃO POR UNIDADE (UNIT KEYS)

Tabela `unit_keys` — um registro por unidade (`UNIQUE (unit_id)`):
| Coluna | Tipo | Descrição |
|---|---|---|
| `umbler` | text | Config Umbler |
| `whats_profi` | text | WhatsApp profissional |
| `whats_client` | text | WhatsApp cliente |
| `botID` | text | ID do bot |
| `organizationID` | text | ID da organização |
| `trigger` | text | Trigger config |
| `description` | text | Descrição |
| `is_active` | boolean | Ativo |

UI: Gerenciar Unidades → Editar → aba "Keys" (apenas `super_admin`)
Colunas dinâmicas podem ser adicionadas via RPCs de administração.

## 12. MÓDULOS — CICLO DE VIDA

### Tabela `modules`

| Campo              | Descrição                                          |
| ------------------ | -------------------------------------------------- |
| `code`             | Identificador único (ex: `dashboard`)              |
| `name`             | Nome exibido na sidebar                            |
| `icon_name`        | Nome do ícone Lucide                               |
| `allowed_profiles` | Array de perfis (`["admin","user","super_admin"]`) |
| `position`         | Ordenação (densa, 1..n)                            |
| `is_active`        | Visível na sidebar                                 |
| `webhook_url`      | URL para conteúdo externo                          |

### Para criar um novo módulo

1. `INSERT INTO modules` com code, name, icon, allowed_profiles, position
2. Criar `components/pages/SeuModuloPage.tsx`
3. Criar `services/<dominio>/seuModulo.service.ts`
4. Adicionar case no `ContentArea.tsx`
5. Atribuir à unidade (unit_modules) e/ou usuário (user_modules)

## 13. UI E CONVENÇÕES

### Nomenclatura

```
Pages:      PascalCase + Page.tsx     (DashboardMetricsPage.tsx)
Modals:     PascalCase + Modal.tsx    (UserFormModal.tsx)
Services:   camelCase.service.ts      (dashboard.service.ts)
Hooks:      useCamelCase.ts           (useRealtimeSubscription.ts)
Contexts:   PascalCase + Context.tsx   (AuthContext.tsx)
Funções:    camelCase                  (fetchDashboardMetrics)
Tipos:      PascalCase                 (interface DataRecord)
Constantes: UPPER_SNAKE_CASE          (MAX_UPLOAD_SIZE)
```

### Console Logs

```typescript
console.log('[ComponentName] Action: details');
// Removidos em produção (terser: drop_console)
```

### Tailwind CSS 4

- Sem CSS modules — estilos inline com Tailwind
- Ícones: sempre `lucide-react`

## 14. BUILD E OTIMIZAÇÕES

### Code Splitting

```javascript
manualChunks: {
  'vendor-react': ['react', 'react-dom'],
  'vendor-supabase': ['@supabase/supabase-js']
}
```

### Compressão Dual

- Brotli (.br): priorizado por browsers modernos
- Gzip (.gz): fallback
- Threshold: 10KB

### Minificação (Terser)

- `drop_console: true` em produção
- `drop_debugger: true`

### Tamanhos (produção)

| Asset            | Tamanho                   |
| ---------------- | ------------------------- |
| Bundle principal | 201KB gzip / 164KB brotli |
| Vendor React     | ~8KB gzip                 |
| Vendor Supabase  | ~32KB gzip                |
| Páginas (lazy)   | ~10-50KB cada             |

## 15. STATUS DOS ATENDIMENTOS (PADRÃO)

| Status     | Cor      | Significado            |
| ---------- | -------- | ---------------------- |
| CONFIRMADO | Verde    | Finalizado com sucesso |
| PENDENTE   | Amarelo  | Aguardando confirmação |
| RECUSADO   | Vermelho | Cliente recusou        |
| AGUARDANDO | Azul     | Em processo            |
| ESPERAR    | Roxo     | Follow-up (tarde)      |
| AGENDADO   | Roxo     | Pós-venda agendado     |

## 16. ÁREAS CRÍTICAS (NÃO MODIFICAR SEM AUTORIZAÇÃO)

- **Upload XLSX**: `components/ui/UploadModal.tsx` e `services/ingestion/upload.service.ts`
- **Tabela `processed_data`**: Constraints, índices e schema
- **Trigger bidirecional**: `pos_vendas` ↔ `processed_data`

## 17. DEPENDÊNCIAS NÃO UTILIZADAS (A REMOVER NA FASE 6)

```
@aws-sdk/client-s3 (~2MB)
@aws-sdk/s3-request-presigner
services/index.ts (barrel temporário)
services/mockApi.ts (compatibilidade)
```

## 18. DOCUMENTAÇÃO DE REFERÊNCIA

| Arquivo                                    | Conteúdo                                      |
| ------------------------------------------ | --------------------------------------------- |
| `README.md`                                | Configuração geral, unit keys, acesso, deploy |
| `REPOSITORY_STRUCTURE.md`                  | Estrutura completa do repositório             |
| `SYSTEM_OVERVIEW.md`                       | Arquitetura, fluxos, módulos                  |
| `ANALISE_ESTRUTURA_COMPLETA.md`            | Análise arquitetural detalhada                |
| `COMPLEMENTO_COPILOT_INSTRUCTIONS.md`      | PWA, build, pipeline, debugging               |
| `DEPLOY_GUIDE.md`                          | Deploy Hostinger SFTP                         |
| `docs/backend_configuration.md`            | Estrutura do banco, RLS, tabelas              |
| `docs/CONFIGURACAO_SUBDOMINIOS_MODULOS.md` | Subdomínios e URLs                            |
| `docs/SUBDOMINIOS_E_URLS.md`               | Guia Cloudflare + Hostinger                   |
| `docs/UNIT_BASED_ACCESS_CONTROL.md`        | Sistema de permissões                         |
| `docs/UPLOAD_STATUS_LOGIC.md`              | Lógica de status no upload                    |
| `docs/N8N_LOGS_TABLE.md`                   | Webhooks externos N8N                         |
| `docs/REALTIME_IMPLEMENTATION_GUIDE.md`    | Guia Realtime                                 |
| `docs/REALTIME_STATUS.md`                  | Status do Realtime                            |
| `.planning/codebase/STRUCTURE.md`          | Estrutura do codebase                         |
| `.planning/codebase/ARCHITECTURE.md`       | Arquitetura e design patterns                 |
| `.planning/codebase/STACK.md`              | Dependências e versões                        |
| `.planning/codebase/CONVENTIONS.md`        | Convenções de código                          |
| `.planning/codebase/INTEGRATIONS.md`       | Integrações externas                          |
| `.planning/codebase/CONCERNS.md`           | Áreas críticas e riscos                       |
| `docs/CHANGELOG.md`                        | Histórico de mudanças                         |
| `Guia.md`                                  | Guia de treinamento do usuário                |
| `TUTORIAL_COMANDOS_DEPLOY.md`              | Comandos de deploy                            |
| `TUTORIAL_COMANDOS_DEPLOY_DEV.md`          | Deploy em desenvolvimento                     |

## 19. TERMOS DO GLOSSÁRIO

| Termo             | Definição                                                    |
| ----------------- | ------------------------------------------------------------ |
| Orçamento Base    | Registro original sem sufixo `_N`, `IS_DIVISAO = 'NAO'`      |
| Registro Derivado | Divisão de profissional com sufixo `_N`, `VALOR = 0`         |
| Repasse           | Soma distribuída entre profissionais (originais + derivados) |
| Módulo Público    | `allowed_profiles` vazio ou null                             |
| ALL               | Visualização multi-unidade ("Todos")                         |
| Chave Lógica      | `(unidade_code, atendimento_id)` para upload                 |

## 20. SEGURANÇA E BOAS PRÁTICAS

- RLS está permissivo (MVP) — reforço planejado
- Senhas em texto plano — migração para bcrypt planejada
- `VITE_` variáveis são públicas no bundle
- `.env.local` no `.gitignore`
- Console logs removidos em produção
- ContentArea só injeta HTML de URLs `internal://`
