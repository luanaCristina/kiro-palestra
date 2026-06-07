import * as fc from 'fast-check';
import { arbIntervalPair } from './arbitraries';
import { intervalsOverlap, detectOverlap } from '../../src/modules/overlap-detector';
import { Appointment } from '../../src/models/types';

/**
 * Property-based tests for the overlap-detector module.
 * Validates mathematical invariants of half-open interval overlap detection.
 */
describe('Overlap Detector — Property-Based Tests', () => {
  // Feature: test-automation-suite, Property 7: Overlap commutativity
  // **Validates: Requirements 11.1**
  it('Property 7: intervalsOverlap is commutative — swapping intervals yields the same result', () => {
    fc.assert(
      fc.property(arbIntervalPair, ({ startA, endA, startB, endB }) => {
        const resultAB = intervalsOverlap(startA, endA, startB, endB);
        const resultBA = intervalsOverlap(startB, endB, startA, endA);
        expect(resultAB).toBe(resultBA);
      }),
      { numRuns: 100 }
    );
  });

  // Feature: test-automation-suite, Property 8: Overlap reflexivity
  // **Validates: Requirements 11.2**
  it('Property 8: Any interval overlaps with itself (reflexivity)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1_000_000_000_000, max: 2_000_000_000_000 }),
        fc.integer({ min: 1, max: 7_200_000 }),
        (baseTimestamp, duration) => {
          const start = new Date(baseTimestamp);
          const end = new Date(baseTimestamp + duration);
          expect(intervalsOverlap(start, end, start, end)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: test-automation-suite, Property 9: Half-open adjacency non-overlap
  // **Validates: Requirements 11.3**
  it('Property 9: Adjacent half-open intervals [A,B) and [B,C) do not overlap', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1_000_000_000_000, max: 2_000_000_000_000 }),
        fc.integer({ min: 1, max: 3_600_000 }),
        fc.integer({ min: 1, max: 3_600_000 }),
        (baseTimestamp, durationAB, durationBC) => {
          const a = new Date(baseTimestamp);
          const b = new Date(baseTimestamp + durationAB);
          const c = new Date(b.getTime() + durationBC);
          // A < B < C guaranteed by positive durations
          expect(intervalsOverlap(a, b, b, c)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: test-automation-suite, Property 10: Disjoint intervals non-overlap
  // **Validates: Requirements 11.4**
  it('Property 10: Disjoint intervals do not overlap (D <= A or B <= C)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1_000_000_000_000, max: 2_000_000_000_000 }),
        fc.integer({ min: 1, max: 3_600_000 }),
        fc.integer({ min: 1, max: 3_600_000 }),
        fc.integer({ min: 0, max: 3_600_000 }),
        fc.boolean(),
        (baseTimestamp, durationA, durationB, gap, placeBefore) => {
          const startA = new Date(baseTimestamp);
          const endA = new Date(baseTimestamp + durationA);

          let startB: Date;
          let endB: Date;

          if (placeBefore) {
            // Case: D <= A (interval B ends at or before interval A starts)
            endB = new Date(startA.getTime() - gap);
            startB = new Date(endB.getTime() - durationB);
          } else {
            // Case: B <= C (interval A ends at or before interval B starts)
            startB = new Date(endA.getTime() + gap);
            endB = new Date(startB.getTime() + durationB);
          }

          // Ensure valid intervals (end > start)
          fc.pre(endB.getTime() > startB.getTime());
          fc.pre(endA.getTime() > startA.getTime());

          expect(intervalsOverlap(startA, endA, startB, endB)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: test-automation-suite, Property 11: Correct overlap range calculation
  // **Validates: Requirements 11.5**
  it('Property 11: When overlap exists, overlappingRange equals max(starts)..min(ends)', () => {
    fc.assert(
      fc.property(
        arbIntervalPair.filter(({ startA, endA, startB, endB }) =>
          intervalsOverlap(startA, endA, startB, endB)
        ),
        ({ startA, endA, startB, endB }) => {
          // Create a minimal appointment spanning [startA, endA)
          const appointment: Appointment = {
            id: '00000000-0000-4000-8000-000000000001',
            doctorId: '00000000-0000-4000-8000-000000000002',
            patientId: '00000000-0000-4000-8000-000000000003',
            startTime: startA,
            endTime: endA,
            durationMinutes: Math.round((endA.getTime() - startA.getTime()) / 60000),
            appointmentType: 'FIRST_VISIT',
            status: 'confirmed',
            createdAt: new Date(),
            cancelledAt: null,
          };

          const result = detectOverlap([appointment], startB, endB);

          expect(result.hasOverlap).toBe(true);
          expect(result.overlappingRange).toBeDefined();

          const expectedStart = new Date(Math.max(startA.getTime(), startB.getTime()));
          const expectedEnd = new Date(Math.min(endA.getTime(), endB.getTime()));

          expect(result.overlappingRange!.start.getTime()).toBe(expectedStart.getTime());
          expect(result.overlappingRange!.end.getTime()).toBe(expectedEnd.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });
});
