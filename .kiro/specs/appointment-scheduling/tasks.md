# Implementation Plan: Appointment Scheduling

## Overview

This plan implements a medical appointment scheduling REST API using Node.js, TypeScript, Express.js, PostgreSQL, Zod for validation, fast-check for property-based testing, and Jest for unit/integration tests. The implementation follows a layered architecture: API → Validation → Service → Repository → Database.

## Tasks

- [x] 1. Set up project structure and core configuration
  - [x] 1.1 Initialize Node.js project with TypeScript and Express
    - Create `package.json` with dependencies: express, pg, zod, uuid, dotenv
    - Create `tsconfig.json` with strict mode enabled
    - Create `jest.config.ts` with TypeScript support
    - Create project directory structure: `src/`, `src/routes/`, `src/services/`, `src/repositories/`, `src/models/`, `src/validation/`, `src/modules/`, `src/middleware/`, `src/config/`, `tests/`
    - Create `src/app.ts` with Express app setup and global error handler
    - Create `src/server.ts` entry point
    - _Requirements: All (project foundation)_

  - [x] 1.2 Define TypeScript types and interfaces
    - Create `src/models/types.ts` with all entity types: `Doctor`, `Patient`, `Appointment`, `TimeSlot`, `AvailabilityRange`, `AvailabilitySchedule`
    - Create `src/models/enums.ts` with `Specialty`, `AppointmentType`, `AppointmentStatus` types
    - Create `src/models/requests.ts` with `BookingRequest`, `BookingConfirmation`, `DoctorSearchResult`, `OverlapResult`, `CancellationResult`
    - Create `src/models/errors.ts` with `ErrorResponse` interface and error code constants
    - Define `APPOINTMENT_DURATIONS` constant map (`FIRST_VISIT: 60`, `FOLLOW_UP: 30`)
    - _Requirements: 2.4, 2.5, 5.1, 5.4, 7.1, 7.2_

  - [x] 1.3 Create database configuration and connection pool
    - Create `src/config/database.ts` with PostgreSQL connection pool using `pg`
    - Create `.env.example` with database connection variables
    - Create `src/config/index.ts` exporting all configuration
    - _Requirements: All (infrastructure)_

- [x] 2. Database schema and migrations
  - [x] 2.1 Create database migration files
    - Create `migrations/001_create_doctors_table.sql` with `id (UUID PK)`, `name`, `specialty`, `created_at`, `updated_at`
    - Create `migrations/002_create_patients_table.sql` with `id (UUID PK)`, `name`, `email`, `created_at`
    - Create `migrations/003_create_appointments_table.sql` with `id (UUID PK)`, `doctor_id (FK)`, `patient_id (FK)`, `start_time`, `end_time`, `duration_minutes`, `appointment_type`, `status`, `created_at`, `cancelled_at`
    - Create `migrations/004_create_availability_ranges_table.sql` with `id (UUID PK)`, `doctor_id (FK)`, `day_of_week`, `start_time (TIME)`, `end_time (TIME)`
    - Add indexes on `appointments(doctor_id, start_time, status)` and `availability_ranges(doctor_id, day_of_week)`
    - Create `src/config/migrate.ts` script to run migrations
    - _Requirements: 6.1, 7.6_

- [x] 3. Validation layer with Zod schemas
  - [x] 3.1 Create Zod validation schemas
    - Create `src/validation/schemas.ts` with schemas for: `specialtySchema`, `dateQuerySchema` (ISO 8601, not past, not > 90 days future), `bookingRequestSchema`, `cancellationRequestSchema`, `availabilityScheduleSchema`
    - Validate appointment type is `FIRST_VISIT` or `FOLLOW_UP`
    - Validate availability time ranges are in 15-minute increments
    - Validate max 5 ranges per day in availability schedule
    - _Requirements: 1.5, 1.6, 2.6, 6.1, 6.4, 6.6, 7.8_

  - [x] 3.2 Create validation middleware
    - Create `src/middleware/validate.ts` with Express middleware that applies Zod schemas to request body/query
    - Format validation errors into the standard `ErrorResponse` structure
    - _Requirements: 1.5, 1.6, 2.6_

- [x] 4. Repository layer (data access)
  - [x] 4.1 Implement Doctor repository
    - Create `src/repositories/doctor.repository.ts`
    - Implement `searchBySpecialty(specialty: Specialty): Promise<Doctor[]>` with max 50 results
    - Implement `findById(doctorId: string): Promise<Doctor | null>`
    - Implement `getAvailabilityRanges(doctorId: string, dayOfWeek?: number): Promise<AvailabilityRange[]>`
    - Implement `updateAvailability(doctorId: string, ranges: AvailabilityRange[]): Promise<void>` with transaction (delete old + insert new)
    - _Requirements: 1.1, 6.1, 6.2_

  - [x] 4.2 Implement Appointment repository
    - Create `src/repositories/appointment.repository.ts`
    - Implement `findByDoctorAndDateRange(doctorId: string, startDate: Date, endDate: Date): Promise<Appointment[]>` for non-cancelled appointments
    - Implement `findByDoctorForUpdate(doctorId: string, startDate: Date, endDate: Date): Promise<Appointment[]>` with `SELECT ... FOR UPDATE`
    - Implement `create(appointment: Omit<Appointment, 'id' | 'createdAt'>): Promise<Appointment>`
    - Implement `findById(appointmentId: string): Promise<Appointment | null>`
    - Implement `cancel(appointmentId: string): Promise<void>` setting status to cancelled and cancelled_at timestamp
    - _Requirements: 3.1, 3.3, 4.1, 4.3_

- [x] 5. Core business logic modules
  - [x] 5.1 Implement overlap detection module
    - Create `src/modules/overlap-detector.ts`
    - Implement `intervalsOverlap(startA: Date, endA: Date, startB: Date, endB: Date): boolean` using half-open interval comparison `startA < endB && startB < endA`
    - Implement `detectOverlap(existingAppointments: Appointment[], newStart: Date, newEnd: Date): OverlapResult`
    - _Requirements: 3.1, 3.2, 3.5_

  - [x] 5.2 Write property tests for overlap detection
    - **Property 3: Overlap detection correctness**
    - Test that for any two intervals `[startA, endA)` and `[startB, endB)`, overlap is detected if and only if `startA < endB AND startB < endA`
    - Test that adjacent intervals (one ends when other starts) do NOT overlap
    - Create `tests/properties/overlap-detection.property.test.ts`
    - **Validates: Requirements 3.1, 3.2, 3.5**

  - [x] 5.3 Write unit tests for overlap detection
    - Create `tests/unit/overlap-detector.test.ts`
    - Test edge cases: adjacent intervals, same start time, zero-duration, fully contained intervals
    - _Requirements: 3.1, 3.2, 3.5_

  - [x] 5.4 Implement slot calculation module
    - Create `src/modules/slot-calculator.ts`
    - Implement `calculateAvailableSlots(availabilityRanges: AvailabilityRange[], existingAppointments: Appointment[], date: string, duration: number): TimeSlot[]`
    - Subtract booked intervals from availability ranges to find free gaps
    - Generate slot start times at 15-minute increments within qualifying gaps (gap >= duration)
    - Exclude slots whose start time is in the past
    - Ensure no slot's end time exceeds availability boundary
    - _Requirements: 7.3, 7.4, 7.5, 7.7_

  - [x] 5.5 Write property tests for slot calculation
    - **Property 14: Slot calculation respects appointment duration**
    - Test that every returned slot has contiguous free time >= appointment type's duration
    - **Property 15: Generated slots respect availability boundaries**
    - Test that no generated slot's end time exceeds the doctor's availability end boundary
    - Create `tests/properties/slot-calculation.property.test.ts`
    - **Validates: Requirements 7.3, 7.4, 7.5, 7.7**

  - [x] 5.6 Write unit tests for slot calculation
    - Create `tests/unit/slot-calculator.test.ts`
    - Test: empty schedule returns no slots, fully booked returns no slots, partial availability returns correct slots
    - Test 15-minute increment generation, past slot exclusion
    - _Requirements: 7.3, 7.4, 7.5, 7.7_

  - [x] 5.7 Implement cancellation policy module
    - Create `src/modules/cancellation-policy.ts`
    - Implement `canCancel(appointment: Appointment, currentTime: Date): CancellationResult`
    - Allow cancellation only if current time is more than 24 hours before appointment start
    - Reject if appointment is already cancelled or in the past
    - _Requirements: 4.1, 4.2, 4.6, 4.7_

  - [x] 5.8 Write property tests for cancellation policy
    - **Property 5: Cancellation policy enforcement**
    - Test that cancellation is allowed if and only if current time is more than 24 hours before start time
    - Create `tests/properties/cancellation-policy.property.test.ts`
    - **Validates: Requirements 4.1, 4.2**

  - [x] 5.9 Write unit tests for cancellation policy
    - Create `tests/unit/cancellation-policy.test.ts`
    - Test boundary: exactly 24 hours (rejected), 24 hours + 1 minute (allowed)
    - Test already cancelled appointment, past appointment
    - _Requirements: 4.1, 4.2, 4.6, 4.7_

- [x] 6. Checkpoint - Core modules verified
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Service layer
  - [x] 7.1 Implement Doctor service
    - Create `src/services/doctor.service.ts`
    - Implement `searchDoctors(specialty: Specialty, date?: string): Promise<DoctorSearchResult>` — query doctors by specialty, calculate available slots for each, order by earliest slot, limit to 50
    - Implement `updateAvailability(doctorId: string, schedule: AvailabilitySchedule): Promise<AvailabilitySchedule>` — validate no overlapping ranges on same day, persist new schedule
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 7.2 Implement Appointment service
    - Create `src/services/appointment.service.ts`
    - Implement `bookAppointment(request: BookingRequest): Promise<BookingConfirmation>` — validate availability, acquire row lock, check overlap, create appointment, return confirmation
    - Implement `cancelAppointment(appointmentId: string, patientId: string): Promise<void>` — verify ownership, check policy, update status
    - Use database transactions with `SELECT ... FOR UPDATE` for concurrency safety
    - Calculate end time from start time + duration based on appointment type
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.3, 3.4, 4.1, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4_

  - [x] 7.3 Write property tests for booking confirmation and identifiers
    - **Property 8: Booking confirmation completeness**
    - Test that every successful booking returns all required fields (appointmentId, patientName, doctorName, specialty, date, startTime, endTime, appointmentType)
    - **Property 9: Appointment identifier uniqueness**
    - Test that all generated identifiers are unique and at least 8 characters
    - **Property 10: Duration invariant**
    - Test that end time equals start time plus correct duration (60 min for FIRST_VISIT, 30 min for FOLLOW_UP)
    - Create `tests/properties/booking-confirmation.property.test.ts`
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 2.4, 2.5, 7.1, 7.2**

  - [x] 7.4 Write property tests for cancellation authorization and slot restoration
    - **Property 6: Cancellation restores slot availability**
    - Test that after cancellation, the time slot becomes available for new bookings
    - **Property 7: Cancellation authorization**
    - Test that a cancellation request from a different patient is rejected
    - Create `tests/properties/cancellation-policy.property.test.ts` (append to existing or create separate file)
    - **Validates: Requirements 4.3, 4.5**

  - [x] 7.5 Write property test for rejected booking side effects
    - **Property 4: Rejected booking produces no side effects**
    - Test that when a booking is rejected, no appointment data is persisted and existing appointments remain unchanged
    - Add to `tests/properties/overlap-detection.property.test.ts`
    - **Validates: Requirements 3.4**

- [x] 8. API endpoints
  - [x] 8.1 Implement search doctors endpoint
    - Create `src/routes/doctor.routes.ts`
    - Implement `GET /api/doctors/search` with query params: `specialty` (required), `date` (optional)
    - Apply validation middleware for specialty and date
    - Return 200 with doctor list and available slots, or 400 for validation errors
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 8.2 Implement book appointment endpoint
    - Create `src/routes/appointment.routes.ts`
    - Implement `POST /api/appointments` with body: `patientId`, `doctorId`, `startTime`, `appointmentType`
    - Apply validation middleware for booking request
    - Return 201 with confirmation, 409 for conflicts, 400 for validation errors
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.3, 6.3, 6.7, 7.4, 7.5_

  - [x] 8.3 Implement cancel appointment endpoint
    - Implement `POST /api/appointments/:appointmentId/cancel` with body: `patientId`
    - Return 200 for success, 403 for unauthorized, 409 for policy violation, 404 for not found, 400 for already cancelled/past
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [x] 8.4 Implement doctor availability configuration endpoint
    - Implement `PUT /api/doctors/:doctorId/availability` with body: `schedule`
    - Apply validation middleware for availability schedule
    - Return 200 with updated schedule, 400 for validation errors (overlapping ranges, invalid times, max 5 ranges)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 8.5 Wire routes and create main router
    - Create `src/routes/index.ts` combining all route modules
    - Register routes in `src/app.ts`
    - Add global error handling middleware
    - _Requirements: All_

- [x] 9. Checkpoint - API endpoints complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Search and availability property tests
  - [x] 10.1 Write property tests for search results
    - **Property 1: Search results are filtered, bounded, and ordered**
    - Test that results contain at most 50 doctors, all matching requested specialty, each with available slots, ordered by earliest slot
    - **Property 2: Date range validation**
    - Test that dates in the past or more than 90 days in the future are rejected
    - Create `tests/properties/search.property.test.ts`
    - **Validates: Requirements 1.1, 1.2, 1.4, 1.6**

  - [x] 10.2 Write property tests for availability configuration
    - **Property 11: Availability schedule update preserves existing appointments**
    - Test that updating a doctor's schedule does not affect existing confirmed appointments
    - **Property 12: Availability enforcement**
    - Test that bookings outside configured availability or with no schedule are rejected
    - **Property 13: Overlapping availability ranges rejected**
    - Test that overlapping time ranges on the same day are rejected
    - Create `tests/properties/availability.property.test.ts`
    - **Validates: Requirements 6.2, 6.3, 6.5, 6.7**

- [x] 11. Integration tests
  - [x] 11.1 Write integration tests for booking flow
    - Create `tests/integration/booking-flow.test.ts`
    - Test full flow: search doctor → book appointment → verify confirmation
    - Test booking outside availability is rejected
    - Test booking with invalid type is rejected
    - _Requirements: 1.1, 2.1, 2.2, 6.3_

  - [x] 11.2 Write integration tests for cancellation flow
    - Create `tests/integration/cancellation-flow.test.ts`
    - Test successful cancellation and slot re-availability
    - Test cancellation within 24-hour window is rejected
    - Test unauthorized cancellation is rejected
    - _Requirements: 4.1, 4.2, 4.3, 4.5_

  - [x] 11.3 Write integration tests for concurrency
    - Create `tests/integration/concurrency.test.ts`
    - Test concurrent booking attempts for same slot — only one succeeds
    - Verify rejected request produces no side effects
    - _Requirements: 3.3, 3.4_

  - [x] 11.4 Write integration tests for availability configuration
    - Create `tests/integration/availability-config.test.ts`
    - Test schedule update does not affect existing appointments
    - Test overlapping ranges are rejected
    - Test max 5 ranges per day enforcement
    - _Requirements: 6.1, 6.2, 6.4, 6.5_

- [x] 12. Final checkpoint - All tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Integration tests verify end-to-end flows with database interactions
- The system uses `SELECT ... FOR UPDATE` for concurrency control during booking
- All 15 correctness properties from the design are covered across tasks 5.2, 5.5, 5.8, 7.3, 7.4, 7.5, 10.1, and 10.2

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "3.1"] },
    { "id": 3, "tasks": ["3.2", "4.1", "4.2"] },
    { "id": 4, "tasks": ["5.1", "5.4", "5.7"] },
    { "id": 5, "tasks": ["5.2", "5.3", "5.5", "5.6", "5.8", "5.9"] },
    { "id": 6, "tasks": ["7.1", "7.2"] },
    { "id": 7, "tasks": ["7.3", "7.4", "7.5"] },
    { "id": 8, "tasks": ["8.1", "8.2", "8.3", "8.4"] },
    { "id": 9, "tasks": ["8.5"] },
    { "id": 10, "tasks": ["10.1", "10.2"] },
    { "id": 11, "tasks": ["11.1", "11.2", "11.3", "11.4"] }
  ]
}
```
