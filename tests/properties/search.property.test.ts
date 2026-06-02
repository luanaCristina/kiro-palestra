import * as fc from "fast-check";
import { dateQuerySchema } from "../../src/validation/schemas";
import { SPECIALTIES, Specialty, APPOINTMENT_DURATIONS } from "../../src/models/enums";
import { Doctor, Appointment, AvailabilityRange, TimeSlot } from "../../src/models/types";

// Mock the repositories before importing the service
jest.mock("../../src/repositories/doctor.repository");
jest.mock("../../src/repositories/appointment.repository");

import * as doctorRepository from "../../src/repositories/doctor.repository";
import * as appointmentRepository from "../../src/repositories/appointment.repository";
import { searchDoctors } from "../../src/services/doctor.service";

const mockedDoctorRepo = doctorRepository as jest.Mocked<typeof doctorRepository>;
const mockedAppointmentRepo = appointmentRepository as jest.Mocked<typeof appointmentRepository>;

/**
 * Property tests for search results.
 *
 * **Validates: Requirements 1.1, 1.2, 1.4, 1.6**
 */

// Use a fixed future date: 2027-06-16 is a Wednesday (dayOfWeek = 3)
const FIXED_DATE = "2027-06-16";
const FIXED_DAY_OF_WEEK = 3;

/**
 * Generates a random specialty from the valid list.
 */
const specialtyArb: fc.Arbitrary<Specialty> = fc.constantFrom(...SPECIALTIES);

/**
 * Generates a random doctor with a given specialty.
 */
function doctorArb(specialty: Specialty): fc.Arbitrary<Doctor> {
  return fc
    .record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
    })
    .map(({ id, name }) => ({
      id,
      name,
      specialty,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    }));
}

/**
 * Generates a list of doctors (1-60) all with the same specialty.
 */
function doctorListArb(specialty: Specialty): fc.Arbitrary<Doctor[]> {
  return fc.array(doctorArb(specialty), { minLength: 1, maxLength: 60 });
}

/**
 * Generates a valid availability range for the fixed date's day of week.
 * Ensures startTime < endTime with at least 60 minutes gap to allow slots.
 */
const availabilityRangeArb: fc.Arbitrary<AvailabilityRange> = fc
  .record({
    startHour: fc.integer({ min: 7, max: 18 }),
    startMinute: fc.constantFrom(0, 15, 30, 45),
    durationSlots: fc.integer({ min: 4, max: 16 }), // 60 min to 4 hours in 15-min increments
  })
  .map(({ startHour, startMinute, durationSlots }) => {
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = Math.min(startTotalMinutes + durationSlots * 15, 22 * 60);

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
  .filter((range) => {
    const [sh, sm] = range.startTime.split(":").map(Number);
    const [eh, em] = range.endTime.split(":").map(Number);
    return eh * 60 + em - (sh * 60 + sm) >= 60; // At least 60 min gap
  });

describe("Feature: appointment-scheduling, Property 1: Search results are filtered, bounded, and ordered", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * **Validates: Requirements 1.1, 1.2, 1.4**
   *
   * For any set of doctors with varying specialties and availability schedules,
   * and any valid search query (specialty + optional date), the returned results
   * SHALL contain at most 50 doctors, all matching the requested specialty,
   * each having at least one available future time slot on the specified date
   * (if provided), ordered by earliest available slot.
   */
  it("results contain at most 50 doctors, all matching specialty, with available slots, ordered by earliest slot", async () => {
    await fc.assert(
      fc.asyncProperty(
        specialtyArb,
        fc.integer({ min: 1, max: 60 }),
        availabilityRangeArb,
        async (specialty, doctorCount, availRange) => {
          // Generate doctors with the requested specialty
          const doctors: Doctor[] = Array.from({ length: doctorCount }, (_, i) => ({
            id: `doctor-${i}-${Math.random().toString(36).slice(2, 10)}`,
            name: `Dr. Test ${i}`,
            specialty,
            createdAt: new Date("2024-01-01"),
            updatedAt: new Date("2024-01-01"),
          }));

          // Repository returns at most 50 doctors (as per its LIMIT 50)
          const repoResult = doctors.slice(0, 50);

          mockedDoctorRepo.searchBySpecialty.mockResolvedValue(repoResult);
          mockedDoctorRepo.getAvailabilityRanges.mockResolvedValue([availRange]);
          mockedAppointmentRepo.findByDoctorAndDateRange.mockResolvedValue([]);

          const result = await searchDoctors(specialty, FIXED_DATE);

          // Property 1a: Results contain at most 50 doctors
          expect(result.doctors.length).toBeLessThanOrEqual(50);

          // Property 1b: All doctors match the requested specialty
          for (const doctor of result.doctors) {
            expect(doctor.specialty).toBe(specialty);
          }

          // Property 1c: When date is provided, each doctor has at least one available slot
          if (result.doctors.length > 0) {
            for (const doctor of result.doctors) {
              const docWithSlots = doctor as Doctor & { availableSlots?: TimeSlot[] };
              expect(docWithSlots.availableSlots).toBeDefined();
              expect(docWithSlots.availableSlots!.length).toBeGreaterThan(0);
            }
          }

          // Property 1d: Results are ordered by earliest available slot
          if (result.doctors.length > 1) {
            for (let i = 0; i < result.doctors.length - 1; i++) {
              const currentDoc = result.doctors[i] as Doctor & { availableSlots: TimeSlot[] };
              const nextDoc = result.doctors[i + 1] as Doctor & { availableSlots: TimeSlot[] };
              const earliestCurrent = currentDoc.availableSlots[0].startTime.getTime();
              const earliestNext = nextDoc.availableSlots[0].startTime.getTime();
              expect(earliestCurrent).toBeLessThanOrEqual(earliestNext);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("doctors with no available slots are excluded from results when date is provided", async () => {
    await fc.assert(
      fc.asyncProperty(
        specialtyArb,
        fc.integer({ min: 2, max: 10 }),
        async (specialty, doctorCount) => {
          const doctors: Doctor[] = Array.from({ length: doctorCount }, (_, i) => ({
            id: `doctor-${i}-${Math.random().toString(36).slice(2, 10)}`,
            name: `Dr. Test ${i}`,
            specialty,
            createdAt: new Date("2024-01-01"),
            updatedAt: new Date("2024-01-01"),
          }));

          mockedDoctorRepo.searchBySpecialty.mockResolvedValue(doctors);

          // First doctor has availability, rest have none
          mockedDoctorRepo.getAvailabilityRanges.mockImplementation(
            async (doctorId: string) => {
              if (doctorId === doctors[0].id) {
                return [
                  {
                    dayOfWeek: FIXED_DAY_OF_WEEK,
                    startTime: "09:00",
                    endTime: "17:00",
                  },
                ];
              }
              return []; // No availability for other doctors
            }
          );
          mockedAppointmentRepo.findByDoctorAndDateRange.mockResolvedValue([]);

          const result = await searchDoctors(specialty, FIXED_DATE);

          // Only the doctor with availability should be in results
          expect(result.doctors.length).toBe(1);
          expect(result.doctors[0].id).toBe(doctors[0].id);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Feature: appointment-scheduling, Property 2: Date range validation", () => {
  /**
   * **Validates: Requirements 1.6**
   *
   * For any date that is in the past or more than 90 days in the future,
   * a search request with that date SHALL be rejected with a validation error.
   */
  it("dates in the past are rejected by validation", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 365 }),
        (daysInPast) => {
          const pastDate = new Date();
          pastDate.setUTCHours(0, 0, 0, 0);
          pastDate.setUTCDate(pastDate.getUTCDate() - daysInPast);

          const dateStr = pastDate.toISOString().split("T")[0];
          const result = dateQuerySchema.safeParse(dateStr);

          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("dates more than 90 days in the future are rejected by validation", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 91, max: 365 }),
        (daysInFuture) => {
          const futureDate = new Date();
          futureDate.setUTCHours(0, 0, 0, 0);
          futureDate.setUTCDate(futureDate.getUTCDate() + daysInFuture);

          const dateStr = futureDate.toISOString().split("T")[0];
          const result = dateQuerySchema.safeParse(dateStr);

          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("dates within valid range (today to 90 days in the future) pass validation", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 90 }),
        (daysInFuture) => {
          const validDate = new Date();
          validDate.setUTCHours(0, 0, 0, 0);
          validDate.setUTCDate(validDate.getUTCDate() + daysInFuture);

          const dateStr = validDate.toISOString().split("T")[0];
          const result = dateQuerySchema.safeParse(dateStr);

          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
