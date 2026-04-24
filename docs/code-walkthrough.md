# Code Walkthrough

This document walks through every layer of the Mandi Manager codebase — from the monorepo root down to individual route handlers and frontend pages.

---

## 1. Monorepo Structure

The project uses **npm workspaces** defined in the root `package.json`:

```
V1/
├── package.json              # Workspace root — orchestrates all packages
├── tsconfig.base.json        # Shared TypeScript compiler options
├── railway.toml              # Railway (backend) deploy config
├── vercel.json               # Vercel (frontend) deploy config
├── .node-version             # Pins Node 20 for CI/CD
└── src/
    ├── backend/              # Express + Prisma API server
    ├── frontend/
    │   ├── web/              # Next.js 15 web app
    │   └── mobile/           # Expo (React Native) — placeholder
    └── shared/               # @mandi/shared — types & Zod schemas
```

Workspace packages:

| Package | Path | Description |
|---------|------|-------------|
| `@mandi/backend` | `src/backend` | Express REST API with Prisma ORM |
| `apps-web` | `src/frontend/web` | Next.js 15 dashboard (App Router) |
| `@mandi/shared` | `src/shared` | Shared TypeScript types and Zod validation schemas |

---

## 2. Shared Package (`src/shared`)

### `src/shared/src/types.ts`

Defines all domain types used by both frontend and backend:

- **`Client`** — buyer or seller with `balanceDue` and `advanceBalance`
- **`Transaction`** — a purchase or sale containing `TransactionItem[]`
- **`Expense`** — categorised operational expense (LABOUR, TRANSPORT, RENT, etc.)
- **`User`** — authenticated user with ADMIN or STAFF role
- **`DashboardStats`** / **`ReportSummary`** — aggregated reporting types

### `src/shared/src/validation.ts`

Zod schemas that validate request payloads:

- `loginSchema` — email + password
- `clientSchema` — name, phone, address, type (BUYER/SELLER)
- `transactionSchema` — clientId, type, items[], paidAmount
- `expenseSchema` — category, amount, description

These schemas are imported by backend middleware for request validation.

---

## 3. Backend (`src/backend`)

### 3.1 Entry Point — `src/backend/src/index.ts`

Sets up the Express application in this order:

1. **`trust proxy`** — enabled for Railway's load balancer
2. **Helmet** — security headers
3. **CORS** — origin allowlist from `ALLOWED_ORIGINS` env var
4. **Rate limiter** — 20 requests per 15 min on auth endpoints
5. **JSON body parser** — 1 MB limit
6. **Health endpoint** — `GET /health` returns `{ status: "ok" }`
7. **Route mounting** — all `/api/*` routes
8. **404 fallback** and **global error handler**
9. **Server start** — connects master DB, listens on `PORT` (default 4000)
10. **Graceful shutdown** — disconnects all DB clients on SIGTERM/SIGINT

### 3.2 Database Layer

#### Master Database — `src/backend/src/lib/masterDb.ts`

A singleton `PrismaClient` connected to `MASTER_DATABASE_URL`. This database holds platform-level data:

- **`Tenant`** — each mandi's metadata (slug, name, `dbUrl`, isActive)
- **`SuperUser`** — platform admin credentials

The master client is generated from `prisma/master.prisma` into `generated/master-client/`.

#### Tenant Database — `src/backend/src/lib/tenantDb.ts`

A connection pool of `PrismaClient` instances, one per tenant DB URL.

```typescript
const clientCache = new Map<string, PrismaClient>();

function getTenantDb(dbUrl: string): PrismaClient {
  if (clientCache.has(dbUrl)) return clientCache.get(dbUrl)!;
  const client = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  clientCache.set(dbUrl, client);
  return client;
}
```

Key behavior:
- **Lazy creation** — clients are created on first request for a tenant
- **Cached** — subsequent requests for the same tenant reuse the connection
- **Shutdown** — `disconnectAllTenantDbs()` closes all cached clients

### 3.3 Prisma Schemas

#### `prisma/master.prisma` (Platform DB)

| Model | Purpose |
|-------|---------|
| `Tenant` | Stores slug, name, `dbUrl`, `adminEmail`, `isActive` |
| `SuperUser` | Platform super-admin credentials |

#### `prisma/schema.prisma` (Tenant DB — one per mandi)

| Model | Purpose |
|-------|---------|
| `User` | Staff accounts with ADMIN/STAFF role |
| `Client` | Buyers and sellers with `balanceDue`, `advanceBalance` |
| `AdvancePayment` | Cash advances given to clients |
| `Transaction` | Purchase or sale records |
| `TransactionItem` | Line items within a transaction |
| `Expense` | Operational expenses by category |

All monetary fields use `Decimal(12,2)` for precision. Indexes on `clientId`, `type`, and `date` for query performance.

### 3.4 Authentication — `src/backend/src/lib/jwt.ts`

Two JWT token types:

| Token | Payload | Usage |
|-------|---------|-------|
| Tenant token | `{ userId, tenantId, role }` | Regular user auth |
| Super token | `{ superUserId, role: "SUPERUSER" }` | Platform admin auth |

Both use the same `JWT_SECRET` and `JWT_EXPIRES_IN` (default 7 days).

### 3.5 Middleware

#### `src/backend/src/middleware/auth.ts`

- **`authenticate`** — Verifies tenant JWT → looks up `Tenant` in master DB → attaches `req.user` and `req.db` (the tenant's Prisma client) to the request
- **`requireAdmin`** — Checks `req.user.role === "ADMIN"`
- **`authenticateSuperUser`** — Verifies super JWT → attaches `req.superUser`

#### `src/backend/src/middleware/validate.ts`

Generic Zod validation middleware:

```typescript
function validate(schema: ZodSchema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      // Return 400 with field-level errors
    }
    req.body = result.data; // Replace with parsed/sanitised data
    next();
  };
}
```

### 3.6 Route Handlers

#### Auth Routes — `src/backend/src/routes/auth.ts`

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/login` | POST | Rate limited | Resolve tenant by slug → verify user credentials → return JWT |
| `/api/auth/me` | GET | Tenant JWT | Return current user info |
| `/api/auth/users` | POST | Admin only | Create staff user |
| `/api/auth/users` | GET | Admin only | List all users |

**Login flow:**
1. Find tenant by `tenantSlug` in master DB
2. Connect to the tenant's DB using `getTenantDb(tenant.dbUrl)`
3. Verify email/password with bcrypt
4. Return JWT containing `{ userId, tenantId, role }`

#### Client Routes — `src/backend/src/routes/clients.ts`

All routes require `authenticate` middleware (tenant JWT).

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/clients` | GET | List clients, filter by `type` and `search` |
| `/api/clients/:id` | GET | Get single client |
| `/api/clients` | POST | Create client |
| `/api/clients/:id` | PUT | Update client |
| `/api/clients/:id` | DELETE | Delete client |

#### Advance Routes — `src/backend/src/routes/advance.ts`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/clients/:clientId/advance` | GET | List advance payments for a client |
| `/api/clients/:clientId/advance` | POST | Add advance payment (updates `advanceBalance`) |
| `/api/advance/:id` | PUT | Update advance payment |
| `/api/advance/:id` | DELETE | Delete advance payment |

#### Transaction Routes — `src/backend/src/routes/transactions.ts`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/transactions` | GET | List transactions, filter by `type` and `clientId` |
| `/api/transactions/:id` | GET | Get transaction with items and client |
| `/api/transactions` | POST | Create transaction (uses DB transaction for atomicity) |

**Transaction creation** is the most complex operation:
1. Calculate `totalAmount` from items
2. Deduct available `advanceBalance` from the client
3. Use a Prisma `$transaction` to atomically create the transaction, its items, and update the client's `balanceDue` and `advanceBalance`

#### Expense Routes — `src/backend/src/routes/expenses.ts`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/expenses` | GET | List expenses, filter by `category`, `from`, `to` |
| `/api/expenses` | POST | Create expense |
| `/api/expenses/:id` | PUT | Update expense |
| `/api/expenses/:id` | DELETE | Delete expense |

#### Report Routes — `src/backend/src/routes/reports.ts`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/reports/dashboard` | GET | Today's stats: purchases, sales, expenses, receivable/payable |
| `/api/reports/summary` | GET | Period summary with profit calculation |

Uses `Promise.all` with Prisma aggregation queries for efficient data fetching.

#### Super Admin Routes — `src/backend/src/routes/super.ts`

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/super/login` | POST | None | Superuser login |
| `/api/super/mandis` | GET | Super JWT | List all mandis |
| `/api/super/mandis` | POST | Super JWT | Create new mandi (provision tenant DB) |
| `/api/super/mandis/:id` | PATCH | Super JWT | Enable/disable mandi |
| `/api/super/mandis/:id` | DELETE | Super JWT | Remove mandi from master DB |

**Mandi provisioning flow:**
1. Validate the provided `dbUrl`
2. Run `prisma db push` against the tenant DB to apply the schema
3. Create the admin user in the tenant DB
4. Register the tenant in the master DB

---

## 4. Frontend Web (`src/frontend/web`)

### 4.1 Framework

- **Next.js 15** with App Router
- **React 18**
- **Tailwind CSS 4** for styling
- **Lucide React** for icons

### 4.2 App Router Layout

```
src/app/
├── layout.tsx          # Root layout (HTML, body, global CSS)
├── page.tsx            # Landing → redirects to /login
├── globals.css         # Tailwind base styles
├── login/
│   └── page.tsx        # Login form (email, password, tenant slug)
├── (app)/
│   ├── layout.tsx      # Dashboard layout with Sidebar
│   ├── dashboard/page.tsx
│   ├── clients/page.tsx
│   ├── buy-from/page.tsx
│   ├── sell-to/page.tsx
│   ├── expenses/page.tsx
│   └── reports/page.tsx
└── super-admin/
    ├── layout.tsx
    ├── page.tsx         # Super admin dashboard
    └── mandis/page.tsx  # Mandi management
```

The `(app)` route group uses a layout with a persistent sidebar navigation.

### 4.3 API Layer — `src/frontend/web/src/lib/api.ts`

The API layer supports two modes controlled by `NEXT_PUBLIC_USE_MOCK`:

- **Mock mode** (`true`, default) — Returns hardcoded data from `mock-data.ts` for offline development
- **Live mode** (`false`) — Makes real `fetch()` calls to the backend at `NEXT_PUBLIC_API_URL`

```typescript
const api = USE_MOCK ? { ...mockApi } : { ...realApi };
```

The real API layer:
- Reads JWT from `localStorage` and sets `Authorization: Bearer` header
- On 401 response, clears the token and redirects to login
- All responses follow the shape `{ success, data?, error? }`

### 4.4 Components

| Component | Purpose |
|-----------|---------|
| `Sidebar` | Navigation sidebar with links to all pages and logout |
| `Modal` | Reusable dialog overlay |
| `EmptyState` | Placeholder when a list is empty |
| `LoadingSpinner` | Centered loading indicator |

### 4.5 Hooks

| Hook | Purpose |
|------|---------|
| `useDebounce` | Debounces a value for search input filtering |

---

## 5. Seed Script — `src/backend/src/seed.ts`

Used for local development to populate the master DB with a superuser and sample tenant.

---

## 6. Key Patterns

### Multi-Tenancy via Request Middleware

Every authenticated request goes through this pipeline:

```
Request → auth middleware → resolve tenant from master DB → attach tenant PrismaClient → route handler
```

Route handlers use `req.db!` — they never know or care about the tenant's connection details.

### Validation at the Boundary

All user input is validated at the API boundary using Zod schemas via the `validate()` middleware. Route handlers can safely destructure `req.body` knowing it conforms to the schema.

### Atomic Balance Updates

Transaction creation uses Prisma's `$transaction` to atomically:
1. Create the transaction record
2. Create all line items
3. Deduct advance balance from the client
4. Update the client's balance due

This prevents inconsistent state if any step fails.
