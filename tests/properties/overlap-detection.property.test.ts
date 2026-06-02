import * as fc from "fast-check";
import { intervalsOverlap, detectOverlap } from "../../src/modules/overlap-detector";
import { Appointment } from "../../src/models/types";

/**
 * Feature: appointment-scheduling, Property 3: Overlap detection correctness
 *
 * Validates: Requirements 3.1, 3.2, 3.5
 *
 * Tests that for any two intervals [startA, endA) and [startB, endB),
 * overlap is detected if and only if startA < endB AND startB < endA.
 * Also tests that adjacent intervals (one ends when other starts) do NOT overlap.
 */
describe("Feature: appointment-scheduling, Property 3: Overlap detection correctness", () => {
  // Generator for a valid interval: start date + positive duration in minutes
  const validIntervalArb = fc
    .tuple(
      fc.date({
        min: new Date("2024-01-01T00:00:00Z"),
        max: new Date("2024-12-31T23:59:59Z"),
      }),
      fc.integer({ min: 1, max: 480 })
    )
    .map(([start, durationMinutes]) => {
      const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
      return { start, end };
    });

  // Generator for a pair of valid intervals
  const intervalPairArb = fc.tuple(validIntervalArb, validIntervalArb);

  it("intervalsOverlap returns true if and only if startA < endB AND startB < endA", () => {
    fc.assert(
      fc.property(intervalPairArb, ([intervalA, intervalB]) => {
        const result = intervalsOverlap(
          intervalA.start,
          intervalA.end,
          intervalB.start,
          intervalB.end
        );

        const expectedOverlap =
          intervalA.start.getTime() < intervalB.end.getTime() &&
          intervalB.start.getTime() < intervalA.end.getTime();

        expect(result).toBe(expectedOverlap);
      }),
      { numRuns: 100 }
    );
  });

  it("adjacent intervals (endA === startB) do NOT overlap", () => {
    fc.assert(
      fc.property(
        fc.date({
          min: new Date("2024-01-01T00:00:00Z"),
          max: new Date("2024-12-30T00:00:00Z"),
        }),
        fc.integer({ min: 1, max: 480 }),
        fc.integer({ min: 1, max: 480 }),
        (startA, durationA, durationB) => {
          const endA = new Date(startA.getTime() + durationA * 60 * 1000);
          const startB = new Date(endA.getTime()); // startB === endA (adjacent)
          const endB = new Date(startB.getTime() + durationB * 60 * 1000);

          const result = intervalsOverlap(startA, endA, startB, endB);

          expect(result).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("adjacent intervals (endB === startA) do NOT overlap", () => {
    fc.assert(
      fc.property(
        fc.date({
          min: new Date("2024-01-02T00:00:00Z"),
          max: new Date("2024-12-31T00:00:00Z"),
        }),
        fc.integer({ min: 1, max: 480 }),
        fc.integer({ min: 1, max: 480 }),
        (startA, durationA, durationB) => {
          const endA = new Date(startA.getTime() + durationA * 60 * 1000);
          const endB = new Date(startA.getTime()); // endB === startA (adjacent)
          const startB = new Date(endB.getTime() - durationB * 60 * 1000);

          const result = intervalsOverlap(startA, endA, startB, endB);

          expect(result).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("overlap is symmetric: intervalsOverlap(A, B) === intervalsOverlap(B, A)", () => {
    fc.assert(
      fc.property(intervalPairArb, ([intervalA, intervalB]) => {
        const resultAB = intervalsOverlap(
          intervalA.start,
          intervalA.end,
          intervalB.start,
          intervalB.end
        );
        const resultBA = intervalsOverlap(
          intervalB.start,
          intervalB.end,
          intervalA.start,
          intervalA.end
        );

        expect(resultAB).toBe(resultBA);
      }),
      { numRuns: 100 }
    );
  });

  it("detectOverlap finds overlap consistent with intervalsOverlap for single existing appointment", () => {
    const appointmentArb = fc
      .tuple(
        fc.date({
          min: new Date("2024-01-01T00:00:00Z"),
          max: new Date("2024-12-31T00:00:00Z"),
        }),
        fc.integer({ min: 1, max: 480 })
      )
      .map(([start, durationMinutes]) => {
        const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
        const appointment: Appointment = {
          id: "test-id",
          doctorId: "doctor-1",
          patientId: "patient-1",
          startTime: start,
          endTime: end,
          durationMinutes,
          appointmentType: "FIRST_VISIT",
          status: "confirmed",
          createdAt: new Date(),
          cancelledAt: null,
        };
        return appointment;
      });

    fc.assert(
      fc.property(
        appointmentArb,
        validIntervalArb,
        (existingAppointment, newInterval) => {
          const result = detectOverlap(
            [existingAppointment],
            newInterval.start,
            newInterval.end
          );

          const expectedOverlap = intervalsOverlap(
            existingAppointment.startTime,
            existingAppointment.endTime,
            newInterval.start,
            newInterval.end
          );

          expect(result.hasOverlap).toBe(expectedOverlap);

          if (result.hasOverlap) {
            expect(result.conflictingAppointment).toBeDefined();
            expect(result.overlappingRange).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
