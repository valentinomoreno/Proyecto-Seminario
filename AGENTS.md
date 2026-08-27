# Repository Guidelines

## Project Structure & Module Organization

This repository is an npm workspace for the Seminario project. Keep source code grouped by application boundary:

- `frontend/` for the React/TypeScript user interface.
- `backend/` for the NestJS API, domain modules, and persistence.
- `docs/` for diagrams, decisions, and functional documentation.
- `backend/test/` for API integration tests and colocated `*.spec.ts` files for unit tests.

Keep business capabilities together (for example, `backend/src/modules/ventas/`) rather than grouping unrelated files by technical type alone.

## Build, Test, and Development Commands

Run the documented root workspace commands:

```powershell
npm install
npm run dev
npm test
npm run build
npm run lint
```

Use `docker compose up -d db`, `npm run db:migration:run`, and `npm run db:seed` to prepare PostgreSQL. Package-specific commands can be run with `--workspace backend` or `--workspace frontend`.

## Coding Style & Naming Conventions

Use TypeScript for application code, 2-space indentation, semicolons, and single quotes unless the configured formatter says otherwise. Use `PascalCase` for React components and classes, `camelCase` for functions and variables, and kebab-case for file names: `registrar-venta.service.ts`. Name NestJS modules by domain, such as `productos.module.ts`.

Add and run formatting/linting tools (for example, Prettier and ESLint) before opening a pull request; configuration files become the source of truth once committed.

## Testing Guidelines

Add unit tests beside the code they verify using `*.spec.ts`. Cover validations and transactional rules, especially stock adjustments, sales, payments, returns, roles, and current-account calculations. Use descriptive test names, e.g. `it('rejects a sale when stock is insufficient')`. Run the relevant test suite before submitting changes.

## Commit & Pull Request Guidelines

The existing history uses a simple `Initial commit` message and establishes no formal convention. Use concise imperative commits, preferably scoped: `feat(ventas): register sale` or `fix(stock): prevent negative quantity`.

Pull requests should explain the change, link the related issue or requirement, list validation performed, and include screenshots for visible UI changes. Keep unrelated refactors out of feature PRs.

## Security & Configuration

Never commit secrets, JWT keys, database credentials, or payment-provider tokens. Commit an `.env.example` with safe placeholder values and document required variables.
