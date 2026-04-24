# Software Architecture

This document describes the high-level software architecture of Mandi Manager — a multi-tenant SaaS platform for agricultural wholesale (mandi) businesses to manage clients, transactions, expenses, and reporting.

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Clients                                 │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐     │
│   │  Web Browser  │  │ Mobile App   │  │  Super Admin UI  │     │
│   │  (Next.js)    │  │ (Expo/RN)    │  │  (Next.js)       │     │
│   └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘     │
└──────────┼─────────────────┼───────────────────┼────────────────┘
           │                 │                   │
           ▼                 ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                     REST API (Express)                           │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌────────────┐ ┌──────────────────┐ │
│  │   Auth   │ │ Clients  │ │Transactions│ │  Super Admin     │ │
│  │  Routes  │ │  Routes  │ │  Routes    │ │  Routes          │ │
│  └────┬─────┘ └────┬─────┘ └─────┬──────┘ └────────┬─────────┘ │
│       │             │             │                  │           │
│  ┌────▼─────────────▼─────────────▼──────┐  ┌───────▼────────┐ │
│  │        Auth Middleware                 │  │  Super Auth    │ │
│  │  (JWT verify → resolve tenant DB)     │  │  Middleware     │ │
│  └────────────────┬──────────────────────┘  └───────┬────────┘ │
│                   │                                  │          │
│  ┌────────────────▼──────────────────────────────────▼────────┐ │
│  │                    Prisma ORM Layer                         │ │
│  │  ┌─────────────┐  ┌──────────────────────────────────┐     │ │
│  │  │  Master DB   │  │  Tenant DB Pool                  │     │ │
│  │  │  (singleton) │  │  Map<dbUrl, PrismaClient>        │     │ │
│  │  └──────┬──────┘  └────────────┬─────────────────────┘     │ │
│  └─────────┼──────────────────────┼───────────────────────────┘ │
└────────────┼──────────────────────┼─────────────────────────────┘
             │                      │
             ▼                      ▼
┌────────────────────┐  ┌────────────────────────────────────────┐
│  Master PostgreSQL │  │         Tenant PostgreSQL DBs          │
│  (tenants, super-  │  │  ┌──────────┐ ┌──────────┐ ┌───────┐ │
│   users)           │  │  │ Mandi A  │ │ Mandi B  │ │  ...  │ │
│                    │  │  └──────────┘ └──────────┘ └───────┘ │
└────────────────────┘  └────────────────────────────────────────┘
```

---

## 2. Architecture Style

The system follows a **layered monolith** architecture:

| Layer | Responsibility |
|-------|---------------|
| **Presentation** | Next.js frontend, Expo mobile app |
| **API** | Express route handlers |
| **Middleware** | Auth, validation, tenant resolution |
| **Data Access** | Prisma ORM with multi-tenant connection pooling |
| **Storage** | PostgreSQL (one master + N tenant databases) |

Communication between frontend and backend is via **REST/JSON** over HTTPS.

---

## 3. Multi-Tenancy Model

Mandi Manager uses a **database-per-tenant** isolation strategy:

```
                    ┌──────────────────────┐
                    │     Master DB        │
                    │                      │
                    │  tenants table:      │
                    │  ┌────────────────┐  │
                    │  │ id             │  │
                    │  │ slug           │  │
                    │  │ name           │  │
                    │  │ dbUrl ─────────┼──┼──► Tenant DB connection string
                    │  │ isActive       │  │
                    │  └────────────────┘  │
                    │                      │
                    │  super_users table   │
                    └──────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                 ▼
     ┌──────────────┐ ┌──────────────┐  ┌──────────────┐
     │  sharma-mandi│ │  gupta-mandi │  │  patel-mandi │
     │  (Tenant DB) │ │  (Tenant DB) │  │  (Tenant DB) │
     │              │ │              │  │              │
     │  users       │ │  users       │  │  users       │
     │  clients     │ │  clients     │  │  clients     │
     │  transactions│ │  transactions│  │  transactions│
     │  expenses    │ │  expenses    │  │  expenses    │
     └──────────────┘ └──────────────┘  └──────────────┘
```

**Benefits:**
- **Complete data isolation** — each mandi's data is in its own database
- **Independent scaling** — heavy tenants can be moved to dedicated DB servers
- **Simple compliance** — deleting a mandi means dropping one database
- **No row-level filtering** — queries don't need `WHERE tenantId = ...`

**Trade-offs:**
- More databases to manage
- Schema migrations must be applied to every tenant DB
- Connection pooling overhead per tenant

### Tenant Resolution Flow

```
1. User sends login request with { email, password, tenantSlug }
2. Backend looks up Tenant by slug in Master DB → gets dbUrl
3. Backend creates/reuses a PrismaClient for that dbUrl
4. JWT is issued containing { userId, tenantId, role }
5. On subsequent requests:
   a. Auth middleware verifies JWT
   b. Looks up Tenant by tenantId in Master DB → gets dbUrl
   c. Attaches tenant PrismaClient to req.db
   d. Route handler uses req.db for all queries
```

---

## 4. Authentication & Authorization

### Token Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   JWT Token Types                         │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Tenant Token (regular users):                           │
│  ┌──────────────────────────────────────────────┐        │
│  │ { userId, tenantId, role: "ADMIN"|"STAFF" }  │        │
│  └──────────────────────────────────────────────┘        │
│                                                          │
│  Super Token (platform admins):                          │
│  ┌──────────────────────────────────────────────┐        │
│  │ { superUserId, role: "SUPERUSER" }            │        │
│  └──────────────────────────────────────────────┘        │
│                                                          │
│  Both signed with JWT_SECRET, expire per JWT_EXPIRES_IN  │
└──────────────────────────────────────────────────────────┘
```

### Role-Based Access Control

| Role | Scope | Permissions |
|------|-------|-------------|
| **SUPERUSER** | Platform | Create/delete mandis, enable/disable tenants |
| **ADMIN** | Tenant | All tenant operations + manage staff users |
| **STAFF** | Tenant | CRUD on clients, transactions, expenses, reports |

### Security Measures

- **Helmet** for HTTP security headers
- **CORS** allowlist (not wildcard in production)
- **Rate limiting** on auth endpoints (20 req/15 min)
- **bcrypt** password hashing (12 rounds)
- **Input validation** via Zod on all endpoints
- **1 MB body limit** to prevent payload abuse

---

## 5. Data Model

### Entity Relationships (Tenant DB)

```
User (ADMIN/STAFF)

Client (BUYER/SELLER)
  │
  ├── AdvancePayment[]     (one-to-many, cascade delete)
  │
  └── Transaction[]        (one-to-many, restrict delete)
        │
        └── TransactionItem[]  (one-to-many, cascade delete)

Expense (standalone)
```

### Key Business Rules

1. **Advance deduction** — When a transaction is created, any available advance balance is automatically deducted from the balance due
2. **Balance tracking** — Client `balanceDue` and `advanceBalance` are updated atomically within a database transaction
3. **Decimal precision** — All monetary values use `Decimal(12,2)` to avoid floating-point errors
4. **Soft delete for tenants** — Mandis can be deactivated via `isActive` flag; actual DB is not dropped on delete

---

## 6. Frontend Architecture

### State Management

The frontend uses **local component state** (React `useState`) — no global state library. Auth tokens are stored in `localStorage`.

### API Abstraction

```
┌─────────────────────────────────────────┐
│              api object                  │
│                                         │
│  USE_MOCK=true  ──►  mockApi            │
│                      (hardcoded data)   │
│                                         │
│  USE_MOCK=false ──►  fetchApi()         │
│                      (real HTTP calls)  │
└─────────────────────────────────────────┘
```

This pattern allows full frontend development without a running backend.

### Page Structure

| Page | Description |
|------|-------------|
| `/login` | Tenant login (email + password + mandi slug) |
| `/dashboard` | Today's stats — purchases, sales, expenses, receivable/payable |
| `/clients` | Client list with search and CRUD |
| `/buy-from` | Create purchase transactions (from sellers) |
| `/sell-to` | Create sale transactions (to buyers) |
| `/expenses` | Expense tracking by category |
| `/reports` | Financial summaries by date range |
| `/super-admin` | Platform admin — mandi management |

---

## 7. Error Handling

All API responses follow a consistent envelope:

```json
// Success
{ "success": true, "data": { ... } }

// Validation error
{ "success": false, "error": "Validation failed", "errors": [{ "field": "email", "message": "Required" }] }

// Auth error
{ "success": false, "error": "Token expired or invalid" }

// Server error
{ "success": false, "error": "Internal server error" }
```

HTTP status codes used: `200`, `201`, `400`, `401`, `403`, `404`, `409`, `422`, `429`, `500`.
