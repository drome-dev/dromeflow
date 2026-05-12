# Codebase Conventions

## General Principles
- **Clean Code**: Prioritize modular, readable, and maintainable code.
- **Single Responsibility**: Each component/service should have one clear purpose.
- **DRY (Don't Repeat Yourself)**: Extract common logic into hooks or utility services.

## TypeScript Guidelines
- **Strict Typing**: Avoid using `any` whenever possible. Use explicit interfaces and types.
- **Location**: Global types in `types.ts` (root) or specific types in `types/` directory.
- **Consistency**: Use `PascalCase` for components/types and `camelCase` for variables/functions.

## Frontend Conventions
- **Functional Components**: Use arrow functions and React Hooks.
- **Styling**: Use **Tailwind CSS 4**. Avoid inline styles or complex CSS modules unless necessary.
- **Icons**: Always use `lucide-react`.

## Backend & API
- **Snake Case**: Database columns and JSON payloads should follow `snake_case` (standardizing from legacy SCREAMING_SNAKE_CASE).
- **Error Handling**: Use `try/catch` blocks for all API calls and external integrations. Never silence critical errors.
- **Environment Variables**: Use `process.env` (via Vite's `import.meta.env`) for all keys and URLs.

## State Management
- **Local State**: Use `useState` for UI-only state.
- **Global State**: Use React Context for shared state across many components.
- **Persistence**: Use Supabase as the source of truth for persistent data.
