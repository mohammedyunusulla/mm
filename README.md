# Mandi Manager — Digital Record Book

A **multi-tenant SaaS platform** to digitize Indian Mandi (wholesale market) operations — replacing paper ledgers with a modern web & mobile app. Each mandi gets its own isolated database for tracking purchases, sales, expenses, advance payments, and client balances.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MONOREPO (npm workspaces)                    │
│                                                                     │
│  ┌──────────────┐   ┌──────────────────┐   ┌────────────────────┐   │
│  │  @mandi/      │   │  Next.js 15 Web  │   │  Expo Mobile App   │  │
│  │  shared       │◄──┤  Dashboard       │   │  (scaffolded)      │  │
│  │  ─────────    │   │  ──────────────  │   │  ──────────────    │  │
│  │  Types (TS)   │   │  App Router      │   │  Expo Router       │  │
│  │  Zod Schemas  │◄──┤  Tailwind CSS v4 │   │  React Native      │  │
│  └──────┬───────┘   └────────┬─────────┘   └────────────────────┘   │
│         │                    │                                      │
│         ▼                    ▼ REST API (Bearer JWT)                │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Express.js Backend                        │   │
│  │  ──────────────────────────────────────────────────────────  │   │
│  │  JWT Auth │ Zod Validation │ Rate Limiting │ Helmet + CORS   │   │
│  └─────────────────────┬──────────────────────┬─────────────────┘   │
│                         │                      │                    │
│              ┌──────────▼──────┐    ┌──────────▼──────────┐         │
│              │   Master DB     │    │   Tenant DB (×N)     │        │
│              │   ───────────   │    │   ──────────────     │        │
│              │   Tenants       │    │   Users, Clients     │        │
│              │   SuperUsers    │    │   Transactions       │        │
│              │                 │    │   Expenses, Advances │        │
│              └─────────────────┘    └──────────────────────┘        │
│                     PostgreSQL (Prisma ORM)                         │
└─────────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer        | Web (Next.js)        | Mobile (Expo)        | Backend              |
|--------------|----------------------|----------------------|----------------------|
| Language     | TypeScript           | TypeScript           | TypeScript           |
| Framework    | Next.js 15           | Expo 52              | Express 4            |
| Routing      | App Router           | Expo Router          | Express Router       |
| Styling      | Tailwind CSS v4      | NativeWind           | —                    |
| Database     | —                    | —                    | PostgreSQL (Prisma 5)|
| Auth         | JWT (localStorage)   | JWT (SecureStore)    | JWT + bcrypt         |
| Validation   | **@mandi/shared (Zod)** | **@mandi/shared (Zod)** | **@mandi/shared (Zod)** |
| Security     | —                    | —                    | Helmet, CORS, Rate Limit |

## Project Structure

```
V1/
├── package.json                 # npm workspaces root
├── tsconfig.base.json           # Shared TypeScript config
└── src/
    ├── shared/                  # @mandi/shared — types + Zod validation
    │   └── src/
    │       ├── types.ts         # Client, Transaction, Expense, User, etc.
    │       └── validation.ts    # loginSchema, clientSchema, transactionSchema, etc.
    │
    ├── backend/                 # @mandi/backend — Express API server
    │   ├── prisma/
    │   │   ├── master.prisma    # Platform DB: Tenants, SuperUsers
    │   │   └── schema.prisma    # Tenant DB: Users, Clients, Transactions, etc.
    │   └── src/
    │       ├── index.ts         # Express app entry point
    │       ├── seed.ts          # Master DB seed (initial superuser)
    │       ├── lib/
    │       │   ├── masterDb.ts  # Singleton master PrismaClient
    │       │   ├── tenantDb.ts  # Cached per-tenant PrismaClient pool
    │       │   ├── jwt.ts       # JWT sign/verify (tenant + superuser)
    │       │   ├── invoice.ts   # Auto-incrementing invoice numbers
    │       │   └── db.ts        # DB utilities
    │       ├── middleware/
    │       │   ├── auth.ts      # authenticate, requireAdmin, authenticateSuperUser
    │       │   └── validate.ts  # Generic Zod validation middleware
    │       └── routes/
    │           ├── auth.ts      # Login, me, user management
    │           ├── clients.ts   # BUYER/SELLER CRUD
    │           ├── transactions.ts  # Purchase/Sale with line items
    │           ├── advance.ts   # Advance payments + invoice generation
    │           ├── expenses.ts  # Expense CRUD by category
    │           ├── reports.ts   # Dashboard stats + period summaries
    │           └── super.ts     # Superuser: mandi CRUD + provisioning
    │
    └── frontend/
        ├── web/                 # Next.js 15 web dashboard
        │   └── src/
        │       ├── app/
        │       │   ├── login/           # Tenant login (slug + email + password)
        │       │   ├── (app)/
        │       │   │   ├── dashboard/   # Stats cards + recent transactions
        │       │   │   ├── clients/     # Client mgmt + advance payments
        │       │   │   ├── buy-from/    # Purchase transactions
        │       │   │   ├── sell-to/     # Sale transactions
        │       │   │   ├── expenses/    # Expense tracking
        │       │   │   └── reports/     # Period reports
        │       │   └── super-admin/
        │       │       ├── page.tsx      # Superuser login
        │       │       └── mandis/       # Mandi management portal
        │       ├── components/          # Sidebar, Modal, EmptyState, LoadingSpinner
        │       ├── hooks/               # useDebounce
        │       └── lib/
        │           ├── api.ts           # Dual-mode: mock ↔ real API client
        │           └── mock-data.ts     # Dev-time mock data
        │
        └── mobile/              # Expo 52 React Native app (scaffolded)
            └── app/
                ├── login.tsx            # Login screen
                └── (tabs)/
                    ├── dashboard.tsx    # Placeholder
                    ├── clients.tsx      # Placeholder
                    ├── expenses.tsx     # Placeholder
                    └── reports.tsx      # Placeholder
```

---

## Multi-Tenancy Model

Each mandi operates on a **completely isolated database** (database-per-tenant):

```
                    ┌───────────────────────┐
                    │     Master Database    │
                    │  ┌─────────────────┐  │
                    │  │  Tenants table   │  │ slug, name, dbUrl, isActive
                    │  │  SuperUsers      │  │ platform admin accounts
                    │  └─────────────────┘  │
                    └───────────┬───────────┘
                                │ resolves dbUrl per tenant
               ┌────────────────┼────────────────┐
               ▼                ▼                 ▼
     ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
     │  Mandi A DB  │  │  Mandi B DB  │  │  Mandi C DB  │
     │  ──────────  │  │  ──────────  │  │  ──────────  │
     │  Users       │  │  Users       │  │  Users       │
     │  Clients     │  │  Clients     │  │  Clients     │
     │  Transactions│  │  Transactions│  │  Transactions│
     │  Expenses    │  │  Expenses    │  │  Expenses    │
     │  Advances    │  │  Advances    │  │  Advances    │
     └─────────────┘  └─────────────┘  └─────────────┘
```

**Tenant provisioning** (by superuser):
1. Superuser provides a pre-created PostgreSQL database URL
2. Backend runs `prisma db push` to apply the tenant schema
3. An admin user is created in the new tenant DB
4. Tenant is registered in the master DB

---

## Authentication & Authorization Flow

```
┌─────────────────────── TENANT USER LOGIN ──────────────────────────┐
│                                                                     │
│  Client sends: { tenantSlug, email, password }                      │
│       │                                                             │
│       ▼                                                             │
│  Master DB ──► Find tenant by slug ──► Get dbUrl                    │
│       │                                                             │
│       ▼                                                             │
│  Tenant DB ──► Verify email + bcrypt password                       │
│       │                                                             │
│       ▼                                                             │
│  Issue JWT: { userId, tenantId, role: ADMIN | STAFF }               │
│                                                                     │
├─────────────────── AUTHENTICATED API REQUESTS ─────────────────────┤
│                                                                     │
│  Authorization: Bearer <token>                                      │
│       │                                                             │
│       ▼                                                             │
│  auth middleware ──► Verify JWT ──► Master DB (get tenant dbUrl)     │
│       │                                                             │
│       ▼                                                             │
│  Attach req.db (cached tenant PrismaClient) + req.user              │
│       │                                                             │
│       ▼                                                             │
│  Route handler uses req.db for all queries (fully isolated)         │
│                                                                     │
├──────────────────── SUPERUSER LOGIN ───────────────────────────────┤
│                                                                     │
│  Client sends: { email, password }                                  │
│       │                                                             │
│       ▼                                                             │
│  Master DB ──► Verify superuser credentials                         │
│       │                                                             │
│       ▼                                                             │
│  Issue JWT: { superUserId, role: SUPERUSER }                        │
│  (Separate sign/verify functions — cannot cross-authenticate)       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Role-based access:**
- `ADMIN` — Full access: manage users, all CRUD operations
- `STAFF` — Read/write on clients, transactions, expenses (no user management)
- `SUPERUSER` — Platform-level: create/toggle/delete mandis (separate auth chain)

---

## Database Schemas

### Master Database (`master.prisma`)

| Model       | Key Fields                                              |
|-------------|---------------------------------------------------------|
| `Tenant`    | id (uuid), slug (unique), name, dbUrl, adminEmail, isActive |
| `SuperUser` | id (uuid), email (unique), passwordHash                 |

### Tenant Database (`schema.prisma`)

| Model            | Key Fields                                                  |
|------------------|-------------------------------------------------------------|
| `User`           | id, name, email, passwordHash, role (ADMIN/STAFF), isActive |
| `Client`         | id, name, phone, address, type (BUYER/SELLER), balanceDue, advanceBalance |
| `Transaction`    | id, clientId, type (PURCHASE/SALE), totalAmount, paidAmount, balanceDue |
| `TransactionItem`| id, transactionId, itemName, quantity, unit, pricePerUnit, total |
| `AdvancePayment` | id, clientId, invoiceNumber, amount, note, date            |
| `Expense`        | id, category (6 types), amount, description, date          |
| `InvoiceCounter` | yearMonth (PK), counter — atomic upsert for invoice numbering |

**Expense categories:** `LABOUR`, `TRANSPORT`, `RENT`, `UTILITIES`, `MAINTENANCE`, `OTHER`

---

## API Endpoints

### Auth (`/api/auth`) — Rate limited: 20 req / 15 min

| Method | Endpoint              | Auth    | Description                    |
|--------|-----------------------|---------|--------------------------------|
| POST   | `/api/auth/login`     | No      | Login with tenantSlug + creds  |
| GET    | `/api/auth/me`        | Tenant  | Get current user profile       |
| POST   | `/api/auth/users`     | Admin   | Create new user in tenant      |
| GET    | `/api/auth/users`     | Admin   | List all users in tenant       |
| PATCH  | `/api/auth/users/:id` | Admin   | Toggle user active status      |

### Clients (`/api/clients`)

| Method | Endpoint              | Auth    | Description                    |
|--------|-----------------------|---------|--------------------------------|
| GET    | `/api/clients`        | Tenant  | List clients (filter by type, search) |
| POST   | `/api/clients`        | Tenant  | Create client                  |
| PUT    | `/api/clients/:id`    | Tenant  | Update client                  |
| DELETE | `/api/clients/:id`    | Tenant  | Delete client                  |

### Advance Payments (`/api/clients/:clientId/advance`, `/api/advance`)

| Method | Endpoint                          | Auth    | Description                    |
|--------|-----------------------------------|---------|--------------------------------|
| GET    | `/api/clients/:clientId/advance`  | Tenant  | List advances for client       |
| POST   | `/api/clients/:clientId/advance`  | Tenant  | Create advance (auto-invoice)  |
| PUT    | `/api/advance/:id`                | Tenant  | Update advance payment         |
| DELETE | `/api/advance/:id`                | Tenant  | Delete advance payment         |

### Transactions (`/api/transactions`)

| Method | Endpoint                | Auth    | Description                    |
|--------|-------------------------|---------|--------------------------------|
| GET    | `/api/transactions`     | Tenant  | List with filters (type, client, date) |
| POST   | `/api/transactions`     | Tenant  | Create with line items (auto-applies advance) |
| DELETE | `/api/transactions/:id` | Tenant  | Delete transaction             |

### Expenses (`/api/expenses`)

| Method | Endpoint             | Auth    | Description                    |
|--------|----------------------|---------|--------------------------------|
| GET    | `/api/expenses`      | Tenant  | List (filter by category, date)|
| POST   | `/api/expenses`      | Tenant  | Create expense                 |
| PUT    | `/api/expenses/:id`  | Tenant  | Update expense                 |
| DELETE | `/api/expenses/:id`  | Tenant  | Delete expense                 |

### Reports (`/api/reports`)

| Method | Endpoint               | Auth    | Description                    |
|--------|------------------------|---------|--------------------------------|
| GET    | `/api/reports/dashboard`| Tenant | Today's stats + totals         |
| GET    | `/api/reports/summary` | Tenant  | Period summary with profit/loss|

### Super Admin (`/api/super`)

| Method | Endpoint               | Auth       | Description                 |
|--------|------------------------|------------|-----------------------------|
| POST   | `/api/super/login`     | No         | Superuser login             |
| GET    | `/api/super/mandis`    | Superuser  | List all mandis             |
| POST   | `/api/super/mandis`    | Superuser  | Create mandi + provision DB |
| PATCH  | `/api/super/mandis/:id`| Superuser  | Toggle mandi active status  |
| DELETE | `/api/super/mandis/:id`| Superuser  | Delete mandi registry entry |

---

## Pages / Screens

### Web (Next.js)

| Page            | Route           | Description                                         |
|-----------------|-----------------|-----------------------------------------------------|
| Login           | `/login`        | Tenant slug + email/password authentication          |
| Dashboard       | `/dashboard`    | 7 stat cards + recent transactions table             |
| Clients         | `/clients`      | BUYER/SELLER cards with search, add/edit/delete, advance payments with printable invoice |
| Buy From        | `/buy-from`     | Purchase transactions from BUYER clients (multi-item)|
| Sell To         | `/sell-to`      | Sale transactions to SELLER clients (multi-item)     |
| Expenses        | `/expenses`     | Expense tracking by category                         |
| Reports         | `/reports`      | Date-range summary with profit/loss breakdown        |
| Super Admin     | `/super-admin`  | Superuser login portal (dark theme)                  |
| Mandi Management| `/super-admin/mandis` | Create, toggle, delete mandis                  |

### Mobile (Expo) — Scaffolded

| Screen     | Description                        |
|------------|------------------------------------|
| Login      | Email/password (demo creds)        |
| Dashboard  | Placeholder stat cards             |
| Clients    | Placeholder                        |
| Expenses   | Placeholder                        |
| Reports    | Placeholder                        |

---

## Key Features

| Feature                                    | Status             |
|--------------------------------------------|--------------------|
| Multi-tenant isolation (DB per mandi)      | Implemented        |
| Superuser platform management              | Implemented        |
| Tenant provisioning (auto schema push)     | Implemented        |
| JWT auth with role-based access            | Implemented        |
| Client management (BUYER/SELLER)           | Implemented        |
| Purchase/Sale transactions with line items | Implemented        |
| Advance payments with auto-invoice numbers | Implemented        |
| Auto-apply advance balance to transactions | Implemented        |
| Expense tracking with 6 categories         | Implemented        |
| Dashboard analytics (7 stat cards)         | Implemented        |
| Period summary reports with profit/loss    | Implemented        |
| Printable advance payment invoices         | Implemented        |
| Mock data mode for frontend dev            | Implemented        |
| Security: Helmet, CORS, rate limiting      | Implemented        |
| Graceful shutdown with DB cleanup          | Implemented        |
| Mobile app                                 | Scaffolded         |

---

## Getting Started

### Prerequisites

- **Node.js** >= 18
- **npm** >= 9
- **PostgreSQL** (for backend — master DB + one DB per tenant)

### 1. Install dependencies

```bash
cd V1
npm install
```

### 2. Run with mock data (no backend needed)

```bash
npm run dev:web    # Web at http://localhost:3000
```

Login with demo credentials:
- **Email:** `admin@mandi.com`
- **Password:** `admin123`

### 3. Run with real backend

#### a. Set up environment variables

Create `src/backend/.env`:
```env
MASTER_DATABASE_URL=postgresql://user:pass@localhost:5432/mandi_master
JWT_SECRET=your-secret-key
PORT=4000
CORS_ORIGINS=http://localhost:3000
```

#### b. Initialize the master database

```bash
# Generate Prisma clients
npm run dev:api    # or manually:
cd src/backend
npx prisma db push --schema=prisma/master.prisma
npx ts-node src/seed.ts   # Creates superuser: super@mandi.app / changeme123
```

#### c. Start the backend

```bash
npm run dev:api    # API at http://localhost:4000
```

#### d. Switch frontend to real API

Set `NEXT_PUBLIC_USE_MOCK=false` in `src/frontend/web/.env.local`:
```env
NEXT_PUBLIC_USE_MOCK=false
NEXT_PUBLIC_API_URL=http://localhost:4000
```

#### e. Create your first mandi

1. Go to `/super-admin` and login as `super@mandi.app`
2. Create a new mandi (provide a pre-created PostgreSQL database URL)
3. The system will auto-provision the schema and create an admin user
4. Go to `/login`, enter the mandi slug and admin credentials

### 4. Run mobile app

```bash
npm run dev:mobile    # Starts Expo dev server
```

---

## Workspace Scripts

| Script           | Command                     | Description                    |
|------------------|-----------------------------|--------------------------------|
| `dev:web`        | `npm run dev:web`           | Start Next.js dev server       |
| `dev:mobile`     | `npm run dev:mobile`        | Start Expo dev server          |
| `dev:api`        | `npm run dev:api`           | Start Express backend          |
| `build:web`      | `npm run build:web`         | Build Next.js for production   |
| `dev`            | `npm run dev`               | Alias for `dev:web`            |
| DELETE | `/api/expenses/:id`         | Yes  | Delete expense            |
| GET    | `/api/reports/dashboard`    | Yes  | Dashboard stats           |
| GET    | `/api/reports/summary`      | Yes  | Period report with P&L    |

## Database Schema (reference)

- **User** — Admin/Staff accounts
- **Client** — Buyers (buy from) & Sellers (sell to) with balance tracking
- **Transaction** — Purchase/Sale records with line items
- **TransactionItem** — Individual items in a transaction (name, qty, unit, price)
- **Expense** — Categorized expenses (labour, transport, rent, etc.)
