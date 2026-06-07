import * as fc from 'fast-check';
import { canCancel } from '../../src/modules/cancellation-policy';
import { Appointment } from '../../src/models/types';
import { AppointmentType, AppointmentStatus } from '../../src/models/enums';

/**
 * Property-based tests for the cancellation-policy module.
 * Validates Properties 12–15 from the design document.
 */

const CANCELLATION_WINDOW_MS = 24 * 60 * 60 * 1000; // 86,400,000ms

// ─── Generators ─────────────────────────────────────────────────────────────

/**
 * Generates a base appointment with arbitrary timestamps and a given status.
 */
function arbAppointmentWithStatus(status: AppointmentStatus): fc.Arbitrary<Appointment> {
  return fc.record({
    id: fc.uuidV(4),
    doctorId: fc.uuidV(4),
    patientId: fc.uuidV(4),
    startTimestamp: fc.integer({ min: 0, max: 4_000_000_000_000 }),
    durationMinutes: fc.constantFrom(30, 60),
    appointmentType: fc.constantFrom<AppointmentType>('FIRST_VISIT', 'FOLLOW_UP'),
    createdAtTimestamp: fc.integer({ min: 0, max: 2_000_000_000_000 }),
  }).map(({ id, doctorId, patientId, startTimestamp, durationMinutes, appointmentType, createdAtTimestamp }) => {
    const startTime = new Date(startTimestamp);
    const endTime = new Date(startTimestamp + durationMinutes * 60 * 1000);
    return {
      id,
      doctorId,
      patientId,
      startTime,
      endTime,
      durationMinutes,
      appointmentType,
      status,
      createdAt: new Date(createdAtTimestamp),
      cancelledAt: status === 'cancelled' ? new Date(createdAtTimestamp + 1000) : null,
    };
  });
}

/**
 * Generates an arbitrary currentTime as a Date.
 */
const arbCurrentTime: fc.Arbitrary<Date> = fc
  .integer({ min: 0, max: 4_000_000_000_000 })
  .map((ts) => new Date(ts));

describe('Cancellation Policy — Property-Based Tests', () => {
  // Feature: test-automation-suite, Property 12: Cancellation idempotency — cancelled appointments always denied
  /**
   * **Validates: Requirements 12.1, 8.1**
   *
   * For any appointment with status === "cancelled" and any currentTime value,
   * canCancel(appointment, currentTime) shall return { allowed: false }
   * with reason indicating already cancelled.
   */
  it('Property 12: cancelled appointments are always denied regardless of currentTime', () => {
    fc.assert(
      fc.property(
        arbAppointmentWithStatus('cancelled'),
        arbCurrentTime,
        (appointment, currentTime) => {
          const result = canCancel(appointment, currentTime);

          expect(result.allowed).toBe(false);
          expect(result.reason).toBeDefined();
          expect(result.reason!.toLowerCase()).toContain('cancelled');
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: test-automation-suite, Property 13: Cancellation permission when more than 24 hours before
  /**
   * **Validates: Requirements 12.2, 8.5**
   *
   * For any appointment with status === "confirmed" where
   * startTime.getTime() - currentTime.getTime() > 86_400_000,
   * canCancel(appointment, currentTime) shall return { allowed: true }.
   */
  it('Property 13: cancellation is allowed when more than 24 hours before start', () => {
    const arbConfirmedMoreThan24h = fc
      .record({
        id: fc.uuidV(4),
        doctorId: fc.uuidV(4),
        patientId: fc.uuidV(4),
        currentTimestamp: fc.integer({ min: 1_000_000_000_000, max: 3_000_000_000_000 }),
        extraMs: fc.integer({ min: 1, max: 7 * 24 * 60 * 60 * 1000 }), // 1ms to 7 days beyond 24h
        durationMinutes: fc.constantFrom(30, 60),
        appointmentType: fc.constantFrom<AppointmentType>('FIRST_VISIT', 'FOLLOW_UP'),
      })
      .map(({ id, doctorId, patientId, currentTimestamp, extraMs, durationMinutes, appointmentType }) => {
        const currentTime = new Date(currentTimestamp);
        const startTimestamp = currentTimestamp + CANCELLATION_WINDOW_MS + extraMs;
        const startTime = new Date(startTimestamp);
        const endTime = new Date(startTimestamp + durationMinutes * 60 * 1000);

        const appointment: Appointment = {
          id,
          doctorId,
          patientId,
          startTime,
          endTime,
          durationMinutes,
          appointmentType,
          status: 'confirmed',
          createdAt: new Date(currentTimestamp - 100_000),
          cancelledAt: null,
        };

        return { appointment, currentTime };
      });

    fc.assert(
      fc.property(arbConfirmedMoreThan24h, ({ appointment, currentTime }) => {
        const result = canCancel(appointment, currentTime);
        expect(result.allowed).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  // Feature: test-automation-suite, Property 14: Cancellation denied within 24-hour window (strict inequality)
  /**
   * **Validates: Requirements 12.3, 8.3, 8.4**
   *
   * For any appointment with status === "confirmed" where
   * 0 < startTime.getTime() - currentTime.getTime() <= 86_400_000
   * (including exactly 24h), canCancel(appointment, currentTime) shall return { allowed: false }.
   */
  it('Property 14: cancellation is denied within 24-hour window (inclusive of exactly 24h)', () => {
    const arbConfirmedWithin24h = fc
      .record({
        id: fc.uuidV(4),
        doctorId: fc.uuidV(4),
        patientId: fc.uuidV(4),
        currentTimestamp: fc.integer({ min: 1_000_000_000_000, max: 3_000_000_000_000 }),
        diffMs: fc.integer({ min: 1, max: CANCELLATION_WINDOW_MS }), // 1ms to exactly 24h
        durationMinutes: fc.constantFrom(30, 60),
        appointmentType: fc.constantFrom<AppointmentType>('FIRST_VISIT', 'FOLLOW_UP'),
      })
      .map(({ id, doctorId, patientId, currentTimestamp, diffMs, durationMinutes, appointmentType }) => {
        const currentTime = new Date(currentTimestamp);
        const startTimestamp = currentTimestamp + diffMs;
        const startTime = new Date(startTimestamp);
        const endTime = new Date(startTimestamp + durationMinutes * 60 * 1000);

        const appointment: Appointment = {
          id,
          doctorId,
          patientId,
          startTime,
          endTime,
          durationMinutes,
          appointmentType,
          status: 'confirmed',
          createdAt: new Date(currentTimestamp - 100_000),
          cancelledAt: null,
        };

        return { appointment, currentTime };
      });

    fc.assert(
      fc.property(arbConfirmedWithin24h, ({ appointment, currentTime }) => {
        const result = canCancel(appointment, currentTime);
        expect(result.allowed).toBe(false);
        expect(result.reason).toBeDefined();
      }),
      { numRuns: 100 }
    );
  });

  // Feature: test-automation-suite, Property 15: Past appointment immutability
  /**
   * **Validates: Requirements 12.4, 8.2**
   *
   * For any appointment where startTime.getTime() <= currentTime.getTime()
   * regardless of status, canCancel(appointment, currentTime) shall return { allowed: false }.
   */
  it('Property 15: past appointments always return allowed: false regardless of status', () => {
    const arbPastAppointment = fc
      .record({
        id: fc.uuidV(4),
        doctorId: fc.uuidV(4),
        patientId: fc.uuidV(4),
        currentTimestamp: fc.integer({ min: 1_000_000_000_000, max: 3_000_000_000_000 }),
        pastOffsetMs: fc.integer({ min: 0, max: 365 * 24 * 60 * 60 * 1000 }), // 0ms to 1 year in the past
        durationMinutes: fc.constantFrom(30, 60),
        appointmentType: fc.constantFrom<AppointmentType>('FIRST_VISIT', 'FOLLOW_UP'),
        status: fc.constantFrom<AppointmentStatus>('confirmed', 'cancelled'),
      })
      .map(({ id, doctorId, patientId, currentTimestamp, pastOffsetMs, durationMinutes, appointmentType, status }) => {
        const currentTime = new Date(currentTimestamp);
        // startTime <= currentTime (past or exactly now)
        const startTimestamp = currentTimestamp - pastOffsetMs;
        const startTime = new Date(startTimestamp);
        const endTime = new Date(startTimestamp + durationMinutes * 60 * 1000);

        const appointment: Appointment = {
          id,
          doctorId,
          patientId,
          startTime,
          endTime,
          durationMinutes,
          appointmentType,
          status,
          createdAt: new Date(startTimestamp - 100_000),
          cancelledAt: status === 'cancelled' ? new Date(startTimestamp + 1000) : null,
        };

        return { appointment, currentTime };
      });

    fc.assert(
      fc.property(arbPastAppointment, ({ appointment, currentTime }) => {
        const result = canCancel(appointment, currentTime);
        expect(result.allowed).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
