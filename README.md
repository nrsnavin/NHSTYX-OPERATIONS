# NH Styx — Operations Console

The **Admin + Agents** web app for the NH Styx B2B wholesale platform. Staff use it to manage the catalog, process orders, and (soon) manage customers.

**Stack:** React 18 · Vite · TypeScript · Ant Design · TanStack Query · Zustand · Axios · React Router.

---

## Quick start

```bash
npm install
cp .env.example .env       # point VITE_API_URL at the backend
npm run dev                # http://localhost:5173
```

Make sure the [backend](../NH-STYX-BACKEND) is running and seeded. Then sign in with a staff account:

| Role  | Email             | Password   |
|-------|-------------------|------------|
| Admin | admin@nhstyx.com  | `Admin@123` |
| Agent | agent@nhstyx.com  | `Agent@123` |

> Customer accounts are rejected here — they belong in the Flutter customer app.

---

## Scripts

| Script            | Purpose                          |
|-------------------|----------------------------------|
| `npm run dev`     | Start the dev server (HMR)       |
| `npm run build`   | Type-check + production build    |
| `npm run preview` | Preview the production build     |
| `npm run lint`    | Run ESLint                       |

---

## Structure

```
src/
├── main.tsx              # Entry — providers (Query, AntD, Router)
├── App.tsx               # Theme + provider composition
├── api/
│   ├── axios.ts          # Axios instance + auth/refresh interceptors
│   ├── auth.api.ts       # login / me / logout
│   ├── products.api.ts   # product queries (TanStack Query hooks)
│   └── orders.api.ts     # order queries + status mutation
├── store/auth.store.ts   # Zustand auth store (persisted to localStorage)
├── components/ProtectedRoute.tsx  # auth + role gate
├── layouts/DashboardLayout.tsx    # sider + header shell
├── pages/                # Login, Dashboard, Products, Orders, Customers, 404
├── routes/index.tsx      # route table
├── config/env.ts         # VITE_ env access
├── lib/queryClient.ts    # QueryClient config
└── types/index.ts        # shared API types
```

## Notes

- **Auth**: tokens are persisted via Zustand; the Axios response interceptor
  transparently refreshes an expired access token once, then retries the request.
- **Roles**: the console is gated to `ADMIN` and `AGENT`. The sidebar is
  role-aware so the same app serves both audiences.
- **Customers page** is a stub — add a `/customers` endpoint to the backend and
  wire it up.
