import { Appointment } from "../models/types";
import { CancellationResult } from "../models/requests";

/**
 * The minimum time (in milliseconds) before an appointment's start time
 * that a cancellation must be made. Exactly 24 hours is NOT sufficient —
 * the current time must be MORE than 24 hours before the appointment.
 */
const CANCELLATION_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Determines whether an appointment can be cancelled based on the cancellation policy.
 *
 * Rules:
 * 1. Already cancelled appointments cannot be cancelled again.
 * 2. Past appointments (start time <= current time) cannot be cancelled.
 * 3. Cancellation must be made MORE than 24 hours before the appointment start time.
 *    Exactly 24 hours is not allowed (strict inequality).
 *
 * @param appointment - The appointment to evaluate for cancellation.
 * @param currentTime - The current date/time to check against.
 * @returns A CancellationResult indicating whether cancellation is allowed.
 */
export function canCancel(
  appointment: Appointment,
  currentTime: Date
): CancellationResult {
  // Rule 1: Already cancelled
  if (appointment.status === "cancelled") {
    return {
      allowed: false,
      reason: "Appointment has already been cancelled",
    };
  }

  // Rule 2: Past appointment
  if (appointment.startTime <= currentTime) {
    return {
      allowed: false,
      reason: "Past appointments cannot be cancelled",
    };
  }

  // Rule 3: Within 24-hour cancellation window (strict: exactly 24h is NOT allowed)
  const timeDifference =
    appointment.startTime.getTime() - currentTime.getTime();

  if (timeDifference <= CANCELLATION_WINDOW_MS) {
    return {
      allowed: false,
      reason:
        "Cancellation must be made more than 24 hours before the appointment",
    };
  }

  // All checks passed — cancellation is allowed
  return { allowed: true };
}
