# Stockroom · Smart Inventory System

A lightweight inventory and sales app for small businesses. It includes a responsive dashboard, product catalogue, barcode-entry sales, low-stock alerts, sales-based restock suggestions, administrator/staff access, and an offline-capable frontend.

## Requirements

- Node.js 20+
- Docker Desktop for the included MongoDB replica set, or a MongoDB Atlas URI

## Run locally

1. Copy `.env.example` to `.env` and set `JWT_SECRET` to a unique random value of at least 32 characters.
2. Start MongoDB: `docker compose up -d mongodb`
3. Install dependencies: `npm install`
4. In one terminal, start the API: `npm run dev`
5. In another terminal, start the React frontend: `npm --prefix frontend run dev`
6. Open [http://localhost:5173](http://localhost:5173). The first visit lets you create the business and its administrator account.

For a single-origin production-style run, build the React frontend with `npm run build`, then start the server with `npm start` and open [http://localhost:3000](http://localhost:3000).

## Deploy the frontend to GitHub Pages

The `main` branch deploys the static frontend through GitHub Actions to [https://pudiyogitha.github.io/Smart_Inventory_System/](https://pudiyogitha.github.io/Smart_Inventory_System/). If Pages has not been enabled for the repository yet, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**. The workflow also needs Actions to be enabled for the repository.

GitHub Pages hosts only the frontend. Login, inventory, and sales need the Node.js API and MongoDB to be deployed separately. Once the API is available, add a repository Actions variable named `VITE_API_URL` with the API origin (for example, `https://inventory-api.example.com`, without `/api`) and configure the API to allow requests from the Pages origin. A new push will rebuild the frontend with that API URL.

Mongoose creates the collections and indexes on startup. The included MongoDB container runs as a single-node replica set because sale, inventory, and stock-movement updates use transactions. To use MongoDB Atlas instead, set `MONGODB_URI` to the Atlas connection string and ensure the cluster supports transactions. The first store can be initialized with the setup endpoint; each new business can also register its own administrator account. Team accounts for an existing business are created by an administrator on the Team page.

## Features

- **Inventory:** Create, search, update, and remove products, with a 100,000-item limit per business. SKU and barcode are unique within each business.
- **Stock tracking:** Record opening quantities and stock adjustments, each with a movement history entry. Sales decrement stock transactionally.
- **Low-stock alerts:** Dashboard alerts show items whose quantity is at or below their reorder threshold.
- **Sales:** Record sales by selecting an item, typing a SKU/name, or scanning a barcode into the barcode field. USB/Bluetooth scanners that type a barcode are supported; a camera-scanning library is not bundled.
- **Restocking:** Reports use each item’s last-30-day sales rate and target 30 days of stock plus its alert threshold. Suggestions are estimates, not purchase orders.
- **Team access:** Admins can add/remove team members and assign admin or staff roles. Staff can record sales and make stock adjustments; product edits/deletion and team administration require an admin.
- **Offline-first interface:** The service worker caches the app shell and static assets. Recent GET responses are cached in the browser, and sales entered offline are queued locally and synced with idempotency keys after reconnection. Product edits and stock adjustments require a connection.
- **Sales history:** Sales are retained with product, staff, quantity, totals, and timestamps for reporting.

## API overview

All endpoints are served from `/api`. Except for health and sign-in/setup, requests require `Authorization: Bearer <token>`.

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET / POST | `/auth/setup-status`, `/auth/setup` | Public, first setup only | Check or initialize the first business |
| POST | `/auth/register` | Public | Register another business and its administrator |
| POST | `/auth/login` | Public | Sign in |
| GET | `/auth/me` | Signed in | Current user |
| GET / POST | `/products` | Signed in | Search/paginate products (`limit` ≤ 200, `offset`) or create products |
| PATCH / DELETE | `/products/:id` | Admin | Edit or remove a product |
| POST | `/products/:id/adjustments` | Signed in | Adjust quantity and record reason |
| GET / POST | `/sales` | Signed in | List or record a sale |
| POST | `/sales/sync` | Signed in | Idempotently sync up to 100 offline sales |
| GET | `/stock/movements` | Signed in | Stock movement history |
| GET | `/reports/dashboard`, `/reports/trends` | Signed in | Dashboard metrics, history, restock estimates |
| GET / POST / DELETE | `/staff` | Admin | Manage team accounts |
| GET | `/health` | Public | Database-backed health check |

## Scaling and production notes

The API is stateless and uses MongoDB transactions, tenant-scoped indexes, and a per-business item counter to enforce the 100,000-item limit safely. Run multiple Node processes behind a load balancer and size `DB_POOL_SIZE` for the total number of app instances and MongoDB connection limits. For sustained million-row-per-day workloads, production operations should also configure MongoDB capacity, backups, monitoring, and an appropriate sales retention/archival strategy. The included Docker Compose setup is for local development, not a production deployment.

Use HTTPS in production; set a strong secret in a secret manager, configure MongoDB TLS/credentials and backups, and serve the frontend/API from the same origin. Browser storage is device-local and is not encrypted; avoid shared/public devices for offline sales.
