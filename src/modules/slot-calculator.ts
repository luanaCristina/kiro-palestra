import { Appointment, AvailabilityRange, TimeSlot } from "../models/types";

/**
 * Represents a time interval as a pair of Date objects.
 */
interface Interval {
  start: Date;
  end: Date;
}

/**
 * Parses an HH:mm time string into hours and minutes.
 */
function parseTime(time: string): { hours: number; minutes: number } {
  const [hours, minutes] = time.split(":").map(Number);
  return { hours, minutes };
}

/**
 * Creates a Date object for a given ISO date string (YYYY-MM-DD) and HH:mm time.
 */
function createDateFromTime(dateStr: string, time: string): Date {
  const { hours, minutes } = parseTime(time);
  const date = new Date(`${dateStr}T00:00:00`);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * Subtracts booked intervals from a free interval, returning the remaining free gaps.
 * Appointments are assumed to be sorted by start time.
 */
function subtractIntervals(
  free: Interval,
  booked: Interval[]
): Interval[] {
  const gaps: Interval[] = [];
  let currentStart = free.start;

  // Sort booked intervals by start time
  const sorted = [...booked].sort(
    (a, b) => a.start.getTime() - b.start.getTime()
  );

  for (const appointment of sorted) {
    // Skip appointments that end before or at the current start
    if (appointment.end.getTime() <= currentStart.getTime()) {
      continue;
    }

    // Skip appointments that start at or after the free interval end
    if (appointment.start.getTime() >= free.end.getTime()) {
      break;
    }

    // If there's a gap before this appointment, record it
    if (appointment.start.getTime() > currentStart.getTime()) {
      gaps.push({
        start: currentStart,
        end: new Date(
          Math.min(appointment.start.getTime(), free.end.getTime())
        ),
      });
    }

    // Move current start past this appointment
    currentStart = new Date(
      Math.max(currentStart.getTime(), appointment.end.getTime())
    );
  }

  // If there's remaining time after all appointments
  if (currentStart.getTime() < free.end.getTime()) {
    gaps.push({
      start: currentStart,
      end: free.end,
    });
  }

  return gaps;
}

/**
 * Generates time slots at 15-minute increments within a gap.
 * Each slot must have enough room for the full duration and must not exceed
 * the availability boundary end time.
 */
function generateSlotsInGap(
  gap: Interval,
  duration: number,
  availabilityEnd: Date,
  now: Date
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
  const durationMs = duration * 60 * 1000;

  let slotStart = gap.start.getTime();
  const gapEnd = gap.end.getTime();
  const boundaryEnd = availabilityEnd.getTime();

  while (slotStart + durationMs <= gapEnd && slotStart + durationMs <= boundaryEnd) {
    // Exclude slots whose start time is in the past
    if (slotStart > now.getTime()) {
      slots.push({
        startTime: new Date(slotStart),
        endTime: new Date(slotStart + durationMs),
        available: true,
      });
    }

    slotStart += FIFTEEN_MINUTES_MS;
  }

  return slots;
}

/**
 * Calculates available time slots for a given date based on availability ranges
 * and existing appointments.
 *
 * Algorithm:
 * 1. Filter availability ranges to those matching the date's day of week
 * 2. For each range, convert start/end times to Date objects for that date
 * 3. Subtract existing appointment intervals from the availability range
 * 4. For each free gap, generate slots at 15-minute increments where:
 *    - The slot start + duration does not exceed the gap end
 *    - The slot start + duration does not exceed the availability range end
 *    - The slot start is not in the past
 * 5. Return all generated TimeSlot objects with available: true
 *
 * @param availabilityRanges - The doctor's configured availability ranges
 * @param existingAppointments - Non-cancelled appointments for the doctor on the date
 * @param date - ISO 8601 date string (YYYY-MM-DD)
 * @param duration - Appointment duration in minutes
 * @returns Array of available TimeSlot objects
 */
export function calculateAvailableSlots(
  availabilityRanges: AvailabilityRange[],
  existingAppointments: Appointment[],
  date: string,
  duration: number
): TimeSlot[] {
  const now = new Date();

  // Determine the day of week for the given date
  const targetDate = new Date(`${date}T00:00:00`);
  const dayOfWeek = targetDate.getDay();

  // Filter availability ranges to those matching the date's day of week
  const matchingRanges = availabilityRanges.filter(
    (range) => range.dayOfWeek === dayOfWeek
  );

  if (matchingRanges.length === 0) {
    return [];
  }

  // Filter existing appointments to only non-cancelled ones
  const activeAppointments = existingAppointments.filter(
    (apt) => apt.status !== "cancelled"
  );

  // Convert appointments to intervals
  const bookedIntervals: Interval[] = activeAppointments.map((apt) => ({
    start: apt.startTime,
    end: apt.endTime,
  }));

  const allSlots: TimeSlot[] = [];

  for (const range of matchingRanges) {
    // Convert availability range times to Date objects for the target date
    const rangeStart = createDateFromTime(date, range.startTime);
    const rangeEnd = createDateFromTime(date, range.endTime);

    const freeInterval: Interval = { start: rangeStart, end: rangeEnd };

    // Subtract booked intervals from this availability range
    const freeGaps = subtractIntervals(freeInterval, bookedIntervals);

    // Generate slots in each free gap
    for (const gap of freeGaps) {
      const gapDurationMinutes =
        (gap.end.getTime() - gap.start.getTime()) / (60 * 1000);

      // Only generate slots if the gap is large enough for the duration
      if (gapDurationMinutes >= duration) {
        const slots = generateSlotsInGap(gap, duration, rangeEnd, now);
        allSlots.push(...slots);
      }
    }
  }

  return allSlots;
}
