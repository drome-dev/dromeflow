# Codebase Testing

## Current State
The project currently has a minimal testing infrastructure. Testing is primarily focused on backend validation and manual UAT.

## Testing Tools
- **TestSprite**: Used for backend test planning and execution (referenced in `testsprite_tests/`).
- **Manual Verification**: Extensive use of manual checks for frontend UI and Supabase integrations.

## Potential Improvements (Backlog)
- **Unit Testing**: Implementation of **Vitest** for service and hook logic.
- **Component Testing**: Use of **React Testing Library** for core UI components.
- **E2E Testing**: Implementation of **Playwright** for critical user flows (Login, Data Ingestion, Document Generation).

## Continuous Integration
- No automated CI test runner detected in `package.json`. Tests are likely run locally or via manual triggering.
