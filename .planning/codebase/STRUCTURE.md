# Codebase Structure

The project follows a non-standard React structure where most source folders are located at the root level instead of inside a `src` directory.

## Root Directories
- **`components/`**: UI components, subdivided by feature or shared state.
- **`services/`**: API calls, Supabase integrations, and business logic services.
- **`hooks/`**: Custom React hooks.
- **`contexts/`**: React Context providers for global state management.
- **`types/`**: TypeScript type definitions and interfaces.
- **`constants/`**: Application constants, configuration values, and static data.
- **`supabase/`**: Supabase configuration, migrations, and Edge Functions.
- **`public/`**: Static assets like images, icons, and fonts.
- **`scripts/`**: Automation scripts (deploy, sync, data processing).
- **`docs/`**: Project documentation and guides.
- **`tools/`**: Internal tools and utilities.
- **`migrations/`**: Database migration files.
- **`src/`**: Contains `index.css` and some entry-point files (minimal usage).

## Key Files
- **`index.tsx`**: Main application entry point.
- **`App.tsx`**: Main component and routing logic.
- **`index.html`**: HTML template for Vite.
- **`vite.config.ts`**: Vite and plugin configuration.
- **`tsconfig.json`**: TypeScript configuration.
- **`types.ts`**: Global or shared type definitions (legacy/root level).
- **`package.json`**: Dependencies and project metadata.

## Automation & Sync
- **`sync-*.sh`**: Shell scripts for data synchronization (customers, payments).
- **`match-and-sync.sh`**: Coordination script for data matching.
