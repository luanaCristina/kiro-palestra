# Implementation Plan: Google Maps Clinic Location

## Overview

This plan implements the clinic location feature following the project's layered architecture (Routes → Services → Repositories → Database). The implementation starts with the database migration and data layer, builds up through the service and route layers, wires everything into the main router, adds the frontend map component, and finishes with comprehensive testing.

## Tasks

- [ ] 1. Database migration and data layer setup
  - [ ] 1.1 Create database migration file `migrations/005_add_clinic_location_columns.sql`
    - Add `clinic_address VARCHAR(500)` nullable column to `doctors` table
    - Add `latitude DECIMAL(10,7)` nullable column to `doctors` table
    - Add `longitude DECIMAL(10,7)` nullable column to `doctors` table
    - Use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for idempotent execution
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ] 1.2 Add `ClinicLocation` interface to `src/models/types.ts` and `INVALID_COORDINATES` error code to `src/models/errors.ts`
    - Define `ClinicLocation` interface with `doctorId`, `address`, `latitude`, `longitude`
    - Add `INVALID_COORDINATES` to the `ERROR_CODES` constant
    - _Requirements: 1.3, 1.4, 1.5, 1.6_

  - [ ] 1.3 Create Zod validation schema in `src/validation/location.schema.ts`
    - Define `locationSchema` with `address` (string, min 1, max 500), `latitude` (number, min -90, max 90), `longitude` (number, min -180, max 180)
    - Export schema for use by route validation middleware
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 2.2, 2.3_

- [ ] 2. Repository and service implementation
  - [ ] 2.1 Add location repository functions to `src/repositories/doctor.repository.ts`
    - Implement `updateLocation(doctorId, address, latitude, longitude)` — UPDATE doctors SET clinic_address, latitude, longitude, updated_at WHERE id
    - Implement `getLocation(doctorId)` — SELECT clinic_address, latitude, longitude FROM doctors WHERE id
    - Map snake_case DB columns to camelCase TypeScript interface
    - _Requirements: 1.1, 2.1, 2.5, 3.1_

  - [ ] 2.2 Create location service at `src/services/location.service.ts`
    - Implement `updateLocation(doctorId, data)` — verify doctor exists, delegate to repository, return ClinicLocation
    - Implement `getLocation(doctorId)` — verify doctor exists, return ClinicLocation or null
    - Throw `DOCTOR_NOT_FOUND` if doctorId does not match any record
    - Follow existing `createServiceError` pattern from doctor.service.ts
    - _Requirements: 2.1, 2.4, 3.1, 3.2, 3.3_

- [ ] 3. Route layer and main router wiring
  - [ ] 3.1 Create location routes at `src/routes/location.routes.ts`
    - Implement `PUT /api/doctors/:doctorId/location` — validate body with locationSchema, call service.updateLocation, return 200 with `{ location }` 
    - Implement `GET /api/doctors/:doctorId/location` — call service.getLocation, return 200 with `{ location }` (or `{ location: null }`)
    - Use existing validate middleware for Zod schema validation
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3_

  - [ ] 3.2 Create config routes at `src/routes/config.routes.ts`
    - Implement `GET /api/config/maps` — read `GOOGLE_MAPS_API_KEY` from `process.env`, return `{ apiKey }` or `{ apiKey: null }`
    - _Requirements: 5.1, 5.3_

  - [ ] 3.3 Register new routes in `src/routes/index.ts`
    - Import and mount location routes under `/api/doctors`
    - Import and mount config routes under `/api/config`
    - _Requirements: 2.1, 3.1, 5.3_

- [ ] 4. Checkpoint - Ensure backend compiles and routes are wired
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Frontend map integration
  - [ ] 5.1 Add map section to `public/index.html` in the Agendamento tab
    - Add `<div id="mapSection">` with address display, loading indicator, map container, and fallback message
    - Implement JavaScript to call `GET /api/doctors/:doctorId/location` when a doctor is selected
    - Implement JavaScript to call `GET /api/config/maps` and dynamically load Google Maps JS API
    - Render map with marker at doctor coordinates and InfoWindow with doctor name + address
    - Handle error states: no location, API key missing, map load failure
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.2_

  - [ ] 5.2 Update `.env.example` with `GOOGLE_MAPS_API_KEY` placeholder
    - Add `GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here` to .env.example
    - _Requirements: 5.1_

- [ ] 6. Checkpoint - Ensure full feature compiles and frontend renders
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Unit and property-based tests
  - [ ]* 7.1 Write unit tests for validation schema in `tests/unit/location-validation.test.ts`
    - Test accepts valid address + coordinates
    - Test rejects missing address, missing latitude/longitude
    - Test rejects out-of-range coordinates
    - Test accepts boundary values (-90, 90, -180, 180)
    - _Requirements: 1.3, 1.4, 1.5, 1.6_

  - [ ]* 7.2 Write unit tests for location service in `tests/unit/location.service.test.ts`
    - Test returns location when doctor has one
    - Test returns null when doctor has no location
    - Test throws DOCTOR_NOT_FOUND for non-existent doctor
    - Test successfully updates location for existing doctor
    - _Requirements: 2.1, 2.4, 3.1, 3.2, 3.3_

  - [ ]* 7.3 Write property test for coordinate validation boundary in `tests/properties/location.property.test.ts`
    - **Property 1: Coordinate validation boundary**
    - Generate random coordinate pairs with fast-check. If lat ∈ [-90, 90] and lng ∈ [-180, 180], schema accepts; otherwise, schema rejects.
    - Minimum 100 iterations
    - **Validates: Requirements 1.3, 1.4, 1.5, 1.6**

  - [ ]* 7.4 Write property test for location data round-trip in `tests/properties/location.property.test.ts`
    - **Property 2: Location data round-trip**
    - Generate random valid location objects (arbitrary non-empty strings for address, valid lat/lng). PUT + GET round-trip preserves data.
    - Minimum 100 iterations
    - **Validates: Requirements 2.1, 3.1**

- [ ] 8. Integration tests
  - [ ]* 8.1 Write integration tests for location API in `tests/integration/location-api.test.ts`
    - Test PUT valid location → 200 + correct response body
    - Test PUT with missing fields → 400 + VALIDATION_ERROR
    - Test PUT with invalid coordinates → 400 + INVALID_COORDINATES
    - Test PUT with non-existent doctorId → 404 + DOCTOR_NOT_FOUND
    - Test GET existing location → 200 + correct data
    - Test GET non-existent doctor → 404 + DOCTOR_NOT_FOUND
    - Test GET doctor without location → 200 + null
    - Test PUT updates `updated_at` timestamp
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3_

  - [ ]* 8.2 Write integration tests for config API in `tests/integration/config-api.test.ts`
    - Test GET /api/config/maps returns API key when env var is set
    - Test GET /api/config/maps returns null when env var is unset
    - _Requirements: 5.1, 5.3_

- [ ] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses TypeScript with Jest, fast-check for property tests, and supertest for integration tests
- All new files follow the existing layered architecture pattern (Routes → Services → Repositories → Database)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "2.1"] },
    { "id": 2, "tasks": ["2.2", "5.2"] },
    { "id": 3, "tasks": ["3.1", "3.2"] },
    { "id": 4, "tasks": ["3.3", "5.1"] },
    { "id": 5, "tasks": ["7.1", "7.2", "7.3"] },
    { "id": 6, "tasks": ["7.4", "8.1", "8.2"] }
  ]
}
```
