# Architecture

```mermaid
flowchart LR
  B[React browser client] -->|JSON and JWT| A[Express REST API]
  A --> V[Zod validation and role middleware]
  V --> S[Domain services]
  S --> P[Prisma ORM]
  P --> D[(PostgreSQL)]
  S -->|optional| O[Local Ollama]
```

The npm monorepo contains `client/` for React/Vite and `server/` for Express and Prisma. The modular monolith keeps deployment straightforward while separating presentation, transport, business logic, validation, and persistence.

Backend directories cover configuration, controllers, routes, services, validation, middleware, and shared utilities. Prisma provides typed repository access. Frontend directories separate pages, reusable components, layouts, API services, hooks, and authentication state.

Passwords use bcrypt with cost 12. Successful login returns a signed JWT containing identity and role. `authenticate` verifies the token and `authorize` enforces roles at the API boundary. Responsive grids move from four or three columns to two and then one; navigation, details, chat, forms, tables, and the admin sidebar each have intentionally designed mobile behavior.
