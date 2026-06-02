import { Specialty, APPOINTMENT_DURATIONS } from '../models/enums';
import { AvailabilityRange, AvailabilitySchedule } from '../models/types';
import { DoctorSearchResult } from '../models/requests';
import { ERROR_CODES } from '../models/errors';
import * as doctorRepository from '../repositories/doctor.repository';
import * as appointmentRepository from '../repositories/appointment.repository';
import { calculateAvailableSlots } from '../modules/slot-calculator';

/**
 * Searches for doctors by specialty, optionally filtering by available slots on a given date.
 *
 * Logic:
 * 1. Query doctors by specialty (max 50 from repository)
 * 2. If date is provided:
 *    - For each doctor, get their availability ranges for that date's day of week
 *    - Get existing appointments for that date
 *    - Calculate available slots using slot-calculator (FOLLOW_UP duration = 30 for slot generation)
 *    - Filter out doctors with no available slots
 *    - Order results by earliest available slot
 *    - Include available slots in each doctor result
 * 3. If no date provided, return all matching doctors without slot info
 * 4. If no doctors found, return empty array with message
 */
export async function searchDoctors(
  specialty: Specialty,
  date?: string
): Promise<DoctorSearchResult> {
  const doctors = await doctorRepository.searchBySpecialty(specialty);

  if (doctors.length === 0) {
    return {
      doctors: [],
      message: 'No doctors found for the selected specialty and date combination',
    };
  }

  // If no date provided, return all matching doctors without slot info
  if (!date) {
    return { doctors };
  }

  // Calculate available slots for each doctor on the given date
  const targetDate = new Date(`${date}T00:00:00`);
  const dayOfWeek = targetDate.getDay();

  // Use FOLLOW_UP duration (30 min) for slot generation as specified
  const slotDuration = APPOINTMENT_DURATIONS.FOLLOW_UP;

  // Calculate start and end of the target date for appointment queries
  const dateStart = new Date(`${date}T00:00:00`);
  const dateEnd = new Date(`${date}T23:59:59.999`);

  const doctorsWithSlots = await Promise.all(
    doctors.map(async (doctor) => {
      // Get availability ranges for the target date's day of week
      const availabilityRanges = await doctorRepository.getAvailabilityRanges(
        doctor.id,
        dayOfWeek
      );

      // Get existing appointments for that date
      const existingAppointments = await appointmentRepository.findByDoctorAndDateRange(
        doctor.id,
        dateStart,
        dateEnd
      );

      // Calculate available slots
      const availableSlots = calculateAvailableSlots(
        availabilityRanges,
        existingAppointments,
        date,
        slotDuration
      );

      return {
        ...doctor,
        availableSlots,
      };
    })
  );

  // Filter out doctors with no available slots
  const filteredDoctors = doctorsWithSlots.filter(
    (doctor) => doctor.availableSlots.length > 0
  );

  // Order by earliest available slot
  filteredDoctors.sort((a, b) => {
    const earliestA = a.availableSlots[0].startTime.getTime();
    const earliestB = b.availableSlots[0].startTime.getTime();
    return earliestA - earliestB;
  });

  if (filteredDoctors.length === 0) {
    return {
      doctors: [],
      message: 'No doctors found for the selected specialty and date combination',
    };
  }

  return { doctors: filteredDoctors };
}

/**
 * Updates a doctor's availability schedule after validation.
 *
 * Validation:
 * 1. Verify doctor exists (throw DOCTOR_NOT_FOUND if not)
 * 2. Validate endTime > startTime for each range (throw INVALID_TIME_RANGE)
 * 3. Validate max 5 ranges per day (throw TOO_MANY_RANGES)
 * 4. Validate no overlapping ranges on same day (throw OVERLAPPING_RANGES)
 * 5. Persist the updated schedule
 * 6. Return the updated schedule
 */
export async function updateAvailability(
  doctorId: string,
  schedule: AvailabilitySchedule
): Promise<AvailabilitySchedule> {
  // 1. Verify doctor exists
  const doctor = await doctorRepository.findById(doctorId);
  if (!doctor) {
    throw createServiceError(ERROR_CODES.DOCTOR_NOT_FOUND, 'Doctor not found');
  }

  const ranges = schedule.ranges;

  // 2. Validate endTime > startTime for each range
  for (const range of ranges) {
    if (!isEndTimeAfterStartTime(range.startTime, range.endTime)) {
      throw createServiceError(
        ERROR_CODES.INVALID_TIME_RANGE,
        `Invalid time range: end time ${range.endTime} must be after start time ${range.startTime}`
      );
    }
  }

  // 3. Validate max 5 ranges per day
  const rangesByDay = groupRangesByDay(ranges);
  for (const [day, dayRanges] of Object.entries(rangesByDay)) {
    if (dayRanges.length > 5) {
      throw createServiceError(
        ERROR_CODES.TOO_MANY_RANGES,
        `Too many ranges for day ${day}: maximum 5 allowed, got ${dayRanges.length}`
      );
    }
  }

  // 4. Validate no overlapping ranges on same day
  for (const [day, dayRanges] of Object.entries(rangesByDay)) {
    const overlap = findOverlappingRanges(dayRanges);
    if (overlap) {
      throw createServiceError(
        ERROR_CODES.OVERLAPPING_RANGES,
        `Overlapping time ranges on day ${day}: ${overlap.rangeA.startTime}-${overlap.rangeA.endTime} overlaps with ${overlap.rangeB.startTime}-${overlap.rangeB.endTime}`
      );
    }
  }

  // 5. Persist the updated schedule
  await doctorRepository.updateAvailability(doctorId, ranges);

  // 6. Return the updated schedule
  return {
    doctorId,
    ranges,
  };
}

/**
 * Checks if end time is strictly after start time (HH:mm format comparison).
 */
function isEndTimeAfterStartTime(startTime: string, endTime: string): boolean {
  return timeToMinutes(endTime) > timeToMinutes(startTime);
}

/**
 * Converts an HH:mm time string to total minutes since midnight.
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Groups availability ranges by day of week.
 */
function groupRangesByDay(
  ranges: AvailabilityRange[]
): Record<number, AvailabilityRange[]> {
  const grouped: Record<number, AvailabilityRange[]> = {};
  for (const range of ranges) {
    if (!grouped[range.dayOfWeek]) {
      grouped[range.dayOfWeek] = [];
    }
    grouped[range.dayOfWeek].push(range);
  }
  return grouped;
}

/**
 * Finds the first pair of overlapping ranges within a set of ranges for the same day.
 * Uses half-open interval comparison on time strings.
 */
function findOverlappingRanges(
  ranges: AvailabilityRange[]
): { rangeA: AvailabilityRange; rangeB: AvailabilityRange } | null {
  for (let i = 0; i < ranges.length; i++) {
    for (let j = i + 1; j < ranges.length; j++) {
      const startA = timeToMinutes(ranges[i].startTime);
      const endA = timeToMinutes(ranges[i].endTime);
      const startB = timeToMinutes(ranges[j].startTime);
      const endB = timeToMinutes(ranges[j].endTime);

      // Half-open interval overlap: startA < endB && startB < endA
      if (startA < endB && startB < endA) {
        return { rangeA: ranges[i], rangeB: ranges[j] };
      }
    }
  }
  return null;
}

/**
 * Creates a structured service error with code and message.
 */
function createServiceError(code: string, message: string): Error & { code: string } {
  const error = new Error(message) as Error & { code: string };
  error.code = code;
  return error;
}
