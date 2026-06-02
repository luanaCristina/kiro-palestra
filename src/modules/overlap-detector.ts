import { Appointment } from "../models/types";
import { OverlapResult } from "../models/requests";

/**
 * Determines whether two half-open time intervals [startA, endA) and [startB, endB) overlap.
 * Two intervals overlap if and only if startA < endB AND startB < endA.
 * Adjacent intervals (one ends exactly when the other starts) do NOT overlap.
 *
 * @param startA - Start of the first interval (inclusive)
 * @param endA - End of the first interval (exclusive)
 * @param startB - Start of the second interval (inclusive)
 * @param endB - End of the second interval (exclusive)
 * @returns true if the intervals overlap, false otherwise
 */
export function intervalsOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  return startA.getTime() < endB.getTime() && startB.getTime() < endA.getTime();
}

/**
 * Detects whether a proposed new appointment time range overlaps with any existing appointments.
 * Iterates through existing appointments and returns the first conflicting one found.
 *
 * @param existingAppointments - Array of existing appointments to check against
 * @param newStart - Start time of the proposed new appointment (inclusive)
 * @param newEnd - End time of the proposed new appointment (exclusive)
 * @returns OverlapResult indicating whether an overlap was found and details about the conflict
 */
export function detectOverlap(
  existingAppointments: Appointment[],
  newStart: Date,
  newEnd: Date
): OverlapResult {
  for (const appointment of existingAppointments) {
    if (intervalsOverlap(appointment.startTime, appointment.endTime, newStart, newEnd)) {
      const overlapStart = new Date(
        Math.max(appointment.startTime.getTime(), newStart.getTime())
      );
      const overlapEnd = new Date(
        Math.min(appointment.endTime.getTime(), newEnd.getTime())
      );

      return {
        hasOverlap: true,
        conflictingAppointment: appointment,
        overlappingRange: { start: overlapStart, end: overlapEnd },
      };
    }
  }

  return { hasOverlap: false };
}
