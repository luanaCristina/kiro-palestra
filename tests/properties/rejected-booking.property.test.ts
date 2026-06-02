import * as fc from "fast-check";
import { bookAppointment, AppError } from "../../src/services/appointment.service";
import * as doctorRepository from "../../src/repositories/doctor.repository";
import * as appointmentRepository from "../../src/repositories/appointment.repository";
import { ERROR_CODES } from "../../src/models/errors";
import { Appointment } from "../../src/models/types";
import { AppointmentType } from "../../src/models/enums";

// Mock the database and repositories
jest.mock("../../src/config/database", () => {
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

jest.mock("../../src/repositories/doctor.repository");
jest.mock("../../src/repositories/appointment.repository");

const mockedDoctorRepo = doctorRepository as jest.Mocked<typeof doctorRepository>;
const mockedAppointmentRepo = appointmentRepository as jest.Mocked<typeof appointmentRepository>;

/**
 * Feature: appointment-scheduling, Property 4: Rejected booking produces no side effects
 *
 * **Validates: Requirements 3.4**
 *
 * Tests that when a booking is rejected due to overlap, no appointment data is persisted
 * and existing appointments remain unchanged. Specifically verifies that
 * appointmentRepository.create is NEVER called when a booking is rejected with SLOT_UNAVAILABLE.
 */
describe("Feature: appointment-scheduling, Property 4: Rejected booking produces no side effects", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Generator for appointment types
  const appointmentTypeArb = fc.constantFrom<AppointmentType>("FIRST_VISIT", "FOLLOW_UP");

  // Generator for a booking request that will overlap with an existing appointment
  // We generate a random offset in minutes (0 to durationMinutes-1) to ensure overlap
  const overlappingBookingArb = fc.record({
    appointmentType: appointmentTypeArb,
    // Offset in minutes from the existing appointment's start (creates overlap)
    overlapOffsetMinutes: fc.integer({ min: 0, max: 59 }),
    patientId: fc.uuid(),
    doctorId: fc.uuid(),
  });

  it("appointmentRepository.create is NEVER called when booking is rejected due to overlap", async () => {
    await fc.assert(
      fc.asyncProperty(overlappingBookingArb, async (params) => {
        jest.clearAllMocks();

        const { appointmentType, overlapOffsetMinutes, patientId, doctorId } = params;

        // Set up a doctor with full-day availability
        mockedDoctorRepo.findById.mockResolvedValue({
          id: doctorId,
          name: "Dr. Test",
          specialty: "cardiology",
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        mockedDoctorRepo.getAvailabilityRanges.mockResolvedValue([
          { dayOfWeek: 6, startTime: "00:00", endTime: "23:59" },
        ]);

        // Existing appointment: Saturday 2025-03-15 at 10:00-11:00 (60 min)
        const existingStart = new Date("2025-03-15T10:00:00.000Z");
        const existingEnd = new Date("2025-03-15T11:00:00.000Z");

        const existingAppointment: Appointment = {
          id: "existing-apt-id",
          doctorId,
          patientId: "other-patient-id",
          startTime: existingStart,
          endTime: existingEnd,
          durationMinutes: 60,
          appointmentType: "FIRST_VISIT",
          status: "confirmed",
          createdAt: new Date(),
          cancelledAt: null,
        };

        mockedAppointmentRepo.findByDoctorForUpdate.mockResolvedValue([existingAppointment]);

        // Create a booking request that overlaps with the existing appointment
        // The new appointment starts within the existing appointment's time range
        const newStartTime = new Date(
          existingStart.getTime() + overlapOffsetMinutes * 60 * 1000
        );

        const request = {
          patientId,
          doctorId,
          startTime: newStartTime.toISOString(),
          appointmentType,
        };

        // Attempt the booking - it should be rejected
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

        // Verify the booking was rejected with SLOT_UNAVAILABLE
        expect(thrownError).not.toBeNull();
        expect(thrownError!.code).toBe(ERROR_CODES.SLOT_UNAVAILABLE);

        // CRITICAL ASSERTION: appointmentRepository.create must NEVER be called
        // when a booking is rejected due to overlap
        expect(mockedAppointmentRepo.create).not.toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });

  it("existing appointments remain unchanged when a booking is rejected due to overlap", async () => {
    await fc.assert(
      fc.asyncProperty(overlappingBookingArb, async (params) => {
        jest.clearAllMocks();

        const { appointmentType, overlapOffsetMinutes, patientId, doctorId } = params;

        // Set up a doctor with full-day availability
        mockedDoctorRepo.findById.mockResolvedValue({
          id: doctorId,
          name: "Dr. Test",
          specialty: "cardiology",
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        mockedDoctorRepo.getAvailabilityRanges.mockResolvedValue([
          { dayOfWeek: 6, startTime: "00:00", endTime: "23:59" },
        ]);

        // Existing appointment
        const existingStart = new Date("2025-03-15T10:00:00.000Z");
        const existingEnd = new Date("2025-03-15T11:00:00.000Z");

        const existingAppointment: Appointment = {
          id: "existing-apt-id",
          doctorId,
          patientId: "other-patient-id",
          startTime: existingStart,
          endTime: existingEnd,
          durationMinutes: 60,
          appointmentType: "FIRST_VISIT",
          status: "confirmed",
          createdAt: new Date("2025-03-01T00:00:00.000Z"),
          cancelledAt: null,
        };

        mockedAppointmentRepo.findByDoctorForUpdate.mockResolvedValue([existingAppointment]);

        // Create an overlapping booking request
        const newStartTime = new Date(
          existingStart.getTime() + overlapOffsetMinutes * 60 * 1000
        );

        const request = {
          patientId,
          doctorId,
          startTime: newStartTime.toISOString(),
          appointmentType,
        };

        // Attempt the booking
        try {
          await bookAppointment(request);
        } catch {
          // Expected to throw
        }

        // Verify no mutation operations were called on existing appointments
        expect(mockedAppointmentRepo.create).not.toHaveBeenCalled();
        expect(mockedAppointmentRepo.cancel).not.toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });
});
