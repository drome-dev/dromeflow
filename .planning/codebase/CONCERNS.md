# Codebase Concerns

## Critical Areas (Lockdown)
The following areas are considered **CRITICAL** and sensitive to changes. Proactive or unsolicited modifications are strictly prohibited:
- **Data Ingestion (XLSX)**: `components/ui/UploadModal.tsx` and `services/ingestion/upload.service.ts`.
- **Database Schema**: The `public.processed_data` table and its associated constraints/indexes.

## Technical Debt & Risks
- **Legacy Naming**: Migration from all-caps (`SCREAMING_SNAKE_CASE`) to standard `snake_case` in database schemas is ongoing. Consistency issues may exist.
- **Flat Structure**: The root-level directory organization can become cluttered as the project grows.
- **Testing Coverage**: Lack of automated unit and integration tests increases the risk of regressions in business logic.
- **Edge Function Stability**: History of 503/504 errors in Supabase Edge Functions due to request loops or timeouts (documented in previous maintenance).
- **External Dependencies**: Heavy reliance on n8n workers and external Fleet services that may become orphaned or disconnected.

## Security
- **Row Level Security (RLS)**: Must be strictly enforced in Supabase to prevent unauthorized data access in a multi-tenant/multi-unit environment.
- **Environment Safety**: Credentials and API keys must never be committed to the repository.
