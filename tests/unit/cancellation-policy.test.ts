import { canCancel } from "../../src/modules/cancellation-policy";
import { Appointment } from "../../src/models/types";

/**
 * Helper to create a test appointment with sensible defaults.
 */
function makeAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: "appt-001",
    doctorId: "doc-001",
    patientId: "pat-001",
    startTime: new Date("2024-06-15T10:00:00Z"),
    endTime: new Date("2024-06-15T11:00:00Z"),
    durationMinutes: 60,
    appointmentType: "FIRST_VISIT",
    status: "confirmed",
    createdAt: new Date("2024-06-01T08:00:00Z"),
    cancelledAt: null,
    ...overrides,
  };
}

describe("canCancel", () => {
  describe("already cancelled appointments", () => {
    it("should reject cancellation of an already cancelled appointment", () => {
      const appointment = makeAppointment({ status: "cancelled" });
      const currentTime = new Date("2024-06-10T10:00:00Z"); // well before start

      const result = canCancel(appointment, currentTime);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("Appointment has already been cancelled");
    });
  });

  describe("past appointments", () => {
    it("should reject cancellation when appointment start time is in the past", () => {
      const appointment = makeAppointment({
        startTime: new Date("2024-06-10T10:00:00Z"),
      });
      const currentTime = new Date("2024-06-11T10:00:00Z"); // after start

      const result = canCancel(appointment, currentTime);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("Past appointments cannot be cancelled");
    });

    it("should reject cancellation when current time equals appointment start time", () => {
      const appointment = makeAppointment({
        startTime: new Date("2024-06-15T10:00:00Z"),
      });
      const currentTime = new Date("2024-06-15T10:00:00Z"); // exactly at start

      const result = canCancel(appointment, currentTime);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("Past appointments cannot be cancelled");
    });
  });

  describe("24-hour cancellation window", () => {
    it("should reject cancellation at exactly 24 hours before appointment", () => {
      const appointment = makeAppointment({
        startTime: new Date("2024-06-15T10:00:00Z"),
      });
      // Exactly 24 hours before
      const currentTime = new Date("2024-06-14T10:00:00Z");

      const result = canCancel(appointment, currentTime);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe(
        "Cancellation must be made more than 24 hours before the appointment"
      );
    });

    it("should reject cancellation less than 24 hours before appointment", () => {
      const appointment = makeAppointment({
        startTime: new Date("2024-06-15T10:00:00Z"),
      });
      // 23 hours before
      const currentTime = new Date("2024-06-14T11:00:00Z");

      const result = canCancel(appointment, currentTime);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe(
        "Cancellation must be made more than 24 hours before the appointment"
      );
    });

    it("should allow cancellation at 24 hours + 1 minute before appointment", () => {
      const appointment = makeAppointment({
        startTime: new Date("2024-06-15T10:00:00Z"),
      });
      // 24 hours and 1 minute before
      const currentTime = new Date("2024-06-14T09:59:00Z");

      const result = canCancel(appointment, currentTime);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("should allow cancellation well before the 24-hour window", () => {
      const appointment = makeAppointment({
        startTime: new Date("2024-06-15T10:00:00Z"),
      });
      // 5 days before
      const currentTime = new Date("2024-06-10T10:00:00Z");

      const result = canCancel(appointment, currentTime);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });

  describe("priority of checks", () => {
    it("should check cancelled status before past appointment check", () => {
      // Appointment is both cancelled AND in the past
      const appointment = makeAppointment({
        status: "cancelled",
        startTime: new Date("2024-06-01T10:00:00Z"),
      });
      const currentTime = new Date("2024-06-10T10:00:00Z");

      const result = canCancel(appointment, currentTime);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("Appointment has already been cancelled");
    });
  });
});
