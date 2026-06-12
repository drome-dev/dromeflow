# Agenda Histórico

Esta documentação descreve a tabela **agenda_historico** que registra eventos de agenda para auditoria e histórico.

## Estrutura da Tabela

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | `uuid` (PK) | Identificador único do registro |
| `unit_id` | `uuid` (FK) | Unidade associada |
| `profissional_id` | `uuid` (FK, nullable) | Profissional associado (quando aplicável) |
| `evento_data` | `date` | Data do evento |
| `tipo_evento` | `agenda_event_type` (enum) | Tipo de evento (`DISPONIBILIDADE`, `CANCELAMENTO`, `FALTA`, `ATRASO`, `NAO_AGENDADO`, `ATENDIMENTO`, `DESATIVACAO`) |
| `periodos` | `text[]` (nullable) | Períodos envolvidos (ex.: `["4 horas manhã"]`) |
| `status_manha` | `text` (nullable) | Status da manhã no momento do registro |
| `status_tarde` | `text` (nullable) | Status da tarde no momento do registro |
| `observacao` | `text` (nullable) | Comentário livre, usado em cancelamentos |
| `origem` | `text` | Fonte da inserção (ex.: `TRIGGER_DISPONIBILIDADE`, `PROFISSIONAL_CANCEL`) |
| `created_at` | `timestamptz` | Timestamp de criação |
| `updated_at` | `timestamptz` | Timestamp de atualização |

## Enum `agenda_event_type`

```sql
CREATE TYPE agenda_event_type AS ENUM (
  'DISPONIBILIDADE',
  'CANCELAMENTO',
  'FALTA',
  'ATRASO',
  'NAO_AGENDADO',
  'ATENDIMENTO',
  'DESATIVACAO'
);
```

## Triggers

- **agenda_disponibilidade_insert_trg** – registra `DISPONIBILIDADE` após inserção.
- **agenda_disponibilidade_update_trg** – registra `ATENDIMENTO`, `CANCELAMENTO` ou `NAO_AGENDADO` após atualização.
- **agenda_settings_update_trg** – registra `DESATIVACAO` quando o link da agenda é desativado.
- **processed_data_status_update_trg** – registra `FALTA` ou `ATRASO` em `processed_data`.

## Uso nas Aplicações

- `getHistoricoProfissional(unitId, profissionalId, limit, start?, end?)` – busca histórico via Supabase.
- `cancelDisponibilidade(unitId, profissionalId, data, observacao?)` – registra cancelamento manual.

## Como Aplicar a Migração

```bash
supabase db push   # ou supabase migration apply
```

> **Nota:** Execute a migração em um ambiente de desenvolvimento (`local`) antes de promover para `dev` ou `prod`.
