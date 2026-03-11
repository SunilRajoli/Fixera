# Fixera Backend — Implementation Summary (Phase 1 to Phase 6)

This document summarizes everything implemented in the Fixera backend from Phase 1 through Phase 6.

---

## Phase 1 — Auth (OTP + JWT)

### Overview
User authentication using phone-based OTP (Twilio SMS) and JWT. No passwords for login; registration creates user and optionally technician profile + wallet.

### Implemented

- **Config & project**
  - `tsconfig.json`, `.sequelizerc`, `.env.example`, `package.json` scripts (dev, build, start, migrate).
  - `src/config/database.js` (Sequelize CLI), `src/config/sequelize.ts` (typed instance).
  - `src/types/index.ts`: enums (`UserRole`, `VerificationStatus`, `BookingStatus`, etc.), `VALID_TRANSITIONS`, `JwtPayload`.

- **Models & migrations**
  - **Migration 1:** `users`, `otp_codes`.
  - **Migration 2:** `technicians`, `services`, `technician_services`, `repair_types`.
  - **Migration 3:** `time_slots`, `bookings`, `jobs`.
  - **Migration 4:** `payments`, `wallets`, `transactions`, `payouts`.
  - **Migration 5:** `disputes`, `reviews`, `notifications`, `technician_locations`.
  - **Migration 6 (Phase 4):** `invoices`.
  - All associations in `src/models/index.ts`.

- **Utilities**
  - `logger.ts` (Winston), `response.ts` (success/error helpers), `AppError.ts`.

- **Middlewares**
  - `errorHandler.ts`, `authenticate.ts` (JWT), `authorize.ts` (role guard).

- **Auth service**
  - **OTP:** `generateOtp()`, `sendOtp(phone)` (Twilio / dev log), `verifyOtp(phone, code)` with attempt limit and expiry.
  - **Auth:** `register(phone, name, role)` (creates User; if TECHNICIAN, creates Technician + Wallet), `login(phone)` (sends OTP), `verifyLogin(phone, code)` (returns user + JWT), `getMe(userId)`.

- **Routes**
  - `POST /api/auth/send-otp`, `POST /api/auth/register`, `POST /api/auth/verify-login`, `GET /api/auth/me` (authenticated).
  - Validation via express-validator (phone, name, role, code).

- **App**
  - Express: CORS, JSON, `GET /health`, `app.use('/api/auth', authRouter)`, error handler last.

---

## Phase 2 — Booking Flow (State Machine)

### Overview
Central state machine for booking status; slot reserve/release; booking and job lifecycle; auto-confirm via BullMQ.

### Implemented

- **State machine**
  - `src/services/booking.state.ts`: `updateBookingStatus(bookingId, newStatus, transaction?)`.
  - Validates transitions via `VALID_TRANSITIONS`, updates status, runs side effects:
    - **ON_THE_WAY:** set technician location tracking.
    - **COMPLETED:** set `job.completed_at`, `auto_confirm_at`, `dispute_window_end`, stop tracking.
    - **CONFIRMED:** wallet credit (locked), Transaction (CREDIT, PENDING, withdrawable_at), fund-release job, invoice.
    - **CANCELLED:** release slot, stop tracking, cancellation penalty.
    - **DISPUTED:** create Dispute, notify admin.
    - **FAILED:** release slot, notify customer.
    - **CLOSED:** release slot, review request notification.

- **Cancellation**
  - `src/utils/cancellation.ts`: `calculateCancellationPenalty(booking, cancelledBy, currentStatus)` (inspection fee, technician compensation, platform share).

- **Slot service**
  - `generateSlots(technicianId, date)`, `getAvailableSlots()`, `reserveSlot()`, `releaseSlot()`, `rescheduleSlot()` (atomic with transaction).

- **Booking service**
  - `createBooking()` (validates service/slot, creates booking, reserves slot, sets inspection_fee, then MATCHING).
  - `getBooking()`, `cancelBooking()` (penalty + state machine), `confirmBooking()`, `submitRepairEstimate()`.

- **Job service**
  - `acceptJob()`, `startTravel()`, `startJob()`, `completeJob()`, `getTechnicianJobs(filter)`.

- **Auto-confirm queue**
  - BullMQ: `scheduleAutoConfirm(bookingId, confirmAt)`; worker runs at 48h and, if status still PAYMENT_HELD, calls `updateBookingStatus(CONFIRMED)`.

- **Routes**
  - Bookings: `POST/GET /api/bookings`, `POST /api/bookings/:id/cancel|confirm|estimate`.
  - Jobs: `GET /api/jobs`, `POST /api/jobs/:id/accept|start-travel|start-job|complete`.
  - Slots: `GET /api/slots/:technicianId/:date`, `POST /api/slots/generate`.

---

## Phase 3 — Matching Engine + BullMQ

### Overview
Technician matching by distance (Haversine), rating, acceptance rate, response time; Redis + BullMQ for matching and timeout; admin manual assign.

### Implemented

- **Redis**
  - `src/config/redis.ts`: single IORedis instance for BullMQ and app (e.g. response times, matching keys).

- **Haversine**
  - `src/utils/haversine.ts`: `calculateDistanceKm(lat1, lon1, lat2, lon2)`.

- **Matching service**
  - `findCandidates(booking)`: APPROVED, online, service-capable, not busy at slot time.
  - `scoreAndRank(candidates, booking, scheduledTime)`: peak vs normal weights; distance, rating, acceptance, response-time scores; filter by radius.
  - `notifyTechnician(technicianId, bookingId, attempt)`: Redis pending key, DB notification.
  - `recordResponseTime()`, Redis helpers: `getPendingNotification`, `addAttemptedTechnician`, `getAttemptedTechnicianIds`, `clearMatchingKeys`.

- **Queues & workers**
  - **Matching queue:** `addMatchingJob(bookingId)`; worker loads booking, finds/ranks candidates, skips attempted, creates Job, ASSIGNED, notifies technician, enqueues timeout.
  - **Timeout queue:** 30s delay; if still ASSIGNED, reduce acceptance_rate, REASSIGNING, re-queue matching.
  - **Job service:** `rejectJob()`; in `acceptJob()` cancel timeout, record response time, clear Redis keys.

- **Admin**
  - `manualAssign(bookingId, technicianId)`: FAILED/MATCHING → create Job, ASSIGNED, notify technician.
  - Route: `POST /api/admin/bookings/:id/assign`.

- **Startup**
  - `index.ts`: Redis ping, then start matching, timeout, and auto-confirm workers.

---

## Phase 4 — Wallet + Payments + Payouts

### Overview
Inspection/repair payments, platform commission, GST, invoices, wallet (balance/locked), transactions, payouts and fund release via BullMQ.

### Implemented

- **Schema**
  - Migration: `invoices` (booking_id, customer_id, technician_id, service_charge, gst, total, commission, technician_payout, invoice_number, status).
  - Model `Invoice` and associations.

- **Wallet service**
  - `getWalletBalance(technicianId)`, `getTransactionHistory()` (paginated), `releaseLockedFunds(bookingId)`, `requestWithdrawal()` (checks balance, pending payout, dispute window, then Payout + DEBIT + addPayoutJob).

- **Payment service**
  - `initiateInspectionPayment()`, `initiateRepairPayment()` (GST 18%, capture, invoice).
  - `generateInvoice()` (platform commission 15%, technician payout, invoice number).
  - `processRefund()` (payment REFUNDED, wallet reversal, customer notification).
  - `getInvoice()` (access by role).

- **Queues & workers**
  - **Payout queue/worker:** simulate bank transfer; on success mark PROCESSED and debit COMPLETED; on failure reverse wallet and notify technician + admin.
  - **Fund-release queue/worker:** delayed 72h after CONFIRMED; calls `releaseLockedFunds(bookingId)`.

- **State machine**
  - CONFIRMED: schedule fund-release job, create invoice if missing.

- **Routes**
  - Wallet: `GET /api/wallet/balance|transactions`, `POST /api/wallet/withdraw`.
  - Payments: `POST /api/payments/inspection|repair`, `GET /api/payments/invoice/:bookingId`.
  - Admin: `POST /api/admin/bookings/:id/refund`, `GET /api/admin/payouts`.

- **Admin service**
  - `getPayouts(status?, page, limit)` with technician/user.

---

## Phase 5 — Disputes + Reviews + Admin Dashboard

### Overview
Customer disputes (raise, status, resolve), reviews with rating and fraud checks, notification service, admin stats and technician management.

### Implemented

- **Dispute service**
  - `raiseDispute(bookingId, customerId, reason)`: PAYMENT_HELD/COMPLETED/CONFIRMED, within dispute window, one per booking; transaction: Dispute, DISPUTED, mark CREDIT note, notify admin + technician.
  - `updateDisputeStatus()` (OPEN → UNDER_REVIEW → AWAITING_RESPONSE/RESOLVED/ESCALATED).
  - `resolveDispute()`: REFUND_CUSTOMER (processRefund + wallet reverse), PAY_TECHNICIAN (release to wallet), PARTIAL_SPLIT (validate sum); all notify and set CLOSED.
  - `getDispute()`, `getDisputeList()` (admin, filters, pagination).

- **Review service**
  - `createReview()`: booking CLOSED, one per booking, rating 1–5, IP rate limit (3 in 24h), last-50 reviews for technician rating and total_reviews.
  - `getReview(bookingId)`, `getTechnicianReviews(technicianId, page, limit)` (public).

- **Notification service**
  - `createNotification()`, `getNotifications()`, `markAsRead()`, `markAllAsRead()`.
  - All previous `Notification.create` usages replaced with `createNotification()` (booking.state, job.service, matching.service, payout.worker, payment.service, etc.).

- **Admin dashboard**
  - `getDashboardStats()`: counts for bookings (total, today, by status), revenue (collected, commission, payouts, pending), technicians (total, active, pending, suspended), customers (total, new today), disputes (open, under review, resolved).
  - `getTechnicianPerformance(page, limit)`: technicians with user, wallet, job counts, ordered by rating.

- **Admin technician management**
  - `verifyTechnician(technicianId, status, adminNote)`: APPROVED → ensure wallet, notify; REJECTED → notify.
  - `toggleTechnicianStatus(technicianId, isActive)`: set user.is_active, notify if deactivated.

- **Routes**
  - Disputes: `POST /api/disputes`, `GET /api/disputes`, `GET/PATCH /api/disputes/:id`, `POST /api/disputes/:id/resolve`.
  - Reviews: `POST /api/reviews`, `GET /api/reviews/booking/:bookingId`, `GET /api/reviews/technician/:technicianId` (public).
  - Notifications: `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all`.
  - Admin: `GET /api/admin/dashboard`, `GET /api/admin/technicians`, `PATCH /api/admin/technicians/:id/verify`, `PATCH /api/admin/technicians/:id/toggle-status`.

---

## Phase 6 — Real-Time (Socket.io)

### Overview
Socket.io on the same HTTP server as Express; JWT auth and role-based namespaces; Redis adapter; handlers and emitter; REST fallback for technician location.

### Implemented

- **Setup**
  - `@socket.io/redis-adapter`: pub/sub via `redis.duplicate()` for scaling.
  - `src/index.ts`: `createServer(app)` → `initSocketServer(httpServer)` → `httpServer.listen(PORT)`.

- **Auth**
  - `src/socket/socket.auth.ts`: read `socket.handshake.auth.token`, verify JWT, set `socket.data.userId`, `role`, `phone`; `next('AUTH_REQUIRED'|'AUTH_INVALID')` on error.

- **Server**
  - `src/socket/socket.server.ts`: Server with CORS, ping timeouts; Redis adapter; namespaces `/customer`, `/technician`, `/admin`; auth + role guard (disconnect if wrong role); connection handlers; export `getIO()`, `getCustomerNsp()`, `getTechnicianNsp()`, `getAdminNsp()`.

- **Rooms**
  - On connect: customer/technician/admin join `user:${userId}`; technician also `technician:${technicianId}`; admin also `admin:room`.
  - Events: `booking:join` → `socket.join('booking:' + bookingId)`.

- **Handlers**
  - **Customer:** `booking:join` (ownership via getBooking), `booking:leave`, `booking:confirm` (service + emit status + wallet), `ping` → `pong`.
  - **Technician:** connect sets `is_online = true`, disconnect sets false; `booking:join`; `job:accept|reject|start-travel|start-job|complete` (call job service, emit status/reassigned); `location:update` (validate lat/lng, Redis cache 60s, DB throttle 15s, emit `technician:location` to booking room); `technician:go-online|go-offline`.
  - **Admin:** `admin:join-booking`, `ping` → `pong`.

- **Emitter**
  - `src/socket/socket.emitter.ts`: `emitBookingStatusChanged()` (to booking room on all namespaces), `emitToUser()`, `emitToTechnician()`, `emitToAdmin()`, `emitToBookingRoom()`, `emitNewDispute()`, `emitNewBookingForMatching()`, `emitJobAssigned()`.
  - Services use lazy `require('../socket/socket.emitter')` to avoid circular deps.

- **Service integration**
  - **booking.state.ts:** After save, emit status; CONFIRMED → emit wallet to technician; DISPUTED → emitNewDispute; FAILED → emitToAdmin('booking:failed').
  - **matching.service.ts:** After notify technician, emitJobAssigned (jobId, bookingId, service, scheduledTime, address).
  - **dispute.service.ts:** After raiseDispute, emitNewDispute and emitToUser(technician, 'dispute:raised').
  - **notification.service.ts:** After createNotification, emitToUser('notification:new').
  - **booking.service.ts:** After createBooking + addMatchingJob, emitNewBookingForMatching.

- **REST fallback**
  - `getTechnicianLocation(bookingId, requesterId, role)`: Redis `location:{technicianId}` then DB; return `{ latitude, longitude, updatedAt, tracking_active }` or null.
  - `GET /api/bookings/:id/technician-location` (CUSTOMER, ADMIN).

---

## Summary Table

| Phase | Focus                     | Main deliverables                                                                 |
|-------|---------------------------|-------------------------------------------------------------------------------------|
| 1     | Auth                      | OTP, JWT, register/login/verify, getMe, models/migrations base, middlewares        |
| 2     | Booking flow              | State machine, slots, booking/job services, auto-confirm queue                    |
| 3     | Matching + BullMQ         | Redis, Haversine, matching + timeout queues, reject, admin manual assign           |
| 4     | Wallet + payments         | Invoice, wallet, payments, refunds, payout + fund-release queues                    |
| 5     | Disputes + reviews + admin| Disputes, reviews, notifications, dashboard, technician verify/toggle              |
| 6     | Real-time                 | Socket.io namespaces, auth, handlers, emitter, service hooks, technician-location API|

---

## Running the backend

1. **Environment:** Copy `.env.example` to `.env`, set DB, Redis, JWT, Twilio (optional for dev).
2. **Database:** Create DB in PostgreSQL; run `npm run migrate`.
3. **Redis:** Must be ≥ 5.0 for BullMQ (e.g. Docker: `docker run -d -p 6379:6379 redis:7`).
4. **Start:** `npm run dev` or `npm run build && npm start`.

All six phases are implemented end-to-end in this codebase.
