# Fixera Backend

Backend API and real-time server for **Fixera** — a service booking platform connecting customers with technicians. Built with Node.js, Express, TypeScript, PostgreSQL, Redis, and Socket.io.

## Features

- **Auth** — Phone OTP (Twilio) + JWT; roles: Customer, Technician, Admin
- **Bookings** — State machine (pending → matching → assigned → completed → confirmed/closed); time slots; cancellation rules
- **Matching** — Technician scoring (distance, rating, acceptance, response time); BullMQ queues; 30s response timeout; admin manual assign
- **Payments** — Inspection & repair flows; platform commission; GST; invoices; refunds
- **Wallet** — Technician balance, locked funds, transactions, payouts (BullMQ)
- **Disputes & reviews** — Raise/resolve disputes; customer reviews with rating and IP rate limit
- **Admin** — Dashboard stats; technician verify/toggle; payouts; refunds
- **Real-time** — Socket.io namespaces (`/customer`, `/technician`, `/admin`); JWT auth; booking status, location, notifications

## Tech Stack

| Layer        | Technology                    |
|-------------|-------------------------------|
| Runtime     | Node.js                       |
| Language    | TypeScript                    |
| Framework   | Express 5                     |
| Database    | PostgreSQL + Sequelize 6      |
| Cache/Queue | Redis + BullMQ               |
| Auth        | JWT, Twilio (OTP)            |
| Real-time   | Socket.io + Redis adapter    |

## Prerequisites

- **Node.js** 18+
- **PostgreSQL** 14+
- **Redis** 5.0+ (required for BullMQ)

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/fixera-backend.git
cd fixera-backend
npm install
```

### 2. Environment

Copy the example env and set your values:

```bash
cp .env.example .env
```

Edit `.env`:

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default `3000`) |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | PostgreSQL connection |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | JWT signing |
| `REDIS_HOST`, `REDIS_PORT` | Redis (BullMQ + Socket.io adapter) |
| `TWILIO_*` | Optional; for OTP SMS (dev can log OTP to console) |
| `PLATFORM_COMMISSION_RATE` | e.g. `0.15` (15%) |
| `AUTO_CONFIRM_HOURS`, `DISPUTE_WINDOW_HOURS`, etc. | Business rules |

### 3. Database

Create the database in PostgreSQL, then run migrations:

```bash
npm run migrate
```

### 4. Run

**Development (with reload):**

```bash
npm run dev
```

**Production:**

```bash
npm run build
npm start
```

Server runs at `http://localhost:PORT`. Health check: `GET /health`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with ts-node-dev (watch) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled `dist/index.js` |
| `npm run migrate` | Run Sequelize migrations |
| `npm run migrate:undo` | Undo last migration |
| `npm run migrate:undo:all` | Undo all migrations |

## API Overview

Base URL: `/api`

| Area | Examples |
|------|----------|
| **Auth** | `POST /auth/send-otp`, `POST /auth/register`, `POST /auth/verify-login`, `GET /auth/me` |
| **Bookings** | `POST/GET /bookings`, `POST /bookings/:id/cancel`, `POST /bookings/:id/confirm`, `GET /bookings/:id/technician-location` |
| **Jobs** | `GET /jobs`, `POST /jobs/:id/accept`, `POST /jobs/:id/reject`, `POST /jobs/:id/start-travel`, `POST /jobs/:id/complete` |
| **Slots** | `GET /slots/:technicianId/:date`, `POST /slots/generate` |
| **Wallet** | `GET /wallet/balance`, `GET /wallet/transactions`, `POST /wallet/withdraw` |
| **Payments** | `POST /payments/inspection`, `POST /payments/repair`, `GET /payments/invoice/:bookingId` |
| **Disputes** | `POST /disputes`, `GET /disputes`, `PATCH /disputes/:id/status`, `POST /disputes/:id/resolve` |
| **Reviews** | `POST /reviews`, `GET /reviews/booking/:bookingId`, `GET /reviews/technician/:technicianId` |
| **Notifications** | `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` |
| **Admin** | `POST /admin/bookings/:id/assign`, `POST /admin/bookings/:id/refund`, `GET /admin/payouts`, `GET /admin/dashboard`, `GET /admin/technicians`, `PATCH /admin/technicians/:id/verify`, `PATCH /admin/technicians/:id/toggle-status` |

All relevant routes use `Authorization: Bearer <token>` except public review list and health check.

## Socket.io

Connect to the same host/port with a Socket.io client. Authenticate via handshake auth:

```js
const socket = io('http://localhost:3000/customer', {
  auth: { token: 'YOUR_JWT_TOKEN' }
});
```

Namespaces:

- `/customer` — Customer app (booking join/leave/confirm, ping)
- `/technician` — Technician app (jobs, location updates, go online/offline)
- `/admin` — Admin panel (join booking, ping)

See `IMPLEMENTATION_SUMMARY.md` for event names and payloads.

## Project Structure

```
fixera-backend/
├── src/
│   ├── config/       # Database, Redis
│   ├── types/        # Enums, JwtPayload
│   ├── models/       # Sequelize models + associations
│   ├── migrations/   # Sequelize migrations
│   ├── middlewares/  # Auth, authorize, errorHandler
│   ├── utils/        # Logger, response, AppError, cancellation, haversine
│   ├── services/     # Business logic (auth, booking, job, slot, wallet, payment, etc.)
│   ├── controllers/ # HTTP handlers
│   ├── routes/       # Express routes + validation
│   ├── queues/       # BullMQ queues + workers
│   ├── socket/       # Socket.io auth, server, handlers, emitter
│   ├── app.ts        # Express app
│   └── index.ts      # HTTP server + Socket.io + workers
├── .env.example
├── package.json
├── tsconfig.json
├── IMPLEMENTATION_SUMMARY.md  # Phase 1–6 implementation details
└── README.md
```

## Redis Note

BullMQ requires **Redis 5.0 or higher**. If you see a version error, use a newer Redis (e.g. Docker: `docker run -d -p 6379:6379 redis:7`).

## License

ISC
