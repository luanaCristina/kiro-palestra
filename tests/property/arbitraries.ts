import * as fc from 'fast-check';
import { Appointment, AvailabilityRange } from '../../src/models/types';
import { AppointmentType } from '../../src/models/enums';

/**
 * Shared fast-check arbitraries (generators) for property-based tests.
 * These generators produce valid and invalid domain objects for testing
 * the Medical Appointment Scheduling System.
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Converts HH:mm string to total minutes since midnight.
 */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Converts total minutes since midnight to HH:mm string.
 */
function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ─── arbValidTime15Min ──────────────────────────────────────────────────────

/**
 * Generates HH:mm strings with hours in [0, 23] and minutes in {0, 15, 30, 45}.
 */
export const arbValidTime15Min: fc.Arbitrary<string> = fc
  .record({
    hour: fc.integer({ min: 0, max: 23 }),
    minute: fc.constantFrom(0, 15, 30, 45),
  })
  .map(({ hour, minute }) => {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  });

// ─── arbInvalidTime15Min ────────────────────────────────────────────────────

/**
 * Generates HH:mm strings with hours in [0, 23] and minutes NOT in {0, 15, 30, 45}.
 * Valid minutes that are invalid for 15-min increments: 1-14, 16-29, 31-44, 46-59.
 */
export const arbInvalidTime15Min: fc.Arbitrary<string> = fc
  .record({
    hour: fc.integer({ min: 0, max: 23 }),
    minute: fc.integer({ min: 0, max: 59 }).filter((m) => m % 15 !== 0),
  })
  .map(({ hour, minute }) => {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  });

// ─── arbAvailabilityRange ───────────────────────────────────────────────────

/**
 * Generates valid AvailabilityRange objects:
 * - dayOfWeek: 0-6
 * - startTime/endTime: HH:mm format in 15-minute increments
 * - endTime > startTime (at least 15 minutes gap)
 */
export const arbAvailabilityRange: fc.Arbitrary<AvailabilityRange> = fc
  .record({
    dayOfWeek: fc.integer({ min: 0, max: 6 }),
    startSlot: fc.integer({ min: 0, max: 93 }), // 0 to 93 (00:00 to 23:15) — leaves room for endTime
    gap: fc.integer({ min: 1, max: 16 }), // 1 to 16 slots (15 min to 4 hours gap)
  })
  .filter(({ startSlot, gap }) => {
    // endSlot must be at most 96 (24:00 equivalent = 96 * 15min = 1440min)
    return (startSlot + gap) <= 96;
  })
  .map(({ dayOfWeek, startSlot, gap }) => {
    const startMinutes = startSlot * 15;
    const endMinutes = (startSlot + gap) * 15;
    return {
      dayOfWeek,
      startTime: minutesToTime(startMinutes),
      endTime: minutesToTime(endMinutes),
    };
  });

// ─── arbAppointmentInRange ──────────────────────────────────────────────────

/**
 * Generates an Appointment that fits within the given availability range on the given date.
 * The appointment will have the specified duration and start at a valid 15-minute aligned time.
 *
 * @param range - The availability range to constrain the appointment within
 * @param date - ISO date string (YYYY-MM-DD) for the appointment day
 * @param duration - Duration in minutes (30 or 60)
 */
export function arbAppointmentInRange(
  range: AvailabilityRange,
  date: string,
  duration: number
): fc.Arbitrary<Appointment> {
  const rangeStartMinutes = timeToMinutes(range.startTime);
  const rangeEndMinutes = timeToMinutes(range.endTime);
  const rangeSpan = rangeEndMinutes - rangeStartMinutes;

  // Number of valid start positions (in 15-min slots)
  const maxStartOffset = rangeSpan - duration;

  if (maxStartOffset < 0) {
    // Range is too small to fit the appointment — return a never-matching arbitrary
    return fc.constant(undefined as unknown as Appointment).filter(() => false);
  }

  const validSlots = Math.floor(maxStartOffset / 15);

  return fc
    .record({
      slotOffset: fc.integer({ min: 0, max: validSlots }),
      appointmentType: fc.constantFrom<AppointmentType>('FIRST_VISIT', 'FOLLOW_UP'),
    })
    .map(({ slotOffset, appointmentType }) => {
      const aptStartMinutes = rangeStartMinutes + slotOffset * 15;

      const startTime = new Date(`${date}T00:00:00`);
      startTime.setHours(Math.floor(aptStartMinutes / 60), aptStartMinutes % 60, 0, 0);

      const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

      return {
        id: fc.sample(fc.uuidV(4), 1)[0] as string,
        doctorId: fc.sample(fc.uuidV(4), 1)[0] as string,
        patientId: fc.sample(fc.uuidV(4), 1)[0] as string,
        startTime,
        endTime,
        durationMinutes: duration,
        appointmentType: duration === 60 ? 'FIRST_VISIT' : 'FOLLOW_UP' as AppointmentType,
        status: 'confirmed' as const,
        createdAt: new Date(),
        cancelledAt: null,
      };
    });
}

// ─── arbIntervalPair ────────────────────────────────────────────────────────

/**
 * Generates two valid half-open intervals [start, end) with end > start.
 * Uses Date objects as timestamps. Both intervals have at least 1ms duration.
 */
export const arbIntervalPair: fc.Arbitrary<{
  startA: Date;
  endA: Date;
  startB: Date;
  endB: Date;
}> = fc
  .record({
    baseTimestamp: fc.integer({ min: 1_000_000_000_000, max: 2_000_000_000_000 }), // ~2001 to ~2033
    offsetA: fc.integer({ min: 0, max: 86_400_000 }), // up to 24h offset from base
    durationA: fc.integer({ min: 1, max: 7_200_000 }), // 1ms to 2h
    offsetB: fc.integer({ min: 0, max: 86_400_000 }),
    durationB: fc.integer({ min: 1, max: 7_200_000 }),
  })
  .map(({ baseTimestamp, offsetA, durationA, offsetB, durationB }) => {
    const startA = new Date(baseTimestamp + offsetA);
    const endA = new Date(startA.getTime() + durationA);
    const startB = new Date(baseTimestamp + offsetB);
    const endB = new Date(startB.getTime() + durationB);
    return { startA, endA, startB, endB };
  });

// ─── arbValidBookingRequest ─────────────────────────────────────────────────

/**
 * Generates a valid BookingRequest object:
 * - patientId: UUID v4
 * - doctorId: UUID v4
 * - startTime: ISO 8601 datetime string (future date)
 * - appointmentType: "FIRST_VISIT" | "FOLLOW_UP"
 */
export const arbValidBookingRequest: fc.Arbitrary<{
  patientId: string;
  doctorId: string;
  startTime: string;
  appointmentType: AppointmentType;
}> = fc
  .record({
    patientId: fc.uuidV(4),
    doctorId: fc.uuidV(4),
    // Generate a future date: year 2026-2028, valid month/day, valid hours
    year: fc.integer({ min: 2026, max: 2028 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 28 }), // safe for all months
    hour: fc.integer({ min: 6, max: 20 }),
    minute: fc.constantFrom(0, 15, 30, 45),
    appointmentType: fc.constantFrom<AppointmentType>('FIRST_VISIT', 'FOLLOW_UP'),
  })
  .map(({ patientId, doctorId, year, month, day, hour, minute, appointmentType }) => {
    const m = String(month).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    const h = String(hour).padStart(2, '0');
    const min = String(minute).padStart(2, '0');
    const startTime = `${year}-${m}-${d}T${h}:${min}:00.000Z`;

    return {
      patientId,
      doctorId,
      startTime,
      appointmentType,
    };
  });

// ─── arbInvalidUUID ─────────────────────────────────────────────────────────

/**
 * Generates strings that are NOT valid UUID v4.
 * Includes various malformed strings that shouldn't match the UUID v4 pattern
 * (8-4-4-4-12 hex with version 4 indicator).
 */
export const arbInvalidUUID: fc.Arbitrary<string> = fc.oneof(
  // Too short
  fc.string({ minLength: 1, maxLength: 35 }).filter(
    (s) => !isUUIDv4(s)
  ),
  // Too long
  fc.string({ minLength: 37, maxLength: 50 }).filter(
    (s) => !isUUIDv4(s)
  ),
  // Right length but wrong format (no hyphens or wrong positions)
  fc.hexaString({ minLength: 32, maxLength: 32 }).map((hex) => hex), // 32 hex chars without hyphens
  // Almost-UUID but with wrong version digit (not 4)
  fc.uuidV(4).map((uuid) => {
    // Replace the version nibble (position 14) with a non-4 digit
    const chars = uuid.split('');
    const replacement = fc.sample(fc.constantFrom('0', '1', '2', '3', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'), 1)[0] as string;
    chars[14] = replacement;
    return chars.join('');
  }),
  // Empty string
  fc.constant(''),
  // Random word-like strings
  fc.stringOf(fc.char().filter((c) => /[a-z0-9]/.test(c)), { minLength: 5, maxLength: 20 }),
  // UUID-like but with invalid characters
  fc.uuidV(4).map((uuid) => uuid.replace(/[0-9a-f]/, 'g'))
);

/**
 * Checks if a string is a valid UUID v4.
 */
function isUUIDv4(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}
