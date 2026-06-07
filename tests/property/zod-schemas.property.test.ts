import * as fc from 'fast-check';
import {
  arbValidBookingRequest,
  arbInvalidUUID,
  arbValidTime15Min,
  arbInvalidTime15Min,
} from './arbitraries';
import {
  bookingRequestSchema,
  specialtySchema,
  availabilityScheduleSchema,
} from '../../src/validation/schemas';
import { SPECIALTIES } from '../../src/models/enums';

/**
 * Property-based tests for Zod validation schemas.
 * Validates that schemas correctly accept valid inputs and reject invalid inputs
 * across many generated test cases.
 */
describe('Zod Schemas — Property-Based Tests', () => {
  // Feature: test-automation-suite, Property 16: Booking request schema accepts valid inputs
  // **Validates: Requirements 13.1**
  it('Property 16: bookingRequestSchema accepts valid booking requests with UUID v4 IDs, ISO datetime, and valid appointmentType', () => {
    fc.assert(
      fc.property(arbValidBookingRequest, (request) => {
        const result = bookingRequestSchema.safeParse(request);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  // Feature: test-automation-suite, Property 17: Booking request schema rejects invalid UUIDs
  // **Validates: Requirements 13.2**
  it('Property 17: bookingRequestSchema rejects requests with invalid UUID for patientId or doctorId', () => {
    // Zod's .uuid() accepts any valid UUID format (any version), so we filter
    // to strings that are truly not valid UUIDs (don't match 8-4-4-4-12 hex pattern)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const arbNonUUID = arbInvalidUUID.filter((s) => !uuidPattern.test(s));

    fc.assert(
      fc.property(
        arbNonUUID,
        fc.constantFrom('patientId', 'doctorId') as fc.Arbitrary<'patientId' | 'doctorId'>,
        (invalidUuid, field) => {
          // Build a valid request base, then inject the invalid UUID into one field
          const validBase = {
            patientId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            doctorId: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
            startTime: '2027-06-15T10:00:00.000Z',
            appointmentType: 'FIRST_VISIT' as const,
          };

          const request = { ...validBase, [field]: invalidUuid };
          const result = bookingRequestSchema.safeParse(request);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: test-automation-suite, Property 18: Specialty schema rejects invalid values
  // **Validates: Requirements 13.3**
  it('Property 18: specialtySchema rejects strings not in the valid specialties list', () => {
    const validSpecialties = new Set(SPECIALTIES);

    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(
          (s) => !validSpecialties.has(s as any)
        ),
        (invalidSpecialty) => {
          const result = specialtySchema.safeParse(invalidSpecialty);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: test-automation-suite, Property 19: Availability time schema accepts valid 15-minute increments
  // **Validates: Requirements 13.4**
  it('Property 19: availabilityScheduleSchema accepts valid time in 15-minute increments with valid dayOfWeek and endTime > startTime', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 6 }),
        arbValidTime15Min,
        (dayOfWeek, startTime) => {
          // Compute an endTime that is at least 15 minutes after startTime
          const [h, m] = startTime.split(':').map(Number);
          const startMinutes = h * 60 + m;
          // Ensure there's room for endTime > startTime (at least +15 min, still valid)
          if (startMinutes >= 23 * 60 + 45) {
            // startTime is 23:45, no room for valid endTime > startTime
            return; // skip this case
          }

          // Pick the next valid 15-min slot after startTime
          const endMinutes = startMinutes + 15;
          const endH = Math.floor(endMinutes / 60);
          const endM = endMinutes % 60;
          const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

          const schedule = {
            schedule: {
              ranges: [{ dayOfWeek, startTime, endTime }],
            },
          };

          const result = availabilityScheduleSchema.safeParse(schedule);
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: test-automation-suite, Property 20: Availability time schema rejects invalid increments
  // **Validates: Requirements 13.5**
  it('Property 20: availabilityScheduleSchema rejects time strings with minutes NOT in {0, 15, 30, 45}', () => {
    fc.assert(
      fc.property(arbInvalidTime15Min, (invalidTime) => {
        // Use the invalid time as startTime in an availability range
        // endTime is valid so the only failure is the invalid startTime
        const schedule = {
          schedule: {
            ranges: [
              {
                dayOfWeek: 1,
                startTime: invalidTime,
                endTime: '18:00',
              },
            ],
          },
        };

        const result = availabilityScheduleSchema.safeParse(schedule);
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
