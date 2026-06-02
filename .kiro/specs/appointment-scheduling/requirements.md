# Requirements Document

## Introduction

This document defines the requirements for a medical appointment scheduling system. The system enables patients to search for doctors by specialty, book appointments in available time slots, and manage their scheduled appointments. It enforces business rules around doctor availability, time slot conflicts, cancellation policies, and appointment duration based on visit type. The system is implemented as a Node.js/TypeScript API.

## Glossary

- **Scheduling_System**: The appointment scheduling API that manages doctor availability, appointment booking, and cancellation operations
- **Patient**: A registered user who searches for doctors and books appointments
- **Doctor**: A medical professional with a configurable availability schedule who receives appointments
- **Appointment**: A scheduled time slot linking a Patient to a Doctor for a specific date, time, and duration
- **Time_Slot**: A discrete block of time within a Doctor's availability during which an Appointment can be booked
- **Availability_Schedule**: A Doctor's configured weekly schedule defining the days and hours during which the Doctor accepts appointments
- **Specialty**: A medical discipline (e.g., cardiology, dermatology) associated with a Doctor
- **First_Visit**: An appointment type for a Patient's initial consultation with a Doctor, requiring a longer duration
- **Follow_Up**: An appointment type for a returning Patient, requiring a shorter duration
- **Cancellation_Policy**: The set of rules governing when and how a Patient may cancel an Appointment
- **Double_Booking**: A conflict state where two Appointments overlap in time for the same Doctor

## Requirements

### Requirement 1: Search for Available Doctors

**User Story:** As a Patient, I want to search for available doctors by specialty and date, so that I can find a suitable doctor for my medical needs.

#### Acceptance Criteria

1. WHEN a Patient searches by specialty, THE Scheduling_System SHALL return a maximum of 50 Doctors matching the specified Specialty, ordered by earliest available Time_Slot
2. WHEN a Patient searches by specialty and date, THE Scheduling_System SHALL return only Doctors who have at least one available Time_Slot on the specified date, where an available Time_Slot is one that is not already booked and has a start time in the future
3. WHEN no Doctors match the search criteria, THE Scheduling_System SHALL return an empty result set with a message indicating that no doctors were found for the selected specialty and date combination
4. WHEN search results are returned for a specified date, THE Scheduling_System SHALL include each Doctor's available Time_Slots for that date in the results
5. WHEN a Patient searches with an invalid specialty value, THE Scheduling_System SHALL return a validation error indicating the accepted specialty values
6. IF a Patient searches with a date in the past or more than 90 days in the future, THEN THE Scheduling_System SHALL return a validation error indicating the acceptable date range

### Requirement 2: Book an Appointment

**User Story:** As a Patient, I want to book an appointment in an available time slot, so that I can secure a consultation with my chosen doctor.

#### Acceptance Criteria

1. WHEN a Patient selects an available Time_Slot and provides a valid appointment type, THE Scheduling_System SHALL create an Appointment linking the Patient to the Doctor at the specified date and time with the corresponding duration
2. WHEN an Appointment is successfully created, THE Scheduling_System SHALL return a confirmation containing the Appointment identifier, Doctor name, date, time, and duration
3. IF a Patient attempts to book a Time_Slot that is no longer available, THEN THE Scheduling_System SHALL reject the booking and return an error indicating the time slot is no longer available
4. THE Scheduling_System SHALL assign a duration of 60 minutes to First_Visit Appointments
5. THE Scheduling_System SHALL assign a duration of 30 minutes to Follow_Up Appointments
6. IF a Patient provides an appointment type that is neither First_Visit nor Follow_Up, THEN THE Scheduling_System SHALL reject the booking and return an error indicating the appointment type is invalid

### Requirement 3: Prevent Double-Booking

**User Story:** As a clinic administrator, I want the system to prevent double-booking, so that no two patients are scheduled with the same doctor at overlapping times.

#### Acceptance Criteria

1. WHEN a Patient attempts to book a Time_Slot that overlaps with an existing Appointment for the same Doctor, THE Scheduling_System SHALL reject the booking, return a conflict error indicating the overlapping time range, and preserve the existing Appointment unchanged
2. THE Scheduling_System SHALL consider two Appointments for the same Doctor as overlapping when any portion of their time ranges intersect, where a time range includes the start time and excludes the end time (i.e., an Appointment ending at 10:00 does not overlap with one starting at 10:00)
3. WHEN concurrent booking requests target the same Time_Slot for the same Doctor, THE Scheduling_System SHALL accept only the first request to be persisted and reject all subsequent conflicting requests with a conflict error
4. IF a booking is rejected due to overlap, THEN THE Scheduling_System SHALL not persist any data from the rejected booking request
5. WHEN a Patient attempts to book a Time_Slot for a Doctor that does not overlap with any existing Appointment for that Doctor, THE Scheduling_System SHALL allow the booking without conflict

### Requirement 4: Cancel an Appointment

**User Story:** As a Patient, I want to cancel my appointment, so that I can free up the time slot if I can no longer attend.

#### Acceptance Criteria

1. WHEN a Patient cancels an Appointment more than 24 hours before the Appointment's scheduled start time, THE Scheduling_System SHALL cancel the Appointment, mark its status as cancelled, and return a success confirmation
2. WHEN a Patient attempts to cancel an Appointment less than or equal to 24 hours before the Appointment's scheduled start time, THE Scheduling_System SHALL reject the cancellation and return a policy violation error indicating the 24-hour cancellation window
3. WHEN an Appointment is cancelled, THE Scheduling_System SHALL mark the corresponding Time_Slot as available for other Patients
4. WHEN a Patient attempts to cancel an Appointment that does not exist, THE Scheduling_System SHALL return a not-found error
5. WHEN a Patient attempts to cancel an Appointment belonging to a different Patient, THE Scheduling_System SHALL reject the request with an authorization error
6. IF a Patient attempts to cancel an Appointment that is already cancelled, THEN THE Scheduling_System SHALL return an error indicating the Appointment has already been cancelled
7. IF a Patient attempts to cancel an Appointment whose scheduled start time is in the past, THEN THE Scheduling_System SHALL reject the cancellation and return an error indicating that past Appointments cannot be cancelled

### Requirement 5: Booking Confirmation

**User Story:** As a Patient, I want to receive a confirmation after booking, so that I have a record of my scheduled appointment.

#### Acceptance Criteria

1. WHEN an Appointment is successfully booked, THE Scheduling_System SHALL generate a confirmation containing the Appointment identifier, Patient name, Doctor name, Specialty, date in ISO 8601 format, start time in ISO 8601 format, end time in ISO 8601 format, and appointment type
2. WHEN an Appointment is successfully booked, THE Scheduling_System SHALL return the confirmation in the booking response
3. THE Scheduling_System SHALL generate a unique Appointment identifier of at least 8 characters for each confirmed booking
4. FOR ALL confirmed Appointments, THE Scheduling_System SHALL ensure the end time equals the start time plus the duration corresponding to the appointment type

### Requirement 6: Doctor Availability Configuration

**User Story:** As a Doctor, I want to configure my availability schedule, so that patients can only book during my working hours.

#### Acceptance Criteria

1. THE Scheduling_System SHALL allow a Doctor to define an Availability_Schedule specifying available days of the week and time ranges (each defined by a start time and end time in 15-minute increments) for each day
2. WHEN a Doctor updates the Availability_Schedule, THE Scheduling_System SHALL apply the new schedule immediately to all future booking requests without affecting existing Appointments
3. WHEN a Patient attempts to book outside a Doctor's configured Availability_Schedule, THE Scheduling_System SHALL reject the booking with an error indicating the Doctor is not available at the requested time
4. THE Scheduling_System SHALL support a maximum of 5 time ranges per day in a Doctor's Availability_Schedule
5. IF a Doctor provides overlapping time ranges within the same day, THEN THE Scheduling_System SHALL reject the configuration and return a validation error indicating which time ranges overlap
6. IF a Doctor provides a time range where the end time is equal to or earlier than the start time, THEN THE Scheduling_System SHALL reject the configuration and return a validation error indicating the invalid time range
7. IF a Doctor has no Availability_Schedule configured, THEN THE Scheduling_System SHALL reject any Patient booking attempt for that Doctor with an error indicating the Doctor has no available schedule

### Requirement 7: Appointment Duration by Type

**User Story:** As a clinic administrator, I want appointments to have different durations based on type, so that adequate time is allocated for each visit.

#### Acceptance Criteria

1. THE Scheduling_System SHALL allocate 60 minutes for First_Visit Appointments
2. THE Scheduling_System SHALL allocate 30 minutes for Follow_Up Appointments
3. WHEN calculating available Time_Slots, THE Scheduling_System SHALL account for the requested appointment type's duration to determine if the contiguous free time in the Doctor's schedule is greater than or equal to the appointment duration
4. IF a First_Visit is requested but the longest contiguous free gap in the Doctor's schedule for the requested time is less than 60 minutes, THEN THE Scheduling_System SHALL reject the booking with an error indicating insufficient time available
5. IF a Follow_Up is requested but the longest contiguous free gap in the Doctor's schedule for the requested time is less than 30 minutes, THEN THE Scheduling_System SHALL reject the booking with an error indicating insufficient time available
6. THE Scheduling_System SHALL persist the duration in minutes as part of the Appointment record for every booked Appointment
7. WHEN generating Time_Slots, THE Scheduling_System SHALL ensure that no generated slot's end time (start time plus the appointment type's duration) exceeds the Doctor's Availability_Schedule end boundary for that day
8. IF an Appointment is requested without a valid appointment type (neither First_Visit nor Follow_Up), THEN THE Scheduling_System SHALL reject the booking with an error indicating an invalid appointment type
