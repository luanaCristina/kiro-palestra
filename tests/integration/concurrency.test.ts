import { bookAppointment, AppError } from '../../src/services/appointment.service';
import * as doctorRepository from '../../src/repositories/doctor.repository';
import * as appointmentRepository from '../../src/repositories/appointment.repository';
import { ERROR_CODES } from '../../src/models/errors';
import { Appointment } from '../../src/models/types';

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

const mockedDoctorRepo = doctorRepository as jest.Mocked<typeof doctorRepository>;
const mockedAppointmentRepo = appointmentRepository as jest.Mocked<typeof appointmentRepository>;

/**
 * Integration tests for concurrency control in appointment booking.
 *
 * These tests simulate concurrent booking attempts by controlling mock behavior
 * to replicate the effect of SELECT ... FOR UPDATE serialization.
 *
 * Requirements: 3.3, 3.4
 */
describe('Integration: Concurrency Control', () => {
  const doctorId = 'doctor-concurrent-001';
  const patientId1 = 'patient-001';
  const patientId2 = 'patient-002';
  // Saturday 2025-03-15 at 10:00 UTC
  const slotStartTime = '2025-03-15T10:00:00.000Z';

  const doctor = {
    id: doctorId,
    name: 'Dr. Concurrent',
    specialty: 'cardiology' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up doctor with full-day availability on Saturday (day 6)
    mockedDoctorRepo.findById.mockResolvedValue(doctor);
    mockedDoctorRepo.getAvailabilityRanges.mockResolvedValue([
      { dayOfWeek: 6, startTime: '00:00', endTime: '23:59' },
    ]);

    // Mock patient lookup
    const { query: mockQuery } = require('../../src/config/database');
    mockQuery.mockResolvedValue({ rows: [{ name: 'Test Patient' }] });
  });

  describe('Concurrent booking attempts for same slot', () => {
    it('first request succeeds and second request fails with SLOT_UNAVAILABLE', async () => {
      // Simulate concurrency: the first call to findByDoctorForUpdate returns empty
      // (no existing appointments), and the second call returns the appointment
      // created by the first request (simulating the lock serialization).
      let callCount = 0;

      const createdAppointment: Appointment = {
        id: 'apt-created-by-first',
        doctorId,
        patientId: patientId1,
        startTime: new Date('2025-03-15T10:00:00.000Z'),
        endTime: new Date('2025-03-15T11:00:00.000Z'),
        durationMinutes: 60,
        appointmentType: 'FIRST_VISIT',
        status: 'confirmed',
        createdAt: new Date(),
        cancelledAt: null,
      };

      mockedAppointmentRepo.findByDoctorForUpdate.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          // First request acquires lock, sees no existing appointments
          return [];
        }
        // Second request acquires lock after first commits, sees the new appointment
        return [createdAppointment];
      });

      mockedAppointmentRepo.create.mockResolvedValue(createdAppointment);

      // First booking request
      const request1 = {
        patientId: patientId1,
        doctorId,
        startTime: slotStartTime,
        appointmentType: 'FIRST_VISIT' as const,
      };

      // Second booking request for the same slot
      const request2 = {
        patientId: patientId2,
        doctorId,
        startTime: slotStartTime,
        appointmentType: 'FIRST_VISIT' as const,
      };

      // Execute first request — should succeed
      const result1 = await bookAppointment(request1);
      expect(result1.appointmentId).toBe('apt-created-by-first');
      expect(result1.doctorName).toBe('Dr. Concurrent');
      expect(result1.appointmentType).toBe('FIRST_VISIT');

      // Execute second request — should fail with conflict
      let thrownError: AppError | null = null;
      try {
        await bookAppointment(request2);
      } catch (error) {
        if (error instanceof AppError) {
          thrownError = error;
        } else {
          throw error;
        }
      }

      expect(thrownError).not.toBeNull();
      expect(thrownError!.code).toBe(ERROR_CODES.SLOT_UNAVAILABLE);
      expect(thrownError!.statusCode).toBe(409);
    });

    it('only one appointment is created when two requests target the same slot', async () => {
      let callCount = 0;

      const createdAppointment: Appointment = {
        id: 'apt-single-winner',
        doctorId,
        patientId: patientId1,
        startTime: new Date('2025-03-15T10:00:00.000Z'),
        endTime: new Date('2025-03-15T11:00:00.000Z'),
        durationMinutes: 60,
        appointmentType: 'FIRST_VISIT',
        status: 'confirmed',
        createdAt: new Date(),
        cancelledAt: null,
      };

      mockedAppointmentRepo.findByDoctorForUpdate.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return [];
        }
        return [createdAppointment];
      });

      mockedAppointmentRepo.create.mockResolvedValue(createdAppointment);

      const request1 = {
        patientId: patientId1,
        doctorId,
        startTime: slotStartTime,
        appointmentType: 'FIRST_VISIT' as const,
      };

      const request2 = {
        patientId: patientId2,
        doctorId,
        startTime: slotStartTime,
        appointmentType: 'FIRST_VISIT' as const,
      };

      // Execute both requests sequentially (simulating serialized lock acquisition)
      await bookAppointment(request1);
      try {
        await bookAppointment(request2);
      } catch {
        // Expected to fail
      }

      // Verify create was called exactly once (only the first request persisted)
      expect(mockedAppointmentRepo.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('Rejected request produces no side effects', () => {
    it('no appointment data is persisted when booking is rejected due to overlap', async () => {
      // Set up an existing appointment that occupies the slot
      const existingAppointment: Appointment = {
        id: 'apt-existing-block',
        doctorId,
        patientId: 'other-patient',
        startTime: new Date('2025-03-15T10:00:00.000Z'),
        endTime: new Date('2025-03-15T11:00:00.000Z'),
        durationMinutes: 60,
        appointmentType: 'FIRST_VISIT',
        status: 'confirmed',
        createdAt: new Date(),
        cancelledAt: null,
      };

      mockedAppointmentRepo.findByDoctorForUpdate.mockResolvedValue([existingAppointment]);

      const request = {
        patientId: patientId1,
        doctorId,
        startTime: slotStartTime,
        appointmentType: 'FIRST_VISIT' as const,
      };

      // Attempt booking — should be rejected
      let thrownError: AppError | null = null;
      try {
        await bookAppointment(request);
      } catch (error) {
        if (error instanceof AppError) {
          thrownError = error;
        } else {
          throw error;
        }
      }

      // Verify rejection
      expect(thrownError).not.toBeNull();
      expect(thrownError!.code).toBe(ERROR_CODES.SLOT_UNAVAILABLE);
      expect(thrownError!.statusCode).toBe(409);

      // Verify NO side effects: create was never called
      expect(mockedAppointmentRepo.create).not.toHaveBeenCalled();
      // Verify cancel was never called (no mutation to existing data)
      expect(mockedAppointmentRepo.cancel).not.toHaveBeenCalled();
    });

    it('existing appointments remain unchanged after a rejected booking', async () => {
      const existingAppointment: Appointment = {
        id: 'apt-unchanged',
        doctorId,
        patientId: 'original-patient',
        startTime: new Date('2025-03-15T10:00:00.000Z'),
        endTime: new Date('2025-03-15T11:00:00.000Z'),
        durationMinutes: 60,
        appointmentType: 'FIRST_VISIT',
        status: 'confirmed',
        createdAt: new Date('2025-03-01T00:00:00.000Z'),
        cancelledAt: null,
      };

      mockedAppointmentRepo.findByDoctorForUpdate.mockResolvedValue([existingAppointment]);

      const request = {
        patientId: patientId1,
        doctorId,
        startTime: '2025-03-15T10:30:00.000Z', // Overlaps with existing 10:00-11:00
        appointmentType: 'FOLLOW_UP' as const,
      };

      try {
        await bookAppointment(request);
      } catch {
        // Expected to fail
      }

      // Verify the transaction was rolled back (ROLLBACK was called)
      const { pool } = require('../../src/config/database');
      const mockClient = await pool.connect();
      const queryCalls = mockClient.query.mock.calls.map(
        (call: unknown[]) => call[0]
      );

      // Should have BEGIN and ROLLBACK (no COMMIT)
      expect(queryCalls).toContain('BEGIN');
      expect(queryCalls).toContain('ROLLBACK');
      expect(queryCalls).not.toContain('COMMIT');
    });
  });

  describe('Simulated race condition', () => {
    it('second request sees the first booking after lock release and is rejected', async () => {
      // This simulates the race condition where:
      // 1. Request A acquires the lock, sees no appointments, creates one, commits
      // 2. Request B acquires the lock (after A releases), sees A's appointment, is rejected
      let findForUpdateCallCount = 0;

      const appointmentCreatedByA: Appointment = {
        id: 'apt-race-winner',
        doctorId,
        patientId: patientId1,
        startTime: new Date('2025-03-15T10:00:00.000Z'),
        endTime: new Date('2025-03-15T10:30:00.000Z'),
        durationMinutes: 30,
        appointmentType: 'FOLLOW_UP',
        status: 'confirmed',
        createdAt: new Date(),
        cancelledAt: null,
      };

      mockedAppointmentRepo.findByDoctorForUpdate.mockImplementation(async () => {
        findForUpdateCallCount++;
        if (findForUpdateCallCount === 1) {
          // Request A: lock acquired, no existing appointments
          return [];
        }
        // Request B: lock acquired after A committed, sees A's appointment
        return [appointmentCreatedByA];
      });

      mockedAppointmentRepo.create.mockResolvedValue(appointmentCreatedByA);

      // Request A: FOLLOW_UP at 10:00-10:30
      const requestA = {
        patientId: patientId1,
        doctorId,
        startTime: slotStartTime,
        appointmentType: 'FOLLOW_UP' as const,
      };

      // Request B: FOLLOW_UP at 10:00-10:30 (same slot)
      const requestB = {
        patientId: patientId2,
        doctorId,
        startTime: slotStartTime,
        appointmentType: 'FOLLOW_UP' as const,
      };

      // Request A succeeds
      const resultA = await bookAppointment(requestA);
      expect(resultA.appointmentId).toBe('apt-race-winner');
      expect(resultA.appointmentType).toBe('FOLLOW_UP');

      // Request B fails due to overlap detected after lock acquisition
      let errorB: AppError | null = null;
      try {
        await bookAppointment(requestB);
      } catch (error) {
        if (error instanceof AppError) {
          errorB = error;
        } else {
          throw error;
        }
      }

      expect(errorB).not.toBeNull();
      expect(errorB!.code).toBe(ERROR_CODES.SLOT_UNAVAILABLE);
      expect(errorB!.statusCode).toBe(409);

      // Only one create call was made (for request A)
      expect(mockedAppointmentRepo.create).toHaveBeenCalledTimes(1);
      expect(mockedAppointmentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: patientId1,
          doctorId,
          appointmentType: 'FOLLOW_UP',
        }),
        expect.anything() // the client
      );
    });

    it('partial overlap in race condition is also detected', async () => {
      // Request A books 10:00-11:00 (FIRST_VISIT)
      // Request B tries 10:30-11:00 (FOLLOW_UP) — partial overlap
      let findForUpdateCallCount = 0;

      const appointmentCreatedByA: Appointment = {
        id: 'apt-first-visit-winner',
        doctorId,
        patientId: patientId1,
        startTime: new Date('2025-03-15T10:00:00.000Z'),
        endTime: new Date('2025-03-15T11:00:00.000Z'),
        durationMinutes: 60,
        appointmentType: 'FIRST_VISIT',
        status: 'confirmed',
        createdAt: new Date(),
        cancelledAt: null,
      };

      mockedAppointmentRepo.findByDoctorForUpdate.mockImplementation(async () => {
        findForUpdateCallCount++;
        if (findForUpdateCallCount === 1) {
          return [];
        }
        return [appointmentCreatedByA];
      });

      mockedAppointmentRepo.create.mockResolvedValue(appointmentCreatedByA);

      // Request A: FIRST_VISIT at 10:00-11:00
      const requestA = {
        patientId: patientId1,
        doctorId,
        startTime: slotStartTime,
        appointmentType: 'FIRST_VISIT' as const,
      };

      // Request B: FOLLOW_UP at 10:30-11:00 (overlaps with A)
      const requestB = {
        patientId: patientId2,
        doctorId,
        startTime: '2025-03-15T10:30:00.000Z',
        appointmentType: 'FOLLOW_UP' as const,
      };

      // Request A succeeds
      const resultA = await bookAppointment(requestA);
      expect(resultA.appointmentId).toBe('apt-first-visit-winner');

      // Request B fails — partial overlap detected
      let errorB: AppError | null = null;
      try {
        await bookAppointment(requestB);
      } catch (error) {
        if (error instanceof AppError) {
          errorB = error;
        } else {
          throw error;
        }
      }

      expect(errorB).not.toBeNull();
      expect(errorB!.code).toBe(ERROR_CODES.SLOT_UNAVAILABLE);

      // Only one appointment was created
      expect(mockedAppointmentRepo.create).toHaveBeenCalledTimes(1);
    });
  });
});
