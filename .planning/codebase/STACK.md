# Codebase Stack

## Core Technologies
- **Language**: TypeScript (~5.8.2)
- **Frontend Framework**: React (^19.1.1)
- **Build Tool**: Vite (^6.2.0)
- **Package Manager**: npm

## UI & Styling
- **Styling**: Tailwind CSS (^4.1.17) com Vite Plugin
- **Icons**: Lucide React (^0.544.0)
- **Animations**: Framer Motion (^12.38.0)
- **Charts**: ApexCharts (^5.6.0), Recharts (^3.6.0)
- **Notifications**: Sonner (^2.0.7)
- **Drag and Drop**: @hello-pangea/dnd (^18.0.1)

## Backend & Services
- **Backend as a Service**: Supabase (@supabase/supabase-js v2)
- **Cloud Storage**: AWS SDK S3 (^3.932.0)
- **Database**: PostgreSQL (via Supabase)

## Utilities
- **Excel Processing**: SheetJS (xlsx: latest)
- **PDF Generation**: jsPDF (^2.5.1), jsPDF-AutoTable (^5.0.7)
- **ID Generation**: uuid (^13.0.0)
- **Markdown**: React Markdown (^10.1.0), Remark GFM (^4.0.1)

## Environment & Deployment
- **Deployment**: Custom script `scripts/deploy.js` via Node
- **Environment Variables**: `.env.local`, `.env.example`
- **PWA**: vite-plugin-pwa (^1.1.0)
