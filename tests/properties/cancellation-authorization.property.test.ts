import * as fc from 'fast-check';
import { cancelAppointment, AppError } from '../../src/services/appointment.service';
import * as appointmentRepository from '../../src/repositories/appointment.repository';
import { ERROR_CODES } from '../../src/models/errors';
import { Appointment } from '../../src/models/types';
import { AppointmentType, AppointmentStatus } from '../../src/models/enums';

// Mock the database and repositories
jest.mock('../../src/config/database', () => {
  const mockClient = {
    query: jest.fn().mockResolvedValue({ rows: [] }),
    release: jest.fn(),
  };
  return {
    pool: {
      connect: jest.fn().mockResolvedValue(mockClient),
    },
    query: jest.fn().mockResolvedValue({ rows: [] }),
  };
});

jest.mock('../../src/repositories/doctor.repository');
jest.mock('../../src/repositories/appointment.repository');

const mockedAppointmentRepo = appointmentRepository as jest.Mocked<typeof appointmentRepository>;

/**
 * Feature: appointment-scheduling, Property 6: Cancellation restores slot availability
 * Feature: appointment-scheduling, Property 7: Cancellation authorization
 *
 * **Validates: Requirements 4.3, 4.5**
 */

// Arbitrary for appointment types
const appointmentTypeArb: fc.Arbitrary<AppointmentType> = fc.constantFrom(
  'FIRST_VISIT',
  'FOLLOW_UP'
);

// Arbitrary for generating random patient IDs
const patientIdArb = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')),
  { minLength: 5, maxLength: 20 }
).map((s) => `patient-${s}`);

// Arbitrary for generating random appointment IDs
const appointmentIdArb = fc.uuid();

// Arbitrary for generating a confirmed appointment more than 24 hours in the future
function confirmedFutureAppointmentArb(patientId: string): fc.Arbitrary<Appointment> {
  return fc.record({
    appointmentType: appointmentTypeArb,
    // Offset from now: between 25 hours and 90 days in the future
    offsetHours: fc.integer({ min: 25, max: 90 * 24 }),
    appointmentId: appointmentIdArb,
    doctorId: fc.uuid(),
  }).map(({ appointmentType, offsetHours, appointmentId, doctorId }) => {
    const durationMinutes = appointmentType === 'FIRST_VISIT' ? 60 : 30;
    const startTime = new Date(Date.now() + offsetHours * 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    return {
      id: appointmentId,
      doctorId,
      patientId,
      startTime,
      endTime,
      durationMinutes,
      appointmentType,
      status: 'confirmed' as AppointmentStatus,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      cancelledAt: null,
    };
  });
}

describe('Feature: appointment-scheduling, Property 6: Cancellation restores slot availability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * **Validates: Requirements 4.3**
   *
   * For any confirmed appointment more than 24 hours in the future,
   * after successful cancellation, the time slot becomes available for new bookings.
   * We verify this by confirming that the cancel repository method is called,
   * which marks the appointment as cancelled and frees the slot.
   */
  it('should restore slot availability after successful cancellation (cancel is called)', () => {
    return fc.assert(
      fc.asyncProperty(
        patientIdArb,
        fc.integer({ min: 25, max: 90 * 24 }),
        appointmentTypeArb,
        appointmentIdArb,
        async (patientId, offsetHours, appointmentType, appointmentId) => {
          jest.clearAllMocks();

          const durationMinutes = appointmentType === 'FIRST_VISIT' ? 60 : 30;
          const startTime = new Date(Date.now() + offsetHours * 60 * 60 * 1000);
          const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

          const appointment: Appointment = {
            id: appointmentId,
            doctorId: 'doctor-123',
            patientId,
            startTime,
            endTime,
            durationMinutes,
            appointmentType,
            status: 'confirmed',
            createdAt: new Date('2024-01-01T00:00:00Z'),
            cancelledAt: null,
          };

          // Mock: appointment exists and belongs to the patient
          mockedAppointmentRepo.findById.mockResolvedValue(appointment);
          mockedAppointmentRepo.cancel.mockResolvedValue(undefined);

          // Perform cancellation
          await cancelAppointment(appointmentId, patientId);

          // Verify cancel was called - this means the slot is freed
          expect(mockedAppointmentRepo.cancel).toHaveBeenCalledWith(appointmentId);
          expect(mockedAppointmentRepo.cancel).toHaveBeenCalledTimes(1);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: appointment-scheduling, Property 7: Cancellation authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * **Validates: Requirements 4.5**
   *
   * For any appointment belonging to patient A, a cancellation request from patient B
   * (where B ≠ A) SHALL be rejected with an authorization error (UNAUTHORIZED_CANCEL, 403),
   * and the appointment SHALL remain unchanged.
   */
  it('should reject cancellation from a different patient with UNAUTHORIZED_CANCEL (403)', () => {
    return fc.assert(
      fc.asyncProperty(
        // Generate two distinct patient IDs
        patientIdArb,
        patientIdArb.filter((id) => id.length > 5), // ensure non-trivial
        fc.integer({ min: 25, max: 90 * 24 }),
        appointmentTypeArb,
        appointmentIdArb,
        async (ownerPatientId, requestingPatientId, offsetHours, appointmentType, appointmentId) => {
          // Ensure the two patient IDs are different
          fc.pre(ownerPatientId !== requestingPatientId);

          jest.clearAllMocks();

          const durationMinutes = appointmentType === 'FIRST_VISIT' ? 60 : 30;
          const startTime = new Date(Date.now() + offsetHours * 60 * 60 * 1000);
          const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

          const appointment: Appointment = {
            id: appointmentId,
            doctorId: 'doctor-456',
            patientId: ownerPatientId,
            startTime,
            endTime,
            durationMinutes,
            appointmentType,
            status: 'confirmed',
            createdAt: new Date('2024-01-01T00:00:00Z'),
            cancelledAt: null,
          };

          // Mock: appointment exists and belongs to ownerPatientId
          mockedAppointmentRepo.findById.mockResolvedValue(appointment);

          // Attempt cancellation from a different patient
          try {
            await cancelAppointment(appointmentId, requestingPatientId);
            // Should not reach here
            fail('Expected AppError to be thrown');
          } catch (error) {
            expect(error).toBeInstanceOf(AppError);
            const appError = error as AppError;
            expect(appError.code).toBe(ERROR_CODES.UNAUTHORIZED_CANCEL);
            expect(appError.statusCode).toBe(403);
          }

          // Verify cancel was NOT called - appointment remains unchanged
          expect(mockedAppointmentRepo.cancel).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });
});
