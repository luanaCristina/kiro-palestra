import * as fc from 'fast-check';
import { calculateAvailableSlots } from '../../src/modules/slot-calculator';
import { arbAvailabilityRange } from '../property/arbitraries';
import { Appointment, AvailabilityRange } from '../../src/models/types';

/**
 * Property-based tests for the slot-calculator module.
 * Uses a far-future date (2030-03-04, a Monday, dayOfWeek=1) to avoid
 * "slot is in the past" filtering by the calculator.
 */

const TEST_DATE = '2030-03-04'; // Monday, dayOfWeek = 1
const TEST_DAY_OF_WEEK = 1;

/**
 * Helper: creates an arbAvailabilityRange fixed to dayOfWeek=1 (Monday)
 * so it always matches TEST_DATE.
 */
const arbRangeForTestDay: fc.Arbitrary<AvailabilityRange> = arbAvailabilityRange.map(
  (range) => ({ ...range, dayOfWeek: TEST_DAY_OF_WEEK })
);

/**
 * Helper: converts HH:mm to total minutes since midnight.
 */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Helper: creates a deterministic appointment within a range for a given date.
 * Uses slotOffset (in 15-min increments from range start) to position the appointment.
 */
function makeAppointment(
  range: AvailabilityRange,
  date: string,
  duration: number,
  slotOffset: number
): Appointment | null {
  const rangeStartMin = timeToMinutes(range.startTime);
  const rangeEndMin = timeToMinutes(range.endTime);
  const rangeSpan = rangeEndMin - rangeStartMin;
  const maxStartOffset = rangeSpan - duration;

  if (maxStartOffset < 0) return null;

  const validSlots = Math.floor(maxStartOffset / 15);
  const actualOffset = Math.min(slotOffset, validSlots);
  const aptStartMinutes = rangeStartMin + actualOffset * 15;

  const startTime = new Date(`${date}T00:00:00`);
  startTime.setHours(Math.floor(aptStartMinutes / 60), aptStartMinutes % 60, 0, 0);

  const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

  return {
    id: 'test-apt-id',
    doctorId: 'test-doctor-id',
    patientId: 'test-patient-id',
    startTime,
    endTime,
    durationMinutes: duration,
    appointmentType: 'FOLLOW_UP',
    status: 'confirmed',
    createdAt: new Date(),
    cancelledAt: null,
  };
}

/**
 * Arbitrary that generates a range and a valid slot offset for an appointment within it.
 */
const arbRangeWithOffset = fc.record({
  range: arbRangeForTestDay,
  slotOffset: fc.integer({ min: 0, max: 15 }),
  duration: fc.constantFrom(30, 60),
});

describe('Slot Calculator - Property-Based Tests', () => {
  // Feature: test-automation-suite, Property 1: Slot non-overlap with existing appointments
  it('Property 1: No returned slot overlaps with any active appointment', () => {
    fc.assert(
      fc.property(
        arbRangeWithOffset,
        ({ range, slotOffset, duration }) => {
          const apt = makeAppointment(range, TEST_DATE, duration, slotOffset);
          const appointments = apt ? [apt] : [];

          const slots = calculateAvailableSlots(
            [range],
            appointments,
            TEST_DATE,
            duration
          );

          fc.pre(slots.length > 0);

          for (const slot of slots) {
            for (const a of appointments) {
              // Half-open interval overlap: startA < endB AND startB < endA
              const overlaps =
                slot.startTime.getTime() < a.endTime.getTime() &&
                a.startTime.getTime() < slot.endTime.getTime();
              expect(overlaps).toBe(false);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: test-automation-suite, Property 2: Slot duration constancy
  it('Property 2: Every slot has endTime - startTime === duration * 60 * 1000', () => {
    fc.assert(
      fc.property(
        arbRangeForTestDay,
        fc.constantFrom(30, 60),
        (range, duration) => {
          const slots = calculateAvailableSlots(
            [range],
            [],
            TEST_DATE,
            duration
          );

          fc.pre(slots.length > 0);

          const expectedMs = duration * 60 * 1000;
          for (const slot of slots) {
            const actualMs = slot.endTime.getTime() - slot.startTime.getTime();
            expect(actualMs).toBe(expectedMs);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: test-automation-suite, Property 3: Slot containment within availability boundaries
  it('Property 3: Every slot is contained within at least one matching availability range', () => {
    fc.assert(
      fc.property(
        fc.array(arbRangeForTestDay, { minLength: 1, maxLength: 3 }),
        fc.constantFrom(30, 60),
        (ranges, duration) => {
          const slots = calculateAvailableSlots(
            ranges,
            [],
            TEST_DATE,
            duration
          );

          fc.pre(slots.length > 0);

          for (const slot of slots) {
            const contained = ranges.some((range) => {
              const rangeStart = new Date(`${TEST_DATE}T00:00:00`);
              const [sh, sm] = range.startTime.split(':').map(Number);
              rangeStart.setHours(sh, sm, 0, 0);

              const rangeEnd = new Date(`${TEST_DATE}T00:00:00`);
              const [eh, em] = range.endTime.split(':').map(Number);
              rangeEnd.setHours(eh, em, 0, 0);

              return (
                slot.startTime.getTime() >= rangeStart.getTime() &&
                slot.endTime.getTime() <= rangeEnd.getTime()
              );
            });
            expect(contained).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: test-automation-suite, Property 4: Metamorphic — more appointments yield fewer or equal slots
  it('Property 4: Adding appointments never increases the number of available slots', () => {
    fc.assert(
      fc.property(
        arbRangeWithOffset,
        ({ range, slotOffset, duration }) => {
          // Slots with no appointments
          const slotsEmpty = calculateAvailableSlots(
            [range],
            [],
            TEST_DATE,
            duration
          );

          // Create an appointment within the range
          const apt = makeAppointment(range, TEST_DATE, duration, slotOffset);
          fc.pre(apt !== null);

          const slotsWithAppointments = calculateAvailableSlots(
            [range],
            [apt!],
            TEST_DATE,
            duration
          );

          expect(slotsEmpty.length).toBeGreaterThanOrEqual(slotsWithAppointments.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: test-automation-suite, Property 5: Slot ordering by startTime
  it('Property 5: Slots are ordered by startTime (non-decreasing)', () => {
    fc.assert(
      fc.property(
        arbRangeForTestDay,
        fc.constantFrom(30, 60),
        (range, duration) => {
          const slots = calculateAvailableSlots(
            [range],
            [],
            TEST_DATE,
            duration
          );

          fc.pre(slots.length > 1);

          for (let i = 0; i < slots.length - 1; i++) {
            expect(slots[i + 1].startTime.getTime()).toBeGreaterThanOrEqual(
              slots[i].startTime.getTime()
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: test-automation-suite, Property 6: Slot grid alignment to 15-minute increments
  it('Property 6: All slot startTimes are aligned to 15-minute grid (minutes in {0,15,30,45}, seconds=0, ms=0)', () => {
    fc.assert(
      fc.property(
        arbRangeForTestDay,
        fc.constantFrom(30, 60),
        (range, duration) => {
          const slots = calculateAvailableSlots(
            [range],
            [],
            TEST_DATE,
            duration
          );

          fc.pre(slots.length > 0);

          const validMinutes = [0, 15, 30, 45];
          for (const slot of slots) {
            expect(validMinutes).toContain(slot.startTime.getMinutes());
            expect(slot.startTime.getSeconds()).toBe(0);
            expect(slot.startTime.getMilliseconds()).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
