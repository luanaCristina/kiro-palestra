# Implementation Plan: Test Automation Suite

## Overview

Implementation of a comprehensive test automation suite for the Medical Appointment Scheduling System. The suite covers four layers: test infrastructure setup, backend integration tests (Supertest + PostgreSQL), unit tests for business logic modules, property-based tests (fast-check), and frontend E2E tests (JSDOM + fetch mocking). All code is TypeScript using Jest as the test runner.

## Tasks

- [x] 1. Set up test infrastructure
  - [x] 1.1 Create test database helper (`tests/setup/test-database.ts`)
    - Implement `getTestPool()` that connects to a test PostgreSQL database using `DATABASE_URL` with a test suffix
    - Implement `truncateAllTables()` to clean doctors, patients, appointments, availability_ranges tables between tests
    - Implement `runMigrations()` to apply all SQL migrations from the `migrations/` folder
    - Implement `closePool()` for graceful shutdown
    - _Requirements: 1.1, 2.1, 3.1, 4.1_

  - [x] 1.2 Create test app export (`tests/setup/test-app.ts`)
    - Export the configured Express `app` instance from `src/app.ts` without calling `listen()`
    - Ensure the app uses the test database pool connection
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_

  - [x] 1.3 Create test factories (`tests/setup/test-factories.ts`)
    - Implement `createTestDoctor(overrides?)` that inserts a doctor and returns `TestDoctor`
    - Implement `createTestPatient(overrides?)` that inserts a patient and returns `TestPatient`
    - Implement `createTestAppointment(overrides?)` that inserts an appointment and returns `TestAppointment`
    - Implement `createTestAvailabilityRange(doctorId, overrides?)` that inserts an availability range
    - All factories use the test database pool
    - _Requirements: 1.1, 2.1, 3.1, 4.1_

  - [x] 1.4 Create Jest global setup (`tests/setup/jest.setup.ts`)
    - Configure `beforeAll` to run migrations on the test database
    - Configure `afterAll` to close the database pool
    - Set `jest.setTimeout(15000)` for integration tests
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_

  - [x] 1.5 Update `jest.config.ts` to include setup file and configure projects
    - Add `globalSetup` or `setupFilesAfterFramework` pointing to `tests/setup/jest.setup.ts`
    - Ensure `testMatch` includes `tests/**/*.test.ts` and `tests/**/*.property.test.ts`
    - _Requirements: 1.1_

- [x] 2. Checkpoint - Verify infrastructure
  - Ensure test infrastructure compiles and connects to the test database. Ask the user if questions arise.

- [x] 3. Implement integration tests for Doctors API
  - [x] 3.1 Create `tests/integration/doctors.test.ts`
    - Test POST /api/doctors with valid name and specialty returns 201 with doctor object
    - Test POST /api/doctors without name or specialty returns 400 with VALIDATION_ERROR
    - Test GET /api/doctors/all returns 200 with ordered doctor list
    - Test GET /api/doctors?specialty=cardiology returns 200 with filtered doctors
    - Test GET /api/doctors with invalid specialty returns 400 with INVALID_SPECIALTY
    - Test GET /api/doctors with invalid date returns 400 with INVALID_DATE_RANGE
    - Test PUT /api/doctors/:doctorId/availability with valid schedule returns 200
    - Test PUT /api/doctors/:doctorId/availability with >5 ranges returns 400 TOO_MANY_RANGES
    - Test PUT /api/doctors/:doctorId/availability with overlapping ranges returns 400 OVERLAPPING_RANGES
    - Test PUT /api/doctors/:doctorId/availability with invalid time range returns 400 INVALID_TIME_RANGE
    - Test PUT /api/doctors/:doctorId/availability with non-existent doctor returns 404 DOCTOR_NOT_FOUND
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11_

- [x] 4. Implement integration tests for Patients API
  - [x] 4.1 Create `tests/integration/patients.test.ts`
    - Test POST /api/patients with valid name and email returns 201 with patient object
    - Test POST /api/patients without name or email returns 400 with VALIDATION_ERROR
    - Test GET /api/patients returns 200 with ordered patient list
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 5. Implement integration tests for Appointments API
  - [x] 5.1 Create `tests/integration/appointments.test.ts`
    - Test POST /api/appointments with valid booking returns 201 with confirmation
    - Test POST /api/appointments with invalid UUID returns 400
    - Test POST /api/appointments with invalid appointmentType returns 400
    - Test POST /api/appointments for occupied slot returns 409 SLOT_UNAVAILABLE
    - Test POST /api/appointments outside availability returns 409 OUTSIDE_AVAILABILITY / NO_AVAILABILITY
    - Test GET /api/appointments returns 200 with ordered appointment list
    - Test POST /api/appointments/:id/cancel with >24h returns 200
    - Test POST /api/appointments/:id/cancel with ≤24h returns 409 CANCELLATION_POLICY
    - Test POST /api/appointments/:id/cancel for already cancelled returns 400 ALREADY_CANCELLED
    - Test POST /api/appointments/:id/cancel with wrong patientId returns 403 UNAUTHORIZED_CANCEL
    - Test POST /api/appointments with non-existent doctorId returns 404 DOCTOR_NOT_FOUND
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11_

- [x] 6. Implement integration tests for Availability API
  - [x] 6.1 Create `tests/integration/availability.test.ts`
    - Test GET /api/availability/:doctorId with ranges returns 200 with ordered ranges
    - Test DELETE /api/availability/:rangeId with existing range returns 200
    - Test DELETE /api/availability/:rangeId with non-existent range returns 404
    - Test PUT /api/availability/:rangeId with valid data returns 200
    - Test PUT /api/availability/:rangeId with non-existent range returns 404
    - Test GET /api/availability/:doctorId without ranges returns 200 with empty array
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 7. Implement integration tests for Holidays API
  - [x] 7.1 Create `tests/integration/holidays.test.ts`
    - Test GET /api/holidays?state=PE returns 200 with national + state holidays
    - Test GET /api/holidays?state=SP&date=2026-01-25 returns isHoliday: true
    - Test GET /api/holidays?state=SP&date=2026-03-10 returns isHoliday: false
    - Test GET /api/holidays without state returns 400 VALIDATION_ERROR
    - Test GET /api/states returns 200 with 27 states ordered by code
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 8. Checkpoint - Integration tests pass
  - Ensure all integration tests pass against the test database. Ask the user if questions arise.

- [x] 9. Implement unit tests for business logic modules
  - [x] 9.1 Create `tests/unit/slot-calculator.test.ts`
    - Test with empty appointments returns all possible slots
    - Test with confirmed appointments excludes occupied intervals
    - Test duration 60 returns slots with exactly 3,600,000ms difference
    - Test duration 30 returns slots with exactly 1,800,000ms difference
    - Test with no matching dayOfWeek returns empty array
    - Test cancelled appointments are ignored
    - Test slot endTime does not exceed availability range endTime
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 9.2 Create `tests/unit/overlap-detector.test.ts`
    - Test partial overlap returns true
    - Test identical intervals returns true
    - Test adjacent intervals returns false
    - Test disjoint intervals returns false
    - Test contained interval returns true
    - Test detectOverlap with conflict returns correct overlappingRange
    - Test detectOverlap with empty list returns hasOverlap: false
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x] 9.3 Create `tests/unit/cancellation-policy.test.ts`
    - Test cancelled appointment returns allowed: false
    - Test past appointment returns allowed: false
    - Test exactly 24h returns allowed: false (strict inequality)
    - Test less than 24h returns allowed: false
    - Test more than 24h returns allowed: true
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 9.4 Create `tests/unit/holidays.test.ts`
    - Test getHolidaysForState("PE") includes national + PE state holidays
    - Test isHoliday("2026-01-01", any) returns Confraternização Universal
    - Test isHoliday("2026-01-25", "SP") returns Aniversário de São Paulo
    - Test isHoliday("2026-01-25", "RJ") returns null
    - Test isHoliday("2026-03-10", any) returns null
    - Test getHolidaysForMonth(2026, 1, "SP") includes Jan holidays
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 10. Implement property-based tests - Shared arbitraries
  - [x] 10.1 Create `tests/property/arbitraries.ts`
    - Implement `arbAvailabilityRange` — generates valid ranges with dayOfWeek 0-6, times in HH:mm at 15-min increments, endTime > startTime
    - Implement `arbAppointmentInRange(range, date, duration)` — generates appointments within a range
    - Implement `arbIntervalPair` — generates two valid half-open intervals [start, end) with end > start
    - Implement `arbValidBookingRequest` — generates valid booking request with UUID v4 IDs
    - Implement `arbInvalidUUID` — generates strings that are not valid UUID v4
    - Implement `arbValidTime15Min` — generates HH:mm strings with minutes in {0,15,30,45}
    - Implement `arbInvalidTime15Min` — generates HH:mm strings with minutes NOT in {0,15,30,45}
    - _Requirements: 10.1, 11.1, 12.1, 13.1_

- [x] 11. Implement property-based tests - Slot Calculator
  - [x] 11.1 Write property test: Slot non-overlap with existing appointments
    - **Property 1: Slot non-overlap with existing appointments**
    - **Validates: Requirements 10.1, 6.2**

  - [x] 11.2 Write property test: Slot duration constancy
    - **Property 2: Slot duration constancy**
    - **Validates: Requirements 10.2, 6.3, 6.4**

  - [x] 11.3 Write property test: Slot containment within availability boundaries
    - **Property 3: Slot containment within availability boundaries**
    - **Validates: Requirements 10.3, 6.7**

  - [x] 11.4 Write property test: Metamorphic — more appointments yield fewer or equal slots
    - **Property 4: Metamorphic — more appointments yield fewer or equal slots**
    - **Validates: Requirements 10.4**

  - [x] 11.5 Write property test: Slot ordering by startTime
    - **Property 5: Slot ordering by startTime**
    - **Validates: Requirements 10.5**

  - [x] 11.6 Write property test: Slot grid alignment to 15-minute increments
    - **Property 6: Slot grid alignment to 15-minute increments**
    - **Validates: Requirements 10.6**

- [x] 12. Implement property-based tests - Overlap Detector
  - [x] 12.1 Write property test: Overlap commutativity
    - **Property 7: Overlap commutativity**
    - **Validates: Requirements 11.1**

  - [x] 12.2 Write property test: Overlap reflexivity
    - **Property 8: Overlap reflexivity**
    - **Validates: Requirements 11.2**

  - [x] 12.3 Write property test: Half-open adjacency non-overlap
    - **Property 9: Half-open adjacency non-overlap**
    - **Validates: Requirements 11.3**

  - [x] 12.4 Write property test: Disjoint intervals non-overlap
    - **Property 10: Disjoint intervals non-overlap**
    - **Validates: Requirements 11.4**

  - [x] 12.5 Write property test: Correct overlap range calculation
    - **Property 11: Correct overlap range calculation**
    - **Validates: Requirements 11.5**

- [x] 13. Implement property-based tests - Cancellation Policy
  - [x] 13.1 Write property test: Cancellation idempotency
    - **Property 12: Cancellation idempotency — cancelled appointments always denied**
    - **Validates: Requirements 12.1, 8.1**

  - [x] 13.2 Write property test: Cancellation permission when >24h
    - **Property 13: Cancellation permission when more than 24 hours before**
    - **Validates: Requirements 12.2, 8.5**

  - [x] 13.3 Write property test: Cancellation denied within 24h window
    - **Property 14: Cancellation denied within 24-hour window (strict inequality)**
    - **Validates: Requirements 12.3, 8.3, 8.4**

  - [x] 13.4 Write property test: Past appointment immutability
    - **Property 15: Past appointment immutability**
    - **Validates: Requirements 12.4, 8.2**

- [x] 14. Implement property-based tests - Zod Schemas
  - [x] 14.1 Write property test: Booking request accepts valid inputs
    - **Property 16: Booking request schema accepts valid inputs**
    - **Validates: Requirements 13.1**

  - [x] 14.2 Write property test: Booking request rejects invalid UUIDs
    - **Property 17: Booking request schema rejects invalid UUIDs**
    - **Validates: Requirements 13.2**

  - [x] 14.3 Write property test: Specialty schema rejects invalid values
    - **Property 18: Specialty schema rejects invalid values**
    - **Validates: Requirements 13.3**

  - [x] 14.4 Write property test: Availability time accepts valid 15-min increments
    - **Property 19: Availability time schema accepts valid 15-minute increments**
    - **Validates: Requirements 13.4**

  - [x] 14.5 Write property test: Availability time rejects invalid increments
    - **Property 20: Availability time schema rejects invalid increments**
    - **Validates: Requirements 13.5**

- [x] 15. Checkpoint - Unit and property tests pass
  - Ensure all unit tests and property-based tests pass. Ask the user if questions arise.

- [x] 16. Implement E2E frontend tests - Setup and helpers
  - [x] 16.1 Create `tests/e2e/helpers/dom-helpers.ts`
    - Implement `loadHTML()` that reads `public/index.html` and sets up JSDOM document
    - Implement `fillInput(selector, value)` for input simulation
    - Implement `clickButton(selector)` for button click simulation
    - Implement `selectOption(selector, value)` for dropdown selection
    - Implement `waitFor(condition, timeout)` for async DOM updates
    - Implement `getTextContent(selector)` for assertion helpers
    - _Requirements: 14.1, 15.1, 16.1, 17.1_

  - [x] 16.2 Create `tests/e2e/helpers/fetch-mock.ts`
    - Implement `mockFetch(routes)` that replaces `global.fetch` with a handler matching URL patterns
    - Implement `resetFetchMock()` to restore original fetch
    - Implement `assertFetchCalledWith(url, options)` for verification
    - Support configurable responses per route with status codes and JSON bodies
    - _Requirements: 14.1, 15.1, 16.1, 17.1_

- [x] 17. Implement E2E frontend tests - Cadastro
  - [x] 17.1 Create `tests/e2e/cadastro.test.ts`
    - Test doctor registration with valid name and specialty shows success
    - Test doctor registration with empty name shows validation error
    - Test patient registration with valid name and email shows success
    - Test patient registration with empty email shows validation error
    - Test form fields are cleared after successful registration
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 18. Implement E2E frontend tests - Disponibilidade
  - [x] 18.1 Create `tests/e2e/disponibilidade.test.ts`
    - Test adding a valid availability range shows success and updates list
    - Test editing a range via modal updates values
    - Test deleting a range with confirmation removes from list
    - Test cancelling delete dialog keeps range intact
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

- [x] 19. Implement E2E frontend tests - Agendamento
  - [x] 19.1 Create `tests/e2e/agendamento.test.ts`
    - Test selecting doctor/date/type displays available slots
    - Test selecting a slot and booking shows confirmation
    - Test no available slots shows informative message
    - Test booking without slot selection shows error
    - _Requirements: 16.1, 16.2, 16.3, 16.4_

- [x] 20. Implement E2E frontend tests - Consultas
  - [x] 20.1 Create `tests/e2e/consultas.test.ts`
    - Test appointment list shows all appointments with details
    - Test cancellation with >24h changes status to Cancelada
    - Test cancellation with ≤24h shows error and keeps Confirmada
    - _Requirements: 17.1, 17.2, 17.3_

- [x] 21. Final checkpoint - All tests pass
  - Ensure all tests pass (integration, unit, property, E2E). Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check with `{ numRuns: 100 }`
- Unit tests validate specific examples and edge cases
- Integration tests run with `--runInBand` against a real PostgreSQL test database
- E2E tests use JSDOM with fetch mocking (no real server needed)
- All test files use TypeScript with the existing Jest + ts-jest configuration

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4", "1.5"] },
    { "id": 2, "tasks": ["3.1", "4.1", "7.1", "9.1", "9.2", "9.3", "9.4", "10.1"] },
    { "id": 3, "tasks": ["5.1", "6.1", "11.1", "11.2", "11.3", "11.4", "11.5", "11.6", "12.1", "12.2", "12.3", "12.4", "12.5"] },
    { "id": 4, "tasks": ["13.1", "13.2", "13.3", "13.4", "14.1", "14.2", "14.3", "14.4", "14.5"] },
    { "id": 5, "tasks": ["16.1", "16.2"] },
    { "id": 6, "tasks": ["17.1", "18.1", "19.1", "20.1"] }
  ]
}
```
