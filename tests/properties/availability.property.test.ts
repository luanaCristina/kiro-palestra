import * as fc from 'fast-check';
import { updateAvailability } from '../../src/services/doctor.service';
import { bookAppointment, AppError } from '../../src/services/appointment.service';
import * as doctorRepository from '../../src/repositories/doctor.repository';
import * as appointmentRepository from '../../src/repositories/appointment.repository';
import { ERROR_CODES } from '../../src/models/errors';
import { Appointment, AvailabilityRange } from '../../src/models/types';
import { AppointmentType, APPOINTMENT_DURATIONS } from '../../src/models/enums';

/**
 * Property tests for availability configuration.
 *
 * **Validates: Requirements 6.2, 6.3, 6.5, 6.7**
 */

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
    query: jest.fn().mockResolvedValue({ rows: [{ name: 'Test Patient' }] }),
  };
});

jest.mock('../../src/repositories/doctor.repository');
jest.mock('../../src/repositories/appointment.repository');

const mockedDoctorRepo = doctorRepository as jest.Mocked<typeof doctorRepository>;
const mockedAppointmentRepo = appointmentRepository as jest.Mocked<typeof appointmentRepository>;

// --- Arbitraries ---

/**
 * Generates a valid day of week (0-6).
 */
const dayOfWeekArb = fc.integer({ min: 0, max: 6 });

/**
 * Generates a valid time in HH:mm format at 15-minute increments.
 */
const timeArb = fc
  .record({
    hour: fc.integer({ min: 0, max: 23 }),
    quarter: fc.integer({ min: 0, max: 3 }),
  })
  .map(({ hour, quarter }) => {
    const minute = quarter * 15;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  });

/**
 * Converts HH:mm to total minutes since midnight.
 */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Generates a valid non-overlapping availability range (endTime > startTime).
 */
const validRangeArb = (day: number): fc.Arbitrary<AvailabilityRange> =>
  fc
    .record({
      startHour: fc.integer({ min: 0, max: 22 }),
      startQuarter: fc.integer({ min: 0, max: 3 }),
      durationQuarters: fc.integer({ min: 1, max: 8 }), // 15 min to 2 hours
    })
    .filter(({ startHour, startQuarter, durationQuarters }) => {
      const startMinutes = startHour * 60 + startQuarter * 15;
      const endMinutes = startMinutes + durationQuarters * 15;
      return endMinutes <= 24 * 60; // Must not exceed midnight
    })
    .map(({ startHour, startQuarter, durationQuarters }) => {
      const startMinutes = startHour * 60 + startQuarter * 15;
      const endMinutes = startMinutes + durationQuarters * 15;
      const startTime = `${Math.floor(startMinutes / 60).toString().padStart(2, '0')}:${(startMinutes % 60).toString().padStart(2, '0')}`;
      const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;
      return { dayOfWeek: day, startTime, endTime };
    });

/**
 * Generates a pair of overlapping time ranges on the same day.
 * Ensures startA < endB AND startB < endA (half-open interval overlap).
 */
const overlappingRangePairArb = fc
  .record({
    day: dayOfWeekArb,
    startAHour: fc.integer({ min: 0, max: 20 }),
    startAQuarter: fc.integer({ min: 0, max: 3 }),
    durationAQuarters: fc.integer({ min: 2, max: 8 }),
    overlapOffsetQuarters: fc.integer({ min: 1, max: 4 }),
  })
  .filter(({ startAHour, startAQuarter, durationAQuarters, overlapOffsetQuarters }) => {
    const startAMinutes = startAHour * 60 + startAQuarter * 15;
    const endAMinutes = startAMinutes + durationAQuarters * 15;
    const startBMinutes = startAMinutes + overlapOffsetQuarters * 15;
    const endBMinutes = startBMinutes + durationAQuarters * 15;
    // Both ranges must fit within a day
    return endAMinutes <= 24 * 60 && endBMinutes <= 24 * 60 && startBMinutes < endAMinutes;
  })
  .map(({ day, startAHour, startAQuarter, durationAQuarters, overlapOffsetQuarters }) => {
    const startAMinutes = startAHour * 60 + startAQuarter * 15;
    const endAMinutes = startAMinutes + durationAQuarters * 15;
    const startBMinutes = startAMinutes + overlapOffsetQuarters * 15;
    const endBMinutes = startBMinutes + durationAQuarters * 15;

    const formatMinutes = (m: number) =>
      `${Math.floor(m / 60).toString().padStart(2, '0')}:${(m % 60).toString().padStart(2, '0')}`;

    const rangeA: AvailabilityRange = {
      dayOfWeek: day,
      startTime: formatMinutes(startAMinutes),
      endTime: formatMinutes(endAMinutes),
    };
    const rangeB: AvailabilityRange = {
      dayOfWeek: day,
      startTime: formatMinutes(startBMinutes),
      endTime: formatMinutes(endBMinutes),
    };

    return { day, rangeA, rangeB };
  });

/**
 * Generates a valid appointment type.
 */
const appointmentTypeArb: fc.Arbitrary<AppointmentType> = fc.constantFrom('FIRST_VISIT', 'FOLLOW_UP');

// --- Property Tests ---

describe('Feature: appointment-scheduling, Property 11: Availability schedule update preserves existing appointments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * **Validates: Requirements 6.2**
   *
   * For any doctor with existing confirmed appointments, when the doctor's availability
   * schedule is updated, all previously confirmed appointments SHALL remain unchanged
   * in the system regardless of whether they fall within the new schedule.
   */
  it('updating availability does not modify existing appointments', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          doctorId: fc.uuid(),
          day: dayOfWeekArb,
          numExistingAppointments: fc.integer({ min: 1, max: 5 }),
        }),
        validRangeArb(1), // new schedule range for Monday
        async ({ doctorId, day, numExistingAppointments }, newRange) => {
          jest.clearAllMocks();

          // Mock doctor exists
          mockedDoctorRepo.findById.mockResolvedValue({
            id: doctorId,
            name: 'Dr. Test',
            specialty: 'cardiology',
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          // Mock updateAvailability to succeed
          mockedDoctorRepo.updateAvailability.mockResolvedValue();

          // Create existing confirmed appointments
          const existingAppointments: Appointment[] = [];
          for (let i = 0; i < numExistingAppointments; i++) {
            existingAppointments.push({
              id: `apt-${i}`,
              doctorId,
              patientId: `patient-${i}`,
              startTime: new Date(`2027-03-20T${(9 + i).toString().padStart(2, '0')}:00:00.000Z`),
              endTime: new Date(`2027-03-20T${(9 + i).toString().padStart(2, '0')}:30:00.000Z`),
              durationMinutes: 30,
              appointmentType: 'FOLLOW_UP',
              status: 'confirmed',
              createdAt: new Date(),
              cancelledAt: null,
            });
          }

          // Call updateAvailability with a new schedule
          const schedule = {
            doctorId,
            ranges: [newRange],
          };

          await updateAvailability(doctorId, schedule);

          // CRITICAL ASSERTION: appointmentRepository should NEVER be called
          // to modify existing appointments during an availability update
          expect(mockedAppointmentRepo.create).not.toHaveBeenCalled();
          expect(mockedAppointmentRepo.cancel).not.toHaveBeenCalled();

          // Verify that only doctorRepository.updateAvailability was called
          // to persist the new schedule
          expect(mockedDoctorRepo.updateAvailability).toHaveBeenCalledTimes(1);
          expect(mockedDoctorRepo.updateAvailability).toHaveBeenCalledWith(
            doctorId,
            [newRange]
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: appointment-scheduling, Property 12: Availability enforcement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * **Validates: Requirements 6.3, 6.7**
   *
   * For any booking request where the requested time falls outside the doctor's
   * configured availability schedule, or where the doctor has no availability
   * schedule configured, the system SHALL reject the booking with an appropriate error.
   */
  it('bookings outside configured availability are rejected with OUTSIDE_AVAILABILITY', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          doctorId: fc.uuid(),
          patientId: fc.uuid(),
          appointmentType: appointmentTypeArb,
          // Generate a booking hour that is OUTSIDE the availability window (18:00-23:00)
          bookingHour: fc.integer({ min: 18, max: 22 }),
          bookingMinute: fc.constantFrom(0, 15, 30, 45),
        }),
        async ({ doctorId, patientId, appointmentType, bookingHour, bookingMinute }) => {
          jest.clearAllMocks();

          // Mock doctor exists
          mockedDoctorRepo.findById.mockResolvedValue({
            id: doctorId,
            name: 'Dr. Test',
            specialty: 'cardiology',
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          // Doctor is available only 08:00-12:00 on Saturday (dayOfWeek=6)
          mockedDoctorRepo.getAvailabilityRanges.mockResolvedValue([
            { dayOfWeek: 6, startTime: '08:00', endTime: '12:00' },
          ]);

          // Use a fixed future Saturday: 2027-03-20
          const startTime = new Date(Date.UTC(2027, 2, 20, bookingHour, bookingMinute, 0, 0));

          const request = {
            patientId,
            doctorId,
            startTime: startTime.toISOString(),
            appointmentType,
          };

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

          // Booking must be rejected with OUTSIDE_AVAILABILITY
          expect(thrownError).not.toBeNull();
          expect(thrownError!.code).toBe(ERROR_CODES.OUTSIDE_AVAILABILITY);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('bookings with no availability schedule are rejected with NO_AVAILABILITY', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          doctorId: fc.uuid(),
          patientId: fc.uuid(),
          appointmentType: appointmentTypeArb,
          bookingHour: fc.integer({ min: 8, max: 17 }),
          bookingMinute: fc.constantFrom(0, 15, 30, 45),
        }),
        async ({ doctorId, patientId, appointmentType, bookingHour, bookingMinute }) => {
          jest.clearAllMocks();

          // Mock doctor exists
          mockedDoctorRepo.findById.mockResolvedValue({
            id: doctorId,
            name: 'Dr. Test',
            specialty: 'cardiology',
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          // Doctor has NO availability ranges configured
          mockedDoctorRepo.getAvailabilityRanges.mockResolvedValue([]);

          // Use a fixed future Saturday: 2027-03-20
          const startTime = new Date(Date.UTC(2027, 2, 20, bookingHour, bookingMinute, 0, 0));

          const request = {
            patientId,
            doctorId,
            startTime: startTime.toISOString(),
            appointmentType,
          };

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

          // Booking must be rejected with NO_AVAILABILITY
          expect(thrownError).not.toBeNull();
          expect(thrownError!.code).toBe(ERROR_CODES.NO_AVAILABILITY);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: appointment-scheduling, Property 13: Overlapping availability ranges rejected', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * **Validates: Requirements 6.5**
   *
   * For any availability schedule configuration containing two or more time ranges
   * on the same day where any portion of their time ranges intersect, the system
   * SHALL reject the configuration with a validation error.
   */
  it('overlapping time ranges on the same day are rejected with OVERLAPPING_RANGES', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({ doctorId: fc.uuid() }),
        overlappingRangePairArb,
        async ({ doctorId }, { rangeA, rangeB }) => {
          jest.clearAllMocks();

          // Mock doctor exists
          mockedDoctorRepo.findById.mockResolvedValue({
            id: doctorId,
            name: 'Dr. Test',
            specialty: 'cardiology',
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          const schedule = {
            doctorId,
            ranges: [rangeA, rangeB],
          };

          let thrownError: Error & { code?: string } | null = null;
          try {
            await updateAvailability(doctorId, schedule);
          } catch (error) {
            thrownError = error as Error & { code?: string };
          }

          // Must be rejected with OVERLAPPING_RANGES
          expect(thrownError).not.toBeNull();
          expect(thrownError!.code).toBe(ERROR_CODES.OVERLAPPING_RANGES);
        }
      ),
      { numRuns: 100 }
    );
  });
});
