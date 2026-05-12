# Codebase Architecture

## Overview
The project is a Modern Single Page Application (SPA) built with **React 19** and **Vite**, following a **Serverless/BaaS (Backend-as-a-Service)** pattern using **Supabase**.

## Design Patterns
- **Component-Based Architecture**: UI is built with functional components and React Hooks.
- **Service Layer Pattern**: Business logic and API calls are abstracted into the `services/` directory to keep components focused on rendering.
- **Context API for State**: Global application state (Auth, Theme, Multi-unit context) is managed via React Context in the `contexts/` directory.
- **Custom Hooks**: Reusable logic (data fetching, forms, validation) is extracted into `hooks/`.

## Data Flow
1. **Frontend**: React components trigger actions via custom hooks or services.
2. **Services**: Services interact with Supabase (via `supabaseClient.ts`) or external APIs (AWS, n8n).
3. **Database**: Supabase handles PostgreSQL queries, Auth, and Storage.
4. **Real-time**: Real-time updates from Supabase are used to sync UI state across sessions.

## Key Architectures
- **Flat Source Structure**: Unlike standard `src/` layouts, this project promotes top-level visibility for core modules (`components/`, `services/`, etc.).
- **Multi-Unit Management**: The system is designed to handle multiple operational units, likely switching context via a `UnitContext`.
- **Ingestion Pipeline**: A dedicated flow for processing XLSX data into the database via `services/ingestion/`.
