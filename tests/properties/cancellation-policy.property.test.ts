import * as fc from "fast-check";
import { canCancel } from "../../src/modules/cancellation-policy";
import { Appointment } from "../../src/models/types";
import { AppointmentType, AppointmentStatus } from "../../src/models/enums";

/**
 * Feature: appointment-scheduling, Property 5: Cancellation policy enforcement
 *
 * Validates: Requirements 4.1, 4.2
 *
 * For any appointment and any current time, cancellation SHALL be allowed if and only if
 * the current time is more than 24 hours before the appointment's start time.
 * When the difference is less than or equal to 24 hours, cancellation SHALL be rejected
 * with a policy violation error.
 */

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

// Arbitrary for appointment types
const appointmentTypeArb: fc.Arbitrary<AppointmentType> = fc.constantFrom(
  "FIRST_VISIT",
  "FOLLOW_UP"
);

// Helper to build a confirmed appointment with a given start time
function buildConfirmedAppointment(
  startTime: Date,
  appointmentType: AppointmentType
): Appointment {
  const durationMinutes = appointmentType === "FIRST_VISIT" ? 60 : 30;
  const endTime = new Date(
    startTime.getTime() + durationMinutes * 60 * 1000
  );
  return {
    id: "test-appointment-id",
    doctorId: "doctor-1",
    patientId: "patient-1",
    startTime,
    endTime,
    durationMinutes,
    appointmentType,
    status: "confirmed" as AppointmentStatus,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    cancelledAt: null,
  };
}

// Helper to build a cancelled appointment with a given start time
function buildCancelledAppointment(
  startTime: Date,
  appointmentType: AppointmentType
): Appointment {
  const durationMinutes = appointmentType === "FIRST_VISIT" ? 60 : 30;
  const endTime = new Date(
    startTime.getTime() + durationMinutes * 60 * 1000
  );
  return {
    id: "test-appointment-id",
    doctorId: "doctor-1",
    patientId: "patient-1",
    startTime,
    endTime,
    durationMinutes,
    appointmentType,
    status: "cancelled" as AppointmentStatus,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    cancelledAt: new Date("2024-01-02T00:00:00Z"),
  };
}

describe("Feature: appointment-scheduling, Property 5: Cancellation policy enforcement", () => {
  /**
   * **Validates: Requirements 4.1**
   *
   * For confirmed appointments where currentTime is more than 24 hours before startTime,
   * cancellation SHALL be allowed.
   */
  it("should allow cancellation when current time is more than 24 hours before start time", () => {
    fc.assert(
      fc.property(
        // Generate a future start time (1 to 365 days from a base date)
        fc.integer({ min: 1, max: 365 }).map(
          (days) =>
            new Date(
              Date.UTC(2025, 0, 1) + days * 24 * 60 * 60 * 1000
            )
        ),
        // Generate an offset greater than 24 hours (in ms): from 24h + 1min to 30 days
        fc.integer({
          min: TWENTY_FOUR_HOURS_MS + 60 * 1000,
          max: 30 * 24 * 60 * 60 * 1000,
        }),
        appointmentTypeArb,
        (startTime, offsetMs, appointmentType) => {
          const currentTime = new Date(startTime.getTime() - offsetMs);
          const appointment = buildConfirmedAppointment(startTime, appointmentType);

          const result = canCancel(appointment, currentTime);

          expect(result.allowed).toBe(true);
          expect(result.reason).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 4.2**
   *
   * For confirmed appointments where currentTime is <= 24 hours before startTime
   * (but still before startTime), cancellation SHALL be rejected.
   */
  it("should reject cancellation when current time is <= 24 hours before start time", () => {
    fc.assert(
      fc.property(
        // Generate a future start time
        fc.integer({ min: 1, max: 365 }).map(
          (days) =>
            new Date(
              Date.UTC(2025, 0, 1) + days * 24 * 60 * 60 * 1000
            )
        ),
        // Generate an offset from 1ms to exactly 24 hours (inclusive)
        fc.integer({ min: 1, max: TWENTY_FOUR_HOURS_MS }),
        appointmentTypeArb,
        (startTime, offsetMs, appointmentType) => {
          const currentTime = new Date(startTime.getTime() - offsetMs);
          const appointment = buildConfirmedAppointment(startTime, appointmentType);

          const result = canCancel(appointment, currentTime);

          expect(result.allowed).toBe(false);
          expect(result.reason).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 4.1, 4.2**
   *
   * For cancelled appointments, cancellation SHALL be rejected regardless of time.
   */
  it("should reject cancellation for already cancelled appointments regardless of time", () => {
    fc.assert(
      fc.property(
        // Generate a future start time
        fc.integer({ min: 1, max: 365 }).map(
          (days) =>
            new Date(
              Date.UTC(2025, 0, 1) + days * 24 * 60 * 60 * 1000
            )
        ),
        // Generate any offset (could be more or less than 24 hours)
        fc.integer({
          min: TWENTY_FOUR_HOURS_MS + 60 * 1000,
          max: 60 * 24 * 60 * 60 * 1000,
        }),
        appointmentTypeArb,
        (startTime, offsetMs, appointmentType) => {
          const currentTime = new Date(startTime.getTime() - offsetMs);
          const appointment = buildCancelledAppointment(startTime, appointmentType);

          const result = canCancel(appointment, currentTime);

          expect(result.allowed).toBe(false);
          expect(result.reason).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 4.1, 4.2**
   *
   * For past appointments (startTime <= currentTime), cancellation SHALL be rejected.
   */
  it("should reject cancellation for past appointments", () => {
    fc.assert(
      fc.property(
        // Generate a start time in the past relative to current time
        fc.integer({ min: 1, max: 365 }).map(
          (days) =>
            new Date(
              Date.UTC(2025, 0, 1) + days * 24 * 60 * 60 * 1000
            )
        ),
        // Generate a positive offset so currentTime is after startTime (1ms to 30 days)
        fc.integer({ min: 0, max: 30 * 24 * 60 * 60 * 1000 }),
        appointmentTypeArb,
        (startTime, offsetMs, appointmentType) => {
          // currentTime is at or after startTime
          const currentTime = new Date(startTime.getTime() + offsetMs);
          const appointment = buildConfirmedAppointment(startTime, appointmentType);

          const result = canCancel(appointment, currentTime);

          expect(result.allowed).toBe(false);
          expect(result.reason).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 4.1, 4.2**
   *
   * The 24-hour boundary is STRICT: exactly 24 hours means NOT allowed.
   * This tests the exact boundary condition.
   */
  it("should reject cancellation at exactly 24 hours before start time (strict boundary)", () => {
    fc.assert(
      fc.property(
        // Generate a future start time
        fc.integer({ min: 2, max: 365 }).map(
          (days) =>
            new Date(
              Date.UTC(2025, 0, 1) + days * 24 * 60 * 60 * 1000
            )
        ),
        appointmentTypeArb,
        (startTime, appointmentType) => {
          // currentTime is exactly 24 hours before startTime
          const currentTime = new Date(
            startTime.getTime() - TWENTY_FOUR_HOURS_MS
          );
          const appointment = buildConfirmedAppointment(startTime, appointmentType);

          const result = canCancel(appointment, currentTime);

          expect(result.allowed).toBe(false);
          expect(result.reason).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});
