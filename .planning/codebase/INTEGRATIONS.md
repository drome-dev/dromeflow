# Codebase Integrations

## Primary Integrations

### Supabase (Backend-as-a-Service)
- **Role**: Main database, authentication, and edge functions.
- **Client**: `@supabase/supabase-js`.
- **Location**: `services/supabaseClient.ts`, `services/auth/`.
- **Features**: Real-time subscriptions, Row Level Security (RLS).

### AWS S3 (Cloud Storage)
- **Role**: Storage for documents, images, and other large assets.
- **Client**: `@aws-sdk/client-s3`.
- **Context**: Used for uploading and retrieving files with pre-signed URLs.

### InfinitePay (Payment Gateway)
- **Role**: Processing payments and financial transactions.
- **Location**: `services/infinitepay/`.

### n8n (Workflow Automation)
- **Role**: Webhook coordination and background process automation.
- **Location**: `services/n8n/`.
- **Context**: Connects the frontend to external workers for data processing.

### Umbler (Infrastructure/API)
- **Role**: Historically used for API or hosting integration (referenced in `umbler-api.json`).

## Secondary & Utility APIs
- **ReceitaWS**: CNPJ lookup and validation (referenced in conversation history).
- **Excel/XLSX**: Ingestion of spreadsheet data via `xlsx` library in `services/ingestion/`.
- **PDF Generation**: client-side PDF creation using `jsPDF`.
