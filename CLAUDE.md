# OUTLOOK - Project Instructions

> Extends the global `CLAUDE.md` at `/Users/hooncheong/Desktop/git/CLAUDE.md`. General best practices (design exploration, verification workflow, accessibility, modal/tooltip rules) are defined there.

## Project Overview

OUTLOOK is a standalone SaaS product for estimative forecasting and prediction tracking. Analysts register predictions with explicit probability estimates, timeframes, and reasoning. The platform tracks outcomes, scores analyst calibration over time using Brier scores, and generates calibration curves that measure institutional forecasting discipline. Part of the LACE ecosystem.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 20+, TypeScript 5.9, Tailwind CSS 3, Flowbite, Lucide icons, Chart.js |
| Backend | Express 5, tRPC 11, TypeScript 5.9, Drizzle ORM, PostgreSQL 17 |
| Auth | OIDC via Keycloak (JWT + JWKS) |
| Testing | Playwright (E2E), Vitest (unit) |
| Linting | ESLint 9 (flat config), Prettier |
| Build | Angular CLI, tsc |
| Infra | Docker |

## Accent Color

Rose `#fb7185` -- used for branding accents, active states, and product identity.

## Monorepo Structure

```
outlook/
  backend/        # Express + tRPC API server
  frontend/       # Angular web application
```

Each app has its own `package.json` and `node_modules`. Root `package.json` coordinates scripts across all.

## Code Style & Formatting

- **No semicolons** (`semi: false`)
- **Single quotes** (`singleQuote: true`)
- **Trailing commas** (`trailingComma: 'all'`)
- **2-space indentation** (`tabWidth: 2`)
- **No console.log** (use Winston logger in backend)
- **Prettier** for formatting
- **Zod** for runtime validation on all tRPC inputs and config
- **Type inference from tRPC**: derive frontend types from backend router via `RouterInput`/`RouterOutput`

## Frontend Patterns (Angular)

### Components
- **Standalone components** -- no NgModules for components
- Use `input()` and `output()` functions, NOT `@Input/@Output` decorators
- Use `signal()`, `computed()`, `effect()` for reactivity -- prefer signals over RxJS
- Use new template control flow: `@if`, `@for`, `@switch` -- NOT `*ngIf`, `*ngFor`
- Selector convention: `app-{name}` (kebab-case)

### State Management
- **Angular Signals** for local/UI state
- **TanStack Query** (`@tanstack/angular-query-experimental`) for server state
- `injectQuery()` for reads, `injectMutation()` with optimistic updates for writes

### Services
- Use `inject()` function -- NOT constructor injection
- `providedIn: 'root'` for all services

### API Communication
- **tRPC client** with `httpBatchLink`
- `superjson` for serialization
- Bearer token from OIDC in `Authorization` header

### Styling
- **Tailwind CSS** utility classes
- **Flowbite** for pre-built UI components
- Fonts: Inter (body), Montserrat (headings)

### Path Aliases (frontend tsconfig)
```
@app/*        -> src/app/*
@components/* -> src/app/components/*
@models/*     -> src/app/models/*
@services/*   -> src/app/services/*
@shared/*     -> src/app/shared/*
```

## Backend Patterns

### API Routes (tRPC)
- All procedures in `backend/src/trpc/routers/`
- Procedure types: `procedure` (authenticated), `adminProcedure`, `moderatorProcedure`
- Always validate inputs with Zod schemas

### Database (Drizzle ORM)
- Schema in `backend/src/drizzle/schema.ts` -- uses `pgSchema('app')`
- UUID primary keys with `defaultRandom()`
- Migrations: SQL-based in `backend/drizzle/migrations/`

### Authentication
- Keycloak OIDC only (no dual STS mode)
- Three roles: `admin`, `moderator`, `analyst`
- tRPC context carries `ctx.auth`

### Configuration
- YAML-based via `node-config` package (`backend/config/`)
- Zod-validated at startup in `backend/src/utils/cfg.ts`

### Logging
- **Winston** with custom levels: error, warn, info, http, audit, verbose, debug
- Use `logger.info()`, `logger.error()`, etc. -- NEVER `console.log`

## Verification Commands

After implementing any changes, ALWAYS run these checks:

```bash
# 1. Build
cd /Users/hooncheong/Desktop/git/outlook && npm run build

# 2. Lint
cd /Users/hooncheong/Desktop/git/outlook && npm run lint

# 3. Unit Tests
cd /Users/hooncheong/Desktop/git/outlook && npm run test:unit:run

# 4. E2E Tests
cd /Users/hooncheong/Desktop/git/outlook && npm run test:e2e
```

## Port Allocation

| Service | Port |
|---------|------|
| OUTLOOK backend | 3002 |
| OUTLOOK frontend | 4202 |
| PostgreSQL | 5434 (mapped from container 5432) |

## Key File Locations

| Purpose | Path |
|---------|------|
| Root scripts | `package.json` |
| ESLint config | `eslint.config.mjs` |
| Vitest config | `vitest.config.ts` |
| Docker Compose | `docker-compose.yml` |
| Backend entry | `backend/src/app.ts` |
| tRPC routers | `backend/src/trpc/routers/` |
| DB schema | `backend/src/drizzle/schema.ts` |
| Config loader | `backend/src/utils/cfg.ts` |
| Frontend entry | `frontend/src/main.ts` |
| Angular config | `frontend/angular.json` |
| Tailwind config | `frontend/tailwind.config.ts` |
