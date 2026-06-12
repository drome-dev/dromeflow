# DromeFlow — AI Agent Instructions

SaaS de gestão para franquias de limpeza. React 19 + TypeScript + Vite + Supabase + Tailwind CSS 4.

## Architecture

- **No React Router**: `AppContext.activeView` controls rendering, `ContentArea.tsx` switches on `activeView`. Pages are lazy-loaded. Navigation via `setView('dashboard')`.
- **Custom auth** (no `supabase.auth`): login queries `profiles` table directly (plain text password, MVP). Session persisted in `localStorage`.
- **Permission hierarchy** (unit-based access control):
  - `super_admin` → only modules with `'super_admin'` in `allowed_profiles`
  - `admin` → ALL unit_modules for the unit
  - `user` → intersection of `user_modules ∩ unit_modules`
- **Public subdomain routes** handled at App.tsx before AuthProvider: `cadastro.*`, `landpage.*`, `onboarding.*`, `agenda.*`.
- `@/*` path alias maps to root (`./*`).
- `<React.StrictMode>` + `@tanstack/react-query` wrapper in `index.tsx`.

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev:local` | Dev server `--host 0.0.0.0` (:5173) |
| `npm run build:dev` | Build with `--mode dev` |
| `npm run build:prod` | Build with `--mode production` |
| `npm run deploy:dev` | Build + FTP (port 21) to dev.dromeflow.com |
| `npm run deploy:prod` | Build + SFTP (port 65002) to dromeflow.com |
| `npm run deploy` | **Blocked** (safety, throws error) |
| `npm run lint` | ESLint (no config files found — may fail) |

**No test framework or test scripts exist.** No vitest, jest, or pre-commit hooks.

## Environments

| File | Role | Supabase ref | Domain |
|------|------|-------------|--------|
| `.env.local` | Local dev | `xivgioxraznqshlbgxdj` | localhost |
| `.env.dev` | Validation | `uframhbsgtxckdxttofo` | dev.dromeflow.com |
| `.env.production` | Production | `uframhbsgtxckdxttofo` | dromeflow.com |

- `deploy:dev` reads `.env.dev`, `deploy:prod` reads `.env.production`.
- `.env.*` files are gitignored (via `.env.*` pattern, except `.env.example`).
- `dist/` is **committed** to git (not in `.gitignore`).

## Realtime Golden Rule

**COM Realtime**: NEVER call `loadData()` after CRUD (causes infinite spinner due to double update).
**SEM Realtime**: Keep `loadData()` after save/delete.

Affected modules: Pós-Vendas (`pos_vendas`), Dados/Agendamentos (`processed_data`), Dashboard (multiple tables).

## Upload Pipeline

`services/ingestion/upload.service.ts`:

1. SheetJS reads XLSX in browser
2. Multi-professional expansion (`;` delimiter → suffixed `atendimento_id`)
3. Repasse division
4. Auto STATUS: `"esperar"` only when ALL services that day are "Tarde"
5. Obsolete cleanup by `atendimento_id` base
6. Batch send (500) via RPC `process_xlsx_upload` — upsert key: `(unidade_code, atendimento_id)`
7. STATUS preserved on upsert if professional unchanged; updated if professional changed

**Do not modify** `upload.service.ts`, `UploadModal.tsx`, `processed_data` schema, or the bidirectional trigger (`pos_vendas ↔ processed_data`) without explicit authorization.

## Build

- Bundler: Vite 6.2 with Terser (`drop_console: true` in prod)
- PWA: `vite-plugin-pwa` with Workbox auto-update
- Dual compression: Brotli (`.br`) + Gzip (`.gz`), threshold 10KB
- Code splitting: `vendor-react` + `vendor-supabase` manual chunks

## Database Safety Rule (CRITICAL)

**NUNCA** execute qualquer operação (consulta, migração, alteração) no banco **Dev/Prod** (`uframhbsgtxckdxttofo`) sem solicitação explícita e confirmação do usuário.

Fluxo obrigatório:
1. Tudo é feito **primeiro no Local** (`xivgioxraznqshlbgxdj`)
2. Após confirmado funcionando, migrar para **Dev** (`uframhbsgtxckdxttofo`) para testes
3. Após testes aprovados, enviar para **Production**

O MCP Supabase (`/.opencode/config.json`) DEVE sempre apontar para o **Local** (`xivgioxraznqshlbgxdj`) por padrão. Só alterar para Dev/Prod com autorização explícita.

## OpenCode Config

- MCP Supabase server is enabled (read-only): `.opencode/config.json` aponta para o **banco Local** (`xivgioxraznqshlbgxdj`) por padrão.
- Skill files at `.agents/skills/` for Supabase and Postgres best practices.

## Phase 6 Cleanup (Do Not Remove Yet)

Unused deps awaiting dedicated PR: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `services/index.ts` barrel, `services/mockApi.ts`.

## Conventions

- Pages: `PascalCase + Page.tsx`, Services: `camelCase.service.ts`
- Console logs: `[ComponentName] Action: details` — stripped in prod via Terser
- Tailwind 4, Lucide React icons, no CSS modules
- Business logic in services, not components
