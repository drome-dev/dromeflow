

  # Agentes Recomendados para o DromeFlow

Data da análise: 2026-05-08

## Objetivo

Este documento apresenta uma análise da estrutura atual do DromeFlow e recomenda um conjunto de agentes especializados para orientar melhor evoluções, manutenção, debugging e personalização do sistema.

A análise foi feita sem alterar código-fonte. O único artefato criado foi este documento.

## Resumo da Estrutura Atual

O DromeFlow é uma aplicação React + TypeScript + Vite com Supabase como backend principal. A arquitetura é organizada por domínios de negócio, com uma camada de serviços segmentada, páginas React carregadas sob demanda, contextos globais para autenticação/navegação e um conjunto relevante de integrações externas.

Principais pontos observados:

- Frontend em React 19, TypeScript, Vite, Tailwind CSS e componentes modulares.
- Backend centralizado no Supabase: PostgreSQL, RPCs, Realtime, RLS, Storage e Edge Functions.
- Autenticação customizada via tabela `profiles`, ainda sem uso pleno de `supabase.auth` no fluxo principal.
- Permissões por perfil, unidade e módulo, usando `profiles`, `user_units`, `user_modules`, `unit_modules` e `modules`.
- Estrutura multiunidade com seleção de unidade e modo agregado `ALL`.
- Módulos de negócio amplos: Dashboard, Dados, Agendamentos, Clientes, Comercial, Comercial Admin, Produção, Pós-Vendas, Profissionais, Recrutadora, Prestadoras, Financeiro, Fidelidade, Typebot, Umbler, Sistema e Administração.
- Camada de serviços bem separada em `services/*`, embora ainda exista compatibilidade legada em `services/index.ts` e `services/mockApi.ts`.
- Realtime usado em fluxos operacionais, principalmente atividades, agenda, pós-vendas e dashboards.
- Ingestão de XLSX com regras sensíveis de negócio: expansão de multiprofissionais, repasse, status, limpeza seletiva e sincronização com clientes.
- Edge Functions para integrações com Asaas, Meta/WhatsApp, Typebot e sincronizações financeiras.
- Documentação interna extensa em `README.md`, `SYSTEM_OVERVIEW.md`, `REPOSITORY_STRUCTURE.md`, `docs/` e scripts SQL versionados.

## Domínios Críticos do Projeto

### 1. Plataforma e Navegação

Arquivos e áreas principais:

- `App.tsx`
- `index.tsx`
- `contexts/AuthContext.tsx`
- `contexts/AppContext.tsx`
- `components/layout/Sidebar.tsx`
- `components/layout/ContentArea.tsx`
- `types.ts`

Responsabilidades:

- Roteamento interno por `PageView`.
- Rotas públicas por subdomínio: agenda, onboarding e cadastro.
- Seleção de unidade, modo `ALL`, persistência em `localStorage` e navegação por slug.
- Lazy loading das páginas.
- Controle inicial de sessão e módulos visíveis.

### 2. Supabase, Banco e Segurança

Arquivos e áreas principais:

- `services/supabaseClient.ts`
- `services/auth/users.service.ts`
- `services/units/*.service.ts`
- `services/modules/modules.service.ts`
- `supabase/migrations/`
- `docs/sql/`
- `docs/UNIT_BASED_ACCESS_CONTROL.md`

Responsabilidades:

- Modelagem PostgreSQL.
- RPCs.
- RLS.
- Tabelas de permissões.
- Triggers de sincronização.
- Migrações SQL.
- Preparação futura para Supabase Auth real.

### 3. Dados, Upload e Analytics

Arquivos e áreas principais:

- `services/ingestion/upload.service.ts`
- `services/data/*.service.ts`
- `services/analytics/*.service.ts`
- `components/pages/DataPage.tsx`
- `components/pages/DashboardMetricsPage.tsx`
- `components/ui/UploadModal.tsx`

Responsabilidades:

- Processamento de planilhas XLSX.
- Normalização de `processed_data`.
- Métricas de receita, atendimentos, clientes, repasse e rankings.
- Lógica de clientes recorrentes, atenção/churn e histórico.
- Exportações e relatórios.

### 4. Operações de Negócio

Arquivos e áreas principais:

- `components/pages/ComercialPage.tsx`
- `components/pages/ComercialAdminPage.tsx`
- `components/pages/ProductionPage.tsx`
- `components/pages/PosVendasPage.tsx`
- `components/pages/RecrutadoraPage.tsx`
- `components/pages/ProfissionaisPage.tsx`
- `services/comercial/*`
- `services/comercial-admin/*`
- `services/production/*`
- `services/posVendas/*`
- `services/recrutadora/*`
- `services/profissionais/*`

Responsabilidades:

- Kanbans e pipelines.
- Gestão de implantação e produção.
- Pós-vendas sincronizado com `processed_data`.
- Cadastro, histórico e performance de profissionais.
- Fluxos de recrutamento e prestadoras.

### 5. Integrações e Automações

Arquivos e áreas principais:

- `services/n8n/n8n.service.ts`
- `services/integration/*.service.ts`
- `services/infinitepay/infinitepay.service.ts`
- `services/financial/financial.service.ts`
- `services/infinitepay/`
- `supabase/functions/*`
- `components/pages/TypebotPage.tsx`
- `components/pages/UmblerPage.tsx`

Responsabilidades:

- Webhooks.
- N8N.
- Asaas.
- InfinitePay.
- Meta OAuth/WhatsApp.
- Typebot proxy.
- Umbler.
- Sincronização financeira e de clientes.

### 6. UI, UX e Design System

Arquivos e áreas principais:

- `src/index.css`
- `components/ui/*`
- `components/pages/*`
- `components/agenda/*`
- `components/documents/*`
- `components/pages/financial/*`

Responsabilidades:

- Consistência visual entre módulos.
- Modais complexos.
- Tabelas, cards, gráficos e kanbans.
- Responsividade.
- Estados de carregamento, erro e vazio.
- Experiência mobile em rotas públicas.

### 7. Deploy, Build e Operação

Arquivos e áreas principais:

- `vite.config.ts`
- `package.json`
- `scripts/deploy.js`
- `scripts/deploy-dev.js`
- `DEPLOY_GUIDE.md`
- `TUTORIAL_COMANDOS_DEPLOY.md`
- `TUTORIAL_COMANDOS_DEPLOY_DEV.md`
- `sync-*.sh`

Responsabilidades:

- Build de produção e desenvolvimento.
- PWA.
- Compressão Brotli/Gzip.
- Deploy Hostinger/Cloudflare.
- Scripts operacionais.
- Sincronizações manuais.

## Agentes Recomendados

### 1. Agente Arquiteto DromeFlow

Prioridade: essencial.

Função:

Manter visão sistêmica do produto, avaliar impacto entre módulos e garantir que novas features respeitem a arquitetura existente.

Quando usar:

- Antes de criar um novo módulo.
- Antes de alterar navegação, permissões ou estrutura de dados.
- Para revisar decisões entre frontend, Supabase e automações.
- Para transformar uma solicitação ampla em plano técnico.

Contexto que deve receber:

- `SYSTEM_OVERVIEW.md`
- `REPOSITORY_STRUCTURE.md`
- `README.md`
- `types.ts`
- `App.tsx`
- `contexts/AuthContext.tsx`
- `contexts/AppContext.tsx`
- `components/layout/ContentArea.tsx`
- `components/layout/Sidebar.tsx`

Entregáveis esperados:

- Plano de implementação.
- Mapa de impacto por módulo.
- Riscos e dependências.
- Sequência recomendada de execução.

### 2. Agente Supabase e Segurança

Prioridade: essencial.

Função:

Cuidar de banco, RLS, RPCs, triggers, migrações, Edge Functions e segurança de dados.

Quando usar:

- Ao criar ou alterar tabelas.
- Ao mexer em permissões por unidade, usuário ou módulo.
- Ao alterar fluxos que dependem de `processed_data`, `profiles`, `units`, `modules`, `unit_modules` ou `user_modules`.
- Ao criar RPCs e triggers.
- Ao revisar riscos da autenticação customizada.

Contexto que deve receber:

- `services/supabaseClient.ts`
- `services/auth/users.service.ts`
- `services/units/*.service.ts`
- `services/modules/modules.service.ts`
- `docs/UNIT_BASED_ACCESS_CONTROL.md`
- `docs/sql/*.sql`
- `supabase/migrations/*.sql`
- `supabase/functions/*/index.ts`

Entregáveis esperados:

- SQL de migração.
- Políticas RLS.
- Plano de rollback.
- Auditoria de segurança.
- Recomendações para migração gradual para Supabase Auth.

### 3. Agente Dados, Upload e Analytics

Prioridade: essencial.

Função:

Especialista em ingestão de planilhas, consistência de `processed_data`, métricas, dashboards, clientes, repasse e relatórios.

Quando usar:

- Ao alterar upload XLSX.
- Ao mudar regras de status, repasse, profissional, atendimento ou limpeza.
- Ao criar métricas novas.
- Ao corrigir divergência entre Dashboard, Dados, Clientes e Prestadoras.
- Ao revisar performance de consultas analíticas.

Contexto que deve receber:

- `services/ingestion/upload.service.ts`
- `services/data/dataTable.service.ts`
- `services/data/processedDataMapper.ts`
- `services/data/clientHistory.service.ts`
- `services/analytics/*.service.ts`
- `components/ui/UploadModal.tsx`
- `components/pages/DataPage.tsx`
- `components/pages/DashboardMetricsPage.tsx`
- `docs/UPLOAD_BEHAVIOR.md`
- `docs/UPLOAD_STATUS_LOGIC.md`

Entregáveis esperados:

- Regras de negócio formalizadas.
- Casos de teste por cenário de planilha.
- Ajustes em queries e métricas.
- Plano de validação com dados reais.

### 4. Agente Permissões e Multiunidade

Prioridade: essencial.

Função:

Garantir que cada usuário veja os módulos e dados corretos por perfil, unidade e contexto `ALL`.

Quando usar:

- Ao criar módulo novo.
- Ao alterar `allowed_profiles`, `unit_modules` ou `user_modules`.
- Ao mexer no modo Super Admin, Admin View ou seleção de unidade.
- Ao habilitar uma página para visão agregada `ALL`.

Contexto que deve receber:

- `contexts/AuthContext.tsx`
- `contexts/AppContext.tsx`
- `components/layout/Sidebar.tsx`
- `services/units/unitModules.service.ts`
- `services/auth/users.service.ts`
- `components/pages/ManageUsersPage.tsx`
- `components/pages/ManageModulesPage.tsx`
- `components/pages/ManageUnitsPage.tsx`
- `docs/UNIT_BASED_ACCESS_CONTROL.md`

Entregáveis esperados:

- Matriz de permissões.
- Checklist de acesso por perfil.
- Pontos de risco de vazamento de dados.
- Regras para comportamento em `ALL`.

### 5. Agente UI/UX Operacional

Prioridade: alta.

Função:

Padronizar telas, modais, tabelas, kanbans, estados e responsividade, mantendo a experiência operacional densa e eficiente.

Quando usar:

- Ao criar ou refinar páginas.
- Ao melhorar formulários e modais.
- Ao ajustar responsividade.
- Ao padronizar botões, ícones, filtros, tabs e cards.
- Ao revisar usabilidade de fluxos complexos.

Contexto que deve receber:

- `src/index.css`
- `components/ui/*`
- `components/pages/*`
- `components/layout/*`
- `components/agenda/*`
- `components/pages/financial/*`
- `docs/ui-refinement/*`

Entregáveis esperados:

- Proposta de layout.
- Componentes reutilizáveis.
- Checklist de estados: loading, vazio, erro, sucesso.
- Validação mobile/desktop.
- Recomendações de consistência visual.

### 6. Agente Módulos de Negócio

Prioridade: alta.

Função:

Especialista nos fluxos operacionais internos: Comercial, Comercial Admin, Produção, Pós-Vendas, Recrutadora, Profissionais, Prestadoras, Agenda e Clientes.

Quando usar:

- Ao alterar comportamento de um módulo operacional.
- Ao criar automações entre etapas.
- Ao definir colunas, status, filtros e métricas.
- Ao conectar módulos entre si, por exemplo Comercial Admin → Unidade → Produção.

Contexto que deve receber:

- `components/pages/ComercialPage.tsx`
- `components/pages/ComercialAdminPage.tsx`
- `components/pages/ProductionPage.tsx`
- `components/pages/PosVendasPage.tsx`
- `components/pages/RecrutadoraPage.tsx`
- `components/pages/ProfissionaisPage.tsx`
- `components/pages/PrestadorasPage.tsx`
- `services/comercial/*`
- `services/comercial-admin/*`
- `services/production/*`
- `services/posVendas/*`
- `services/recrutadora/*`
- `services/profissionais/*`

Entregáveis esperados:

- Mapa do fluxo de negócio.
- Regras de status.
- Critérios de aceite por tela.
- Pontos de sincronização entre tabelas.

### 7. Agente Integrações e Automações

Prioridade: alta.

Função:

Cuidar de integrações externas, webhooks, N8N, Asaas, InfinitePay, Umbler, WhatsApp/Meta, Typebot e rotas públicas.

Quando usar:

- Ao criar ou alterar webhook.
- Ao depurar falhas de integração.
- Ao alterar Edge Functions.
- Ao mexer em onboarding, cadastro, pagamentos ou mensagens.
- Ao definir payloads entre DromeFlow e automações externas.

Contexto que deve receber:

- `supabase/functions/*/index.ts`
- `services/n8n/n8n.service.ts`
- `services/integration/*.service.ts`
- `services/infinitepay/infinitepay.service.ts`
- `services/financial/financial.service.ts`
- `components/pages/OnboardingPage.tsx`
- `components/pages/RegistrationPage.tsx`
- `components/pages/TypebotPage.tsx`
- `components/pages/UmblerPage.tsx`
- `docs/N8N_LOGS_TABLE.md`
- `docs/SUBDOMINIOS_E_URLS.md`

Entregáveis esperados:

- Contrato de payload.
- Estratégia de retry e logs.
- Checklist de variáveis de ambiente.
- Plano de teste ponta a ponta.

### 8. Agente Realtime e Sincronização

Prioridade: média-alta.

Função:

Garantir que atualizações em tempo real sejam consistentes, performáticas e sem duplicidade visual.

Quando usar:

- Ao adicionar Realtime em uma nova tela.
- Ao corrigir registros que não atualizam sem refresh.
- Ao alterar triggers ligadas a `processed_data`, `pos_vendas`, `agenda_disponibilidade` ou `activity_logs`.
- Ao otimizar filtros de subscription.

Contexto que deve receber:

- `hooks/useRealtimeSubscription.ts`
- `docs/REALTIME_IMPLEMENTATION_GUIDE.md`
- `docs/REALTIME_STATUS.md`
- `components/pages/AppointmentsPage.tsx`
- `components/pages/DashboardSistemaPage.tsx`
- `components/pages/PosVendasPage.tsx`
- `components/agenda/*`

Entregáveis esperados:

- Plano de subscription.
- Filtros server-side/client-side.
- Regras de reconciliação de estado local.
- Checklist Supabase publication.

### 9. Agente QA, Testes e Regressão

Prioridade: alta.

Função:

Criar cenários de teste e validar regressões em fluxos sensíveis.

Quando usar:

- Antes de deploy.
- Depois de mexer em upload, permissões, dashboards ou integrações.
- Ao preparar release.
- Ao investigar bug intermitente.

Contexto que deve receber:

- `package.json`
- `testsprite_tests/*`
- `docs/TUTORIAL_USUARIO.md`
- `docs/MIGRACAO_SERVICOS.md`
- Páginas e serviços afetados pela mudança.

Entregáveis esperados:

- Plano de testes por módulo.
- Checklist de smoke test.
- Casos de borda.
- Matriz de regressão.

### 10. Agente DevOps, Build e Deploy

Prioridade: média.

Função:

Cuidar de build, deploy, PWA, scripts, ambiente, compressão e publicação.

Quando usar:

- Ao alterar Vite, PWA ou deploy.
- Ao resolver problema de cache.
- Ao mexer em scripts de deploy.
- Ao revisar variáveis `.env`.
- Ao investigar diferenças entre dev e produção.

Contexto que deve receber:

- `vite.config.ts`
- `package.json`
- `scripts/deploy.js`
- `scripts/deploy-dev.js`
- `DEPLOY_GUIDE.md`
- `TUTORIAL_COMANDOS_DEPLOY.md`
- `TUTORIAL_COMANDOS_DEPLOY_DEV.md`
- `sync-*.sh`

Entregáveis esperados:

- Procedimento de deploy.
- Diagnóstico de build.
- Checklist de ambiente.
- Plano de rollback.

### 11. Agente Documentação e Onboarding Técnico

Prioridade: média.

Função:

Manter a documentação do projeto alinhada ao código e transformar conhecimento tácito em guias claros.

Quando usar:

- Após criar módulo ou integração.
- Ao consolidar decisões arquiteturais.
- Ao preparar handoff para outro desenvolvedor ou IA.
- Ao atualizar instruções de uso interno.

Contexto que deve receber:

- `README.md`
- `SYSTEM_OVERVIEW.md`
- `REPOSITORY_STRUCTURE.md`
- `docs/*`
- `COMPLEMENTO_COPILOT_INSTRUCTIONS.md`
- `Guia.md`

Entregáveis esperados:

- Documentação técnica.
- Guia operacional.
- Checklist de manutenção.
- Atualização de mapa de arquivos.

### 12. Agente Refatoração e Dívida Técnica

Prioridade: média.

Função:

Atacar dívidas técnicas com segurança, principalmente a limpeza final de compatibilidade de serviços e redução de duplicidades.

Quando usar:

- Ao concluir a Fase 6 da migração de serviços.
- Ao remover dependências legadas.
- Ao quebrar arquivos grandes.
- Ao melhorar tipagem.
- Ao reduzir duplicação em páginas e modais.

Contexto que deve receber:

- `docs/MIGRACAO_SERVICOS.md`
- `services/index.ts`
- `services/mockApi.ts`
- `services/**/*`
- `types.ts`
- Imports dos componentes afetados.

Entregáveis esperados:

- Plano incremental.
- Lista de imports a migrar.
- Estratégia de testes por fase.
- PRs pequenos e reversíveis.

## Configuração Recomendada de Time de Agentes

### Configuração mínima

Use estes agentes para quase qualquer evolução relevante:

1. Agente Arquiteto DromeFlow
2. Agente Supabase e Segurança
3. Agente Dados, Upload e Analytics
4. Agente UI/UX Operacional
5. Agente QA, Testes e Regressão

Essa configuração cobre a maior parte dos riscos do projeto: arquitetura, banco, regras de dados, interface e regressão.

### Configuração ideal

Use estes agentes para desenvolvimento contínuo e personalizado do DromeFlow:

1. Agente Arquiteto DromeFlow
2. Agente Supabase e Segurança
3. Agente Dados, Upload e Analytics
4. Agente Permissões e Multiunidade
5. Agente UI/UX Operacional
6. Agente Módulos de Negócio
7. Agente Integrações e Automações
8. Agente Realtime e Sincronização
9. Agente QA, Testes e Regressão
10. Agente DevOps, Build e Deploy
11. Agente Documentação e Onboarding Técnico
12. Agente Refatoração e Dívida Técnica

## Como Direcionar Cada Solicitação

### Novo módulo interno

Agentes recomendados:

- Arquiteto DromeFlow
- Supabase e Segurança
- Permissões e Multiunidade
- UI/UX Operacional
- QA

Checklist:

- Definir `PageView`.
- Definir registro em `modules`.
- Definir `allowed_profiles`.
- Definir se suporta unidade única ou `ALL`.
- Criar serviço em `services/<dominio>`.
- Criar página em `components/pages`.
- Mapear rota em `ContentArea`.
- Validar permissões em Sidebar/AuthContext.

### Nova métrica ou relatório

Agentes recomendados:

- Dados, Upload e Analytics
- Supabase e Segurança
- UI/UX Operacional
- QA

Checklist:

- Confirmar fonte de verdade.
- Definir período, unidade e comportamento `ALL`.
- Validar diferença entre registros originais e derivados.
- Conferir impacto em dashboard, exportação e modal de detalhe.

### Nova integração externa

Agentes recomendados:

- Integrações e Automações
- Supabase e Segurança
- DevOps
- QA

Checklist:

- Definir payload.
- Definir origem e destino.
- Definir autenticação.
- Definir logs.
- Definir retry/fallback.
- Validar variáveis de ambiente.

### Alteração em permissões

Agentes recomendados:

- Permissões e Multiunidade
- Supabase e Segurança
- Arquiteto DromeFlow
- QA

Checklist:

- Validar role: `super_admin`, `admin`, `user`.
- Validar `unit_modules`.
- Validar `user_modules`.
- Validar comportamento para unidade inativa.
- Validar modo `ALL`.
- Validar RLS.

### Alteração no upload XLSX

Agentes recomendados:

- Dados, Upload e Analytics
- Supabase e Segurança
- QA

Checklist:

- Testar registro novo.
- Testar atualização.
- Testar multiprofissionais.
- Testar repasse dividido.
- Testar status.
- Testar limpeza de obsoletos.
- Testar período e unidade.
- Verificar sincronização com clientes e pós-vendas.

## Prompts Base para Configurar os Agentes

### Prompt base geral

```text
Você é um agente especializado no DromeFlow. Antes de propor alterações, leia a estrutura existente e respeite os padrões locais. O projeto usa React, TypeScript, Vite, Supabase, serviços segmentados por domínio, permissões por unidade e módulos dinâmicos. Evite refatorações amplas sem necessidade. Sempre indique impacto em permissões, banco, UI, Realtime, integrações e testes quando aplicável.
```

### Prompt para Supabase

```text
Você é o agente Supabase do DromeFlow. Sua responsabilidade é banco PostgreSQL, RLS, RPCs, triggers, Edge Functions e segurança. Toda alteração de schema deve vir com migração SQL, impacto em serviços/páginas, plano de rollback e checklist de validação. Considere que o app ainda usa autenticação customizada via profiles e permissões por user_units, user_modules e unit_modules.
```

### Prompt para Upload e Analytics

```text
Você é o agente de Dados, Upload e Analytics do DromeFlow. Sua responsabilidade é proteger a consistência de processed_data, upload XLSX, métricas, clientes, repasse e dashboards. Antes de alterar regras, valide comportamento para unidade única e ALL, registros originais e derivados, multiprofissionais, status, período, atendimento_id e sincronizações com clientes/pós-vendas.
```

### Prompt para UI/UX

```text
Você é o agente UI/UX Operacional do DromeFlow. O sistema é uma ferramenta operacional densa, não uma landing page. Priorize clareza, tabelas escaneáveis, modais eficientes, filtros previsíveis, ícones consistentes, responsividade e estados completos de loading, erro, vazio e sucesso. Siga os padrões visuais existentes em components/ui e pages.
```

### Prompt para QA

```text
Você é o agente QA do DromeFlow. Sua responsabilidade é criar planos de teste objetivos por módulo, focando regressões de permissões, dados, upload, Realtime, integrações, dashboards e deploy. Sempre liste cenários críticos, casos de borda e um smoke test mínimo antes de produção.
```

## Riscos Arquiteturais que os Agentes Devem Vigiar

- Autenticação customizada com senha em `profiles`, que exige cuidado extra até uma migração completa para Supabase Auth.
- RLS permissivo em algumas áreas documentadas como decisão temporária.
- `services/mockApi.ts` e `services/index.ts` ainda ativos por compatibilidade.
- Regras de negócio sensíveis dentro do upload XLSX.
- Diferença entre unidade específica e modo `ALL`.
- Triggers que sincronizam tabelas e podem gerar efeitos colaterais.
- Realtime com risco de duplicidade, filtros incorretos ou updates fora do escopo.
- Integrações externas com payloads e credenciais por unidade.
- `dist/` versionado no repositório, que pode confundir análise de arquivos ativos.

## Ordem Recomendada de Evolução

1. Consolidar um padrão de criação de módulo novo.
2. Finalizar a Fase 6 da migração de serviços, removendo dependência de `mockApi.ts` quando seguro.
3. Fortalecer Supabase Auth/RLS para reduzir riscos da autenticação customizada.
4. Criar uma suíte mínima de testes para upload, permissões e dashboards.
5. Padronizar comportamento `ALL` por módulo.
6. Documentar contratos de integração externa.
7. Criar checklists de release por ambiente.

## Conclusão

O DromeFlow já tem uma estrutura madura e bem segmentada, mas o tamanho funcional do produto pede agentes especializados por domínio. O melhor resultado virá de um conjunto de agentes que respeite a divisão real do sistema: arquitetura, Supabase, dados, permissões, UI operacional, módulos de negócio, integrações, Realtime, QA, DevOps, documentação e dívida técnica.

Para uso diário, a recomendação é começar com a configuração mínima de cinco agentes e acionar os demais conforme o tipo de demanda. Para evolução contínua e personalizada, a configuração ideal com doze agentes oferece cobertura completa dos pontos críticos do projeto.
