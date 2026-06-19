# Product Overview

Medical appointment scheduling REST API (called "appointment-scheduling"). It allows patients to book and cancel appointments with doctors across multiple specialties.

## Core Domain

- **Doctors** have availability schedules (time ranges per day of week)
- **Patients** book appointments within available slots
- **Appointments** have types (FIRST_VISIT: 60min, FOLLOW_UP: 30min) and statuses (confirmed, cancelled)

## Key Business Rules

- Appointments must fall within a doctor's configured availability ranges
- Overlapping time slots for the same doctor are prevented via row-level locking
- Cancellations require >24 hours notice (strict inequality — exactly 24h is not allowed)
- Only the owning patient can cancel their appointment
- Brazilian holidays are considered (state-specific)

## Supported Specialties

cardiology, dermatology, neurology, orthopedics, pediatrics, psychiatry, general_practice
