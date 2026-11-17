# Smart Inventory System

A React inventory dashboard and Express/MongoDB API for small businesses. It supports item management, stock adjustments, barcode-assisted checkout, low-stock alerts, sales trends, restock estimates, role-based access, and offline sale queuing.

## Requirements

- Node.js 20+
- Docker Desktop for local MongoDB, or a MongoDB Atlas replica set

## Local setup

1. Copy `.env.example` to `backend/.env` (the server also reads a root `.env` as a fallback). Set a random `JWT_SECRET` of at least 32 characters. Keep `.env` private.
2. Start the local MongoDB replica set: `docker compose up -d mongodb`
3. Install dependencies: `npm run install:all`
4. Start the API: `npm run dev:backend`
5. In another terminal, start React: `npm run dev:frontend`
6. Open [http://localhost:5173](http://localhost:5173) and create the first administrator account.

The local database runs as a single-node replica set because sale, inventory, and stock movement changes use MongoDB transactions. For Atlas, configure a replica-set `MONGODB_URI` in `.env`.

To run the production build on one origin, run `npm run build`, then `npm start` and open [http://localhost:3000](http://localhost:3000).

## Project layout

- `frontend/src/components` — navigation, protected routes, reusable UI
- `frontend/src/pages` — login, dashboard, products, sales, movements, reports, team
- `frontend/src/context` and `frontend/src/hooks` — authentication state
- `frontend/src/services` — API client, offline caching and sale sync queue
- `backend/controllers` — business logic for API endpoints
- `backend/routes` — Express route definitions
- `backend/models` — Mongoose models and indexes
- `backend/middleware` — authentication and role checks

## Roles and API

API endpoints are under `/api`; authenticated endpoints use `Authorization: Bearer <token>`.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/setup`, `/auth/register`, `/auth/login` | Initialize a store, register a business, or sign in |
| GET | `/auth/me`, `/auth/setup-status` | Current user and initial setup status |
| GET / POST | `/products` | Search/paginate products (`limit` ≤ 200) or create one |
| PATCH / DELETE | `/products/:id` | Admin-only product edit/removal |
| POST | `/stock/products/:id/adjustments` | Adjust stock and record the reason |
| GET | `/stock/movements` | Stock movement history |
| GET / POST | `/sales` | Recent sales or record a sale |
| POST | `/sales/sync` | Idempotently sync up to 100 offline sales |
| GET | `/reports/dashboard`, `/reports/trends` | Dashboard metrics, sales trends, restock estimates |
| GET / POST / DELETE | `/staff` | Admin-only team management |
| GET | `/health` | MongoDB-backed health check |

Admins can edit/remove products and manage staff. Staff can record sales and make stock adjustments. Barcode scanners that type into the barcode field are supported; camera scanning is not bundled.

## Notes

- Products are tenant-scoped, indexed by business/SKU/barcode, and limited to 100,000 active items per business.
- Sales decrement stock transactionally and use idempotency keys to prevent duplicate offline sync.
- The frontend shell and static assets are cached for offline use. Sales are queued in browser storage; product edits and stock adjustments require a connection.
- Restock estimates use the previous 30-day sales rate and aim for 30 days of stock plus the configured low-stock threshold. They are estimates, not purchase orders.
- For sustained million-transaction-per-day usage, size MongoDB and connection pools for deployment scale, monitor/backup the cluster, and plan sales-data retention. The provided Docker Compose setup is for local development.
- Use HTTPS and secret-managed credentials in production. Browser offline storage is device-local and not encrypted.
