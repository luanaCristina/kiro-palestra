# Project Structure

```
src/
├── app.ts                  # Express app setup (middleware, routes, error handler)
├── server.ts               # Entry point (dotenv, listen)
├── config/
│   ├── database.ts         # PostgreSQL pool and query helper
│   ├── index.ts            # Config exports
│   └── migrate.ts          # Migration runner
├── middleware/
│   └── validate.ts         # Zod validation middleware factory
├── models/
│   ├── enums.ts            # Domain enums and constants (Specialty, AppointmentType, etc.)
│   ├── errors.ts           # ErrorResponse interface and ERROR_CODES constant
│   ├── requests.ts         # Request/response DTOs (BookingRequest, BookingConfirmation, etc.)
│   ├── types.ts            # Domain entities (Doctor, Patient, Appointment, TimeSlot)
│   └── index.ts            # Barrel export
├── modules/
│   ├── cancellation-policy.ts  # Pure business logic: cancellation rules
│   ├── holidays.ts             # Brazilian holiday calendar
│   ├── overlap-detector.ts     # Pure business logic: time interval overlap
│   └── slot-calculator.ts      # Available slot computation
├── repositories/
│   ├── appointment.repository.ts  # Appointment SQL queries
│   └── doctor.repository.ts       # Doctor SQL queries
├── routes/
│   ├── index.ts                # Route aggregator + inline patient/holiday/availability routes
│   ├── appointment.routes.ts   # POST /api/appointments, POST /api/appointments/:id/cancel
│   └── doctor.routes.ts        # Doctor CRUD + availability config
├── services/
│   ├── appointment.service.ts  # Booking/cancellation orchestration with transactions
│   └── doctor.service.ts       # Doctor business logic
└── validation/                 # (if present) Zod schemas for request validation

tests/
├── unit/               # Unit tests for individual modules and services
├── integration/        # API-level tests with supertest (requires DB)
└── properties/         # Property-based tests with fast-check

migrations/             # Numbered SQL migration files (001_xxx.sql, 002_xxx.sql, ...)
public/                 # Static frontend files served by Express
```

## Architecture Pattern

Layered architecture: **Routes → Services → Repositories → Database**

- **Routes**: HTTP handling, validation middleware, response formatting
- **Services**: Business logic orchestration, transactions, error mapping (throws `AppError`)
- **Repositories**: Raw SQL queries, row-to-entity mapping (snake_case → camelCase)
- **Modules**: Pure business logic functions (no I/O), independently testable
- **Models**: Type definitions, enums, error codes — no logic

## Conventions

- Database columns use `snake_case`; TypeScript uses `camelCase`
- Repositories handle the mapping between the two
- Errors use a structured `{ error: { code, message, details? } }` response format
- Error codes are string constants defined in `models/errors.ts`
- Routes delegate all business logic to services (thin controllers)
- Concurrency is handled via `SELECT ... FOR UPDATE` within transactions
