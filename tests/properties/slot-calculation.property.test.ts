import * as fc from "fast-check";
import { calculateAvailableSlots } from "../../src/modules/slot-calculator";
import { Appointment, AvailabilityRange, TimeSlot } from "../../src/models/types";
import { AppointmentType } from "../../src/models/enums";

/**
 * Property tests for slot calculation module.
 *
 * **Validates: Requirements 7.3, 7.4, 7.5, 7.7**
 */

// Fixed future date: 2027-03-15 is a Monday (dayOfWeek = 1)
const FIXED_DATE = "2027-03-15";
const FIXED_DAY_OF_WEEK = 1; // Monday

/**
 * Generates a valid 15-minute increment time string (HH:mm).
 * Constrains hours to 6-21 to allow meaningful availability windows.
 */
const timeArb = (minHour = 6, maxHour = 21): fc.Arbitrary<string> =>
  fc
    .record({
      hour: fc.integer({ min: minHour, max: maxHour }),
      minute: fc.constantFrom(0, 15, 30, 45),
    })
    .map(({ hour, minute }) => {
      const h = hour.toString().padStart(2, "0");
      const m = minute.toString().padStart(2, "0");
      return `${h}:${m}`;
    });

/**
 * Converts HH:mm to total minutes since midnight.
 */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Generates a valid availability range for the fixed Monday date.
 * Ensures startTime < endTime with at least 30 minutes gap.
 */
const availabilityRangeArb: fc.Arbitrary<AvailabilityRange> = fc
  .record({
    startHour: fc.integer({ min: 6, max: 19 }),
    startMinute: fc.constantFrom(0, 15, 30, 45),
    durationSlots: fc.integer({ min: 2, max: 12 }), // 30 min to 3 hours in 15-min increments
  })
  .map(({ startHour, startMinute, durationSlots }) => {
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = Math.min(startTotalMinutes + durationSlots * 15, 22 * 60); // cap at 22:00

    const startTime = `${String(startHour).padStart(2, "0")}:${String(startMinute).padStart(2, "0")}`;
    const endHour = Math.floor(endTotalMinutes / 60);
    const endMinute = endTotalMinutes % 60;
    const endTime = `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;

    return {
      dayOfWeek: FIXED_DAY_OF_WEEK,
      startTime,
      endTime,
    };
  })
  .filter((range) => timeToMinutes(range.endTime) > timeToMinutes(range.startTime));

/**
 * Generates a valid appointment duration (30 or 60 minutes).
 */
const durationArb: fc.Arbitrary<number> = fc.constantFrom(30, 60);

/**
 * Generates an existing appointment within a given availability range.
 */
function appointmentWithinRange(range: AvailabilityRange): fc.Arbitrary<Appointment> {
  const rangeStartMinutes = timeToMinutes(range.startTime);
  const rangeEndMinutes = timeToMinutes(range.endTime);
  const rangeSpan = rangeEndMinutes - rangeStartMinutes;

  if (rangeSpan < 30) {
    // Range too small for any appointment
    return fc.constant(null as unknown as Appointment).filter(() => false);
  }

  return fc
    .record({
      startOffset: fc.integer({ min: 0, max: Math.max(0, rangeSpan - 30) }),
      aptDuration: fc.constantFrom(30, 60),
    })
    .filter(({ startOffset, aptDuration }) => {
      return startOffset + aptDuration <= rangeSpan;
    })
    .map(({ startOffset, aptDuration }) => {
      const aptStartMinutes = rangeStartMinutes + startOffset;
      // Align to 15-minute increments
      const alignedStart = Math.floor(aptStartMinutes / 15) * 15;
      const aptStart = new Date(`${FIXED_DATE}T00:00:00`);
      aptStart.setHours(Math.floor(alignedStart / 60), alignedStart % 60, 0, 0);

      const aptEnd = new Date(aptStart.getTime() + aptDuration * 60 * 1000);

      return {
        id: "apt-" + Math.random().toString(36).slice(2, 10),
        doctorId: "doctor-1",
        patientId: "patient-1",
        startTime: aptStart,
        endTime: aptEnd,
        durationMinutes: aptDuration,
        appointmentType: aptDuration === 60 ? "FIRST_VISIT" : "FOLLOW_UP" as AppointmentType,
        status: "confirmed" as const,
        createdAt: new Date(),
        cancelledAt: null,
      };
    });
}

describe("Feature: appointment-scheduling, Property 14: Slot calculation respects appointment duration", () => {
  /**
   * **Validates: Requirements 7.3, 7.4, 7.5**
   *
   * For any doctor's schedule with existing appointments, when calculating available
   * time slots for a given appointment type, every returned slot SHALL have contiguous
   * free time >= the appointment type's duration. No slot SHALL be returned if the free
   * gap at that time is less than the required duration.
   */
  it("every returned slot has contiguous free time >= appointment type's duration", () => {
    fc.assert(
      fc.property(
        availabilityRangeArb,
        durationArb,
        fc.boolean(),
        (range, duration, hasAppointment) => {
          // Optionally generate an existing appointment within the range
          const existingAppointments: Appointment[] = [];

          if (hasAppointment) {
            const rangeStartMinutes = timeToMinutes(range.startTime);
            const rangeEndMinutes = timeToMinutes(range.endTime);
            const rangeSpan = rangeEndMinutes - rangeStartMinutes;

            if (rangeSpan >= 30) {
              // Create a deterministic appointment within the range
              const maxOffset = Math.max(0, rangeSpan - 30);
              const startOffset = Math.floor(maxOffset / 2);
              const alignedStart = Math.floor((rangeStartMinutes + startOffset) / 15) * 15;

              const aptStart = new Date(`${FIXED_DATE}T00:00:00`);
              aptStart.setHours(Math.floor(alignedStart / 60), alignedStart % 60, 0, 0);

              const aptEnd = new Date(aptStart.getTime() + 30 * 60 * 1000);

              existingAppointments.push({
                id: "apt-1",
                doctorId: "doctor-1",
                patientId: "patient-1",
                startTime: aptStart,
                endTime: aptEnd,
                durationMinutes: 30,
                appointmentType: "FOLLOW_UP",
                status: "confirmed",
                createdAt: new Date(),
                cancelledAt: null,
              });
            }
          }

          const slots = calculateAvailableSlots(
            [range],
            existingAppointments,
            FIXED_DATE,
            duration
          );

          // Property: Every returned slot's duration equals the requested duration
          for (const slot of slots) {
            const slotDurationMs = slot.endTime.getTime() - slot.startTime.getTime();
            const slotDurationMinutes = slotDurationMs / (60 * 1000);

            expect(slotDurationMinutes).toBe(duration);
          }

          // Property: No returned slot overlaps with an existing appointment
          for (const slot of slots) {
            for (const apt of existingAppointments) {
              const overlaps =
                slot.startTime.getTime() < apt.endTime.getTime() &&
                apt.startTime.getTime() < slot.endTime.getTime();

              expect(overlaps).toBe(false);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("no slot is returned when free gap is less than required duration", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 6, max: 19 }),
        fc.constantFrom(0, 15, 30, 45),
        durationArb,
        (startHour, startMinute, duration) => {
          // Create a range that is exactly (duration - 15) minutes long
          // This should be too small for the requested duration
          const gapMinutes = duration - 15; // Always less than duration
          const startTotalMinutes = startHour * 60 + startMinute;
          const endTotalMinutes = startTotalMinutes + gapMinutes;

          if (endTotalMinutes > 22 * 60) return; // Skip if exceeds valid time

          const startTime = `${String(startHour).padStart(2, "0")}:${String(startMinute).padStart(2, "0")}`;
          const endHour = Math.floor(endTotalMinutes / 60);
          const endMinute = endTotalMinutes % 60;
          const endTime = `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;

          const range: AvailabilityRange = {
            dayOfWeek: FIXED_DAY_OF_WEEK,
            startTime,
            endTime,
          };

          const slots = calculateAvailableSlots([range], [], FIXED_DATE, duration);

          // No slots should be generated since the gap is smaller than the duration
          expect(slots.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Feature: appointment-scheduling, Property 15: Generated slots respect availability boundaries", () => {
  /**
   * **Validates: Requirements 7.7**
   *
   * For any generated time slot, the slot's end time (start time plus the appointment
   * type's duration) SHALL NOT exceed the doctor's availability schedule end boundary
   * for that day.
   */
  it("no generated slot's end time exceeds the availability range's end boundary", () => {
    fc.assert(
      fc.property(
        availabilityRangeArb,
        durationArb,
        (range, duration) => {
          const slots = calculateAvailableSlots([range], [], FIXED_DATE, duration);

          // Compute the availability end boundary as a Date
          const rangeEndDate = new Date(`${FIXED_DATE}T00:00:00`);
          const [endH, endM] = range.endTime.split(":").map(Number);
          rangeEndDate.setHours(endH, endM, 0, 0);

          // Property: No slot's end time exceeds the availability boundary
          for (const slot of slots) {
            expect(slot.endTime.getTime()).toBeLessThanOrEqual(rangeEndDate.getTime());
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("no generated slot's end time exceeds any of multiple availability range boundaries", () => {
    fc.assert(
      fc.property(
        fc.array(availabilityRangeArb, { minLength: 1, maxLength: 3 }),
        durationArb,
        (ranges, duration) => {
          // Filter to non-overlapping ranges to avoid ambiguity
          const sortedRanges = [...ranges].sort(
            (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
          );
          const nonOverlapping: AvailabilityRange[] = [];
          for (const range of sortedRanges) {
            if (
              nonOverlapping.length === 0 ||
              timeToMinutes(range.startTime) >= timeToMinutes(nonOverlapping[nonOverlapping.length - 1].endTime)
            ) {
              nonOverlapping.push(range);
            }
          }

          if (nonOverlapping.length === 0) return;

          const slots = calculateAvailableSlots(nonOverlapping, [], FIXED_DATE, duration);

          // For each slot, find which availability range it belongs to and verify boundary
          for (const slot of slots) {
            const slotStartMinutes =
              slot.startTime.getHours() * 60 + slot.startTime.getMinutes();

            // Find the range this slot belongs to
            const owningRange = nonOverlapping.find((range) => {
              const rangeStart = timeToMinutes(range.startTime);
              const rangeEnd = timeToMinutes(range.endTime);
              return slotStartMinutes >= rangeStart && slotStartMinutes < rangeEnd;
            });

            expect(owningRange).toBeDefined();

            if (owningRange) {
              const rangeEndDate = new Date(`${FIXED_DATE}T00:00:00`);
              const [endH, endM] = owningRange.endTime.split(":").map(Number);
              rangeEndDate.setHours(endH, endM, 0, 0);

              expect(slot.endTime.getTime()).toBeLessThanOrEqual(rangeEndDate.getTime());
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
