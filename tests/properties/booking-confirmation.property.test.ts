import * as fc from 'fast-check';
import { bookAppointment } from '../../src/services/appointment.service';
import * as doctorRepository from '../../src/repositories/doctor.repository';
import * as appointmentRepository from '../../src/repositories/appointment.repository';
import { AppointmentType, APPOINTMENT_DURATIONS, Specialty, SPECIALTIES } from '../../src/models/enums';
import { Appointment } from '../../src/models/types';

/**
 * Property tests for booking confirmation and identifiers.
 *
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 2.4, 2.5, 7.1, 7.2**
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
 * Generates a valid appointment type.
 */
const appointmentTypeArb: fc.Arbitrary<AppointmentType> = fc.constantFrom('FIRST_VISIT', 'FOLLOW_UP');

/**
 * Generates a valid specialty.
 */
const specialtyArb: fc.Arbitrary<Specialty> = fc.constantFrom(...SPECIALTIES);

/**
 * Generates a valid future date (within availability hours).
 * Uses a fixed Saturday (2027-03-20, dayOfWeek=6) to match availability setup.
 */
const startTimeArb: fc.Arbitrary<{ iso: string; date: Date }> = fc
  .record({
    hour: fc.integer({ min: 6, max: 18 }),
    minute: fc.constantFrom(0, 15, 30, 45),
  })
  .map(({ hour, minute }) => {
    // Use a fixed future Saturday: 2027-03-20
    const date = new Date(Date.UTC(2027, 2, 20, hour, minute, 0, 0));
    return { iso: date.toISOString(), date };
  });

/**
 * Generates a valid patient name.
 */
const patientNameArb: fc.Arbitrary<string> = fc
  .tuple(
    fc.constantFrom('John', 'Jane', 'Alice', 'Bob', 'Carlos', 'Diana', 'Eva', 'Frank'),
    fc.constantFrom('Smith', 'Doe', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller')
  )
  .map(([first, last]) => `${first} ${last}`);

/**
 * Generates a valid doctor name.
 */
const doctorNameArb: fc.Arbitrary<string> = fc
  .constantFrom('Dr. Smith', 'Dr. Johnson', 'Dr. Williams', 'Dr. Brown', 'Dr. Garcia', 'Dr. Lee', 'Dr. Chen', 'Dr. Patel');

/**
 * Generates a valid booking request with associated mock data.
 */
const bookingScenarioArb = fc.record({
  appointmentType: appointmentTypeArb,
  specialty: specialtyArb,
  startTime: startTimeArb,
  patientName: patientNameArb,
  doctorName: doctorNameArb,
  patientId: fc.uuid(),
  doctorId: fc.uuid(),
});

// --- Test Setup ---

function setupMocksForBooking(scenario: {
  appointmentType: AppointmentType;
  specialty: Specialty;
  startTime: { iso: string; date: Date };
  patientName: string;
  doctorName: string;
  patientId: string;
  doctorId: string;
}) {
  const { appointmentType, specialty, startTime, patientName, doctorName, patientId, doctorId } = scenario;
  const duration = APPOINTMENT_DURATIONS[appointmentType];
  const endTime = new Date(startTime.date.getTime() + duration * 60 * 1000);

  mockedDoctorRepo.findById.mockResolvedValue({
    id: doctorId,
    name: doctorName,
    specialty,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Doctor is available all day on Saturday (dayOfWeek=6)
  mockedDoctorRepo.getAvailabilityRanges.mockResolvedValue([
    { dayOfWeek: 6, startTime: '00:00', endTime: '23:59' },
  ]);

  // No existing appointments (no overlap)
  mockedAppointmentRepo.findByDoctorForUpdate.mockResolvedValue([]);

  // Mock create to return a proper appointment
  const appointmentId = `apt-${Math.random().toString(36).slice(2, 12)}`;
  mockedAppointmentRepo.create.mockResolvedValue({
    id: appointmentId,
    doctorId,
    patientId,
    startTime: startTime.date,
    endTime,
    durationMinutes: duration,
    appointmentType,
    status: 'confirmed',
    createdAt: new Date(),
    cancelledAt: null,
  });

  // Mock patient name lookup
  const { query: mockQuery } = require('../../src/config/database');
  mockQuery.mockResolvedValue({ rows: [{ name: patientName }] });

  return { appointmentId, endTime };
}

// --- Property Tests ---

describe('Feature: appointment-scheduling, Property 8: Booking confirmation completeness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * **Validates: Requirements 5.1, 5.2**
   *
   * For any successfully booked appointment, the returned confirmation SHALL contain
   * a valid appointment identifier, patient name, doctor name, specialty, date in
   * ISO 8601 format, start time in ISO 8601 format, end time in ISO 8601 format,
   * and appointment type.
   */
  it('every successful booking returns all required fields', async () => {
    await fc.assert(
      fc.asyncProperty(bookingScenarioArb, async (scenario) => {
        jest.clearAllMocks();
        setupMocksForBooking(scenario);

        const request = {
          patientId: scenario.patientId,
          doctorId: scenario.doctorId,
          startTime: scenario.startTime.iso,
          appointmentType: scenario.appointmentType,
        };

        const confirmation = await bookAppointment(request);

        // All required fields must be present and non-empty
        expect(confirmation.appointmentId).toBeDefined();
        expect(typeof confirmation.appointmentId).toBe('string');
        expect(confirmation.appointmentId.length).toBeGreaterThan(0);

        expect(confirmation.patientName).toBeDefined();
        expect(typeof confirmation.patientName).toBe('string');
        expect(confirmation.patientName.length).toBeGreaterThan(0);

        expect(confirmation.doctorName).toBeDefined();
        expect(typeof confirmation.doctorName).toBe('string');
        expect(confirmation.doctorName.length).toBeGreaterThan(0);

        expect(confirmation.specialty).toBeDefined();
        expect(SPECIALTIES).toContain(confirmation.specialty);

        expect(confirmation.date).toBeDefined();
        expect(typeof confirmation.date).toBe('string');
        // ISO 8601 date format: YYYY-MM-DD
        expect(confirmation.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

        expect(confirmation.startTime).toBeDefined();
        expect(typeof confirmation.startTime).toBe('string');
        // ISO 8601 datetime must be parseable
        expect(new Date(confirmation.startTime).toISOString()).toBe(confirmation.startTime);

        expect(confirmation.endTime).toBeDefined();
        expect(typeof confirmation.endTime).toBe('string');
        expect(new Date(confirmation.endTime).toISOString()).toBe(confirmation.endTime);

        expect(confirmation.appointmentType).toBeDefined();
        expect(['FIRST_VISIT', 'FOLLOW_UP']).toContain(confirmation.appointmentType);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Feature: appointment-scheduling, Property 9: Appointment identifier uniqueness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * **Validates: Requirements 5.3**
   *
   * For any set of successfully booked appointments, all generated appointment
   * identifiers SHALL be unique and each SHALL be at least 8 characters in length.
   */
  it('all generated identifiers are unique and at least 8 characters', async () => {
    const identifiers: Set<string> = new Set();
    let counter = 0;

    await fc.assert(
      fc.asyncProperty(bookingScenarioArb, async (scenario) => {
        jest.clearAllMocks();
        counter++;

        // Use a unique appointment ID for each booking
        const uniqueId = `apt-${counter}-${Math.random().toString(36).slice(2, 12)}`;

        mockedDoctorRepo.findById.mockResolvedValue({
          id: scenario.doctorId,
          name: scenario.doctorName,
          specialty: scenario.specialty,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        mockedDoctorRepo.getAvailabilityRanges.mockResolvedValue([
          { dayOfWeek: 6, startTime: '00:00', endTime: '23:59' },
        ]);

        mockedAppointmentRepo.findByDoctorForUpdate.mockResolvedValue([]);

        const duration = APPOINTMENT_DURATIONS[scenario.appointmentType];
        const endTime = new Date(scenario.startTime.date.getTime() + duration * 60 * 1000);

        mockedAppointmentRepo.create.mockResolvedValue({
          id: uniqueId,
          doctorId: scenario.doctorId,
          patientId: scenario.patientId,
          startTime: scenario.startTime.date,
          endTime,
          durationMinutes: duration,
          appointmentType: scenario.appointmentType,
          status: 'confirmed',
          createdAt: new Date(),
          cancelledAt: null,
        });

        const { query: mockQuery } = require('../../src/config/database');
        mockQuery.mockResolvedValue({ rows: [{ name: scenario.patientName }] });

        const request = {
          patientId: scenario.patientId,
          doctorId: scenario.doctorId,
          startTime: scenario.startTime.iso,
          appointmentType: scenario.appointmentType,
        };

        const confirmation = await bookAppointment(request);

        // Each identifier must be at least 8 characters
        expect(confirmation.appointmentId.length).toBeGreaterThanOrEqual(8);

        // Each identifier must be unique across all bookings
        expect(identifiers.has(confirmation.appointmentId)).toBe(false);
        identifiers.add(confirmation.appointmentId);
      }),
      { numRuns: 100 }
    );

    // Verify we collected 100 unique identifiers
    expect(identifiers.size).toBe(100);
  });
});

describe('Feature: appointment-scheduling, Property 10: Duration invariant', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * **Validates: Requirements 5.4, 2.4, 2.5, 7.1, 7.2**
   *
   * For any booked appointment, the end time SHALL equal the start time plus the
   * duration corresponding to the appointment type (60 minutes for FIRST_VISIT,
   * 30 minutes for FOLLOW_UP).
   */
  it('end time equals start time plus correct duration (60 min FIRST_VISIT, 30 min FOLLOW_UP)', async () => {
    await fc.assert(
      fc.asyncProperty(bookingScenarioArb, async (scenario) => {
        jest.clearAllMocks();
        setupMocksForBooking(scenario);

        const request = {
          patientId: scenario.patientId,
          doctorId: scenario.doctorId,
          startTime: scenario.startTime.iso,
          appointmentType: scenario.appointmentType,
        };

        const confirmation = await bookAppointment(request);

        const startMs = new Date(confirmation.startTime).getTime();
        const endMs = new Date(confirmation.endTime).getTime();
        const diffMinutes = (endMs - startMs) / (60 * 1000);

        const expectedDuration = APPOINTMENT_DURATIONS[scenario.appointmentType];

        expect(diffMinutes).toBe(expectedDuration);

        // Verify specific durations per type
        if (scenario.appointmentType === 'FIRST_VISIT') {
          expect(diffMinutes).toBe(60);
        } else {
          expect(diffMinutes).toBe(30);
        }
      }),
      { numRuns: 100 }
    );
  });
});
