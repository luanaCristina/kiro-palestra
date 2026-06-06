import { PoolClient } from 'pg';
import { pool, query } from '../config/database';
import { BookingRequest, BookingConfirmation } from '../models/requests';
import { APPOINTMENT_DURATIONS } from '../models/enums';
import { ERROR_CODES } from '../models/errors';
import { Appointment } from '../models/types';
import * as doctorRepository from '../repositories/doctor.repository';
import * as appointmentRepository from '../repositories/appointment.repository';
import { detectOverlap } from '../modules/overlap-detector';
import { canCancel } from '../modules/cancellation-policy';

/**
 * Custom application error with code and status for route handlers.
 */
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Books an appointment for a patient with a doctor.
 *
 * Logic:
 * 1. Look up the doctor (throw DOCTOR_NOT_FOUND if not found)
 * 2. Parse startTime from the request
 * 3. Calculate endTime = startTime + APPOINTMENT_DURATIONS[appointmentType] minutes
 * 4. Get doctor's availability ranges for the appointment date's day of week
 * 5. If no availability ranges, throw NO_AVAILABILITY error
 * 6. Verify the appointment falls within an availability range
 * 7. Begin a transaction with SELECT ... FOR UPDATE, check overlap, insert or rollback
 * 8. Look up the patient name
 * 9. Return BookingConfirmation
 */
export async function bookAppointment(
  request: BookingRequest
): Promise<BookingConfirmation> {
  // 1. Look up the doctor
  const doctor = await doctorRepository.findById(request.doctorId);
  if (!doctor) {
    throw new AppError(
      ERROR_CODES.DOCTOR_NOT_FOUND,
      'Doctor not found',
      404
    );
  }

  // 2. Parse startTime
  const startTime = new Date(request.startTime);

  // 3. Calculate endTime
  const durationMinutes = APPOINTMENT_DURATIONS[request.appointmentType];
  const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

  // 4. Get doctor's availability ranges for the appointment day of week
  const dayOfWeek = startTime.getDay(); // 0 = Sunday, 6 = Saturday
  const availabilityRanges = await doctorRepository.getAvailabilityRanges(
    request.doctorId,
    dayOfWeek
  );

  // 5. If no availability ranges, throw NO_AVAILABILITY
  if (availabilityRanges.length === 0) {
    throw new AppError(
      ERROR_CODES.NO_AVAILABILITY,
      'Doctor has no available schedule configured',
      409
    );
  }

  // 6. Verify the appointment falls within an availability range
  const appointmentStartTimeStr = formatTimeHHMM(startTime);
  const appointmentEndTimeStr = formatTimeHHMM(endTime);

  const withinAvailability = availabilityRanges.some(
    (range) =>
      appointmentStartTimeStr >= range.startTime &&
      appointmentEndTimeStr <= range.endTime
  );

  if (!withinAvailability) {
    throw new AppError(
      ERROR_CODES.OUTSIDE_AVAILABILITY,
      'Requested time is outside the doctor\'s available hours',
      409
    );
  }

  // 7. Begin transaction with row locking
  const client: PoolClient = await pool.connect();
  let createdAppointment: Appointment;

  try {
    await client.query('BEGIN');

    // Get the date range for the appointment day (start of day to end of day)
    const dateStart = new Date(startTime);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(startTime);
    dateEnd.setHours(23, 59, 59, 999);

    // a. SELECT ... FOR UPDATE on appointments for this doctor on this date
    const existingAppointments = await appointmentRepository.findByDoctorForUpdate(
      client,
      request.doctorId,
      dateStart,
      dateEnd
    );

    // b. Check for overlap
    const overlapResult = detectOverlap(existingAppointments, startTime, endTime);

    // c. If overlap found, ROLLBACK and throw SLOT_UNAVAILABLE
    if (overlapResult.hasOverlap) {
      await client.query('ROLLBACK');
      throw new AppError(
        ERROR_CODES.SLOT_UNAVAILABLE,
        'The requested time slot is no longer available',
        409,
        {
          conflictingRange: overlapResult.overlappingRange
            ? {
                start: overlapResult.overlappingRange.start.toISOString(),
                end: overlapResult.overlappingRange.end.toISOString(),
              }
            : undefined,
        }
      );
    }

    // d. If no overlap, INSERT the appointment
    createdAppointment = await appointmentRepository.create(
      {
        doctorId: request.doctorId,
        patientId: request.patientId,
        startTime,
        endTime,
        durationMinutes,
        appointmentType: request.appointmentType,
        status: 'confirmed',
        cancelledAt: null,
      },
      client
    );

    // e. COMMIT
    await client.query('COMMIT');
  } catch (error) {
    // If it's our AppError (from overlap), re-throw it
    if (error instanceof AppError) {
      throw error;
    }
    // Otherwise rollback and re-throw
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  // 8. Look up the patient name
  const patientName = await getPatientName(request.patientId);

  // 9. Return BookingConfirmation
  const confirmation: BookingConfirmation = {
    appointmentId: createdAppointment.id,
    patientName,
    doctorName: doctor.name,
    specialty: doctor.specialty,
    date: startTime.toISOString().split('T')[0],
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    appointmentType: request.appointmentType,
  };

  return confirmation;
}

/**
 * Cancels an appointment for a patient.
 *
 * Logic:
 * 1. Find the appointment by ID (throw APPOINTMENT_NOT_FOUND if not found)
 * 2. Verify the patientId matches (throw UNAUTHORIZED_CANCEL if mismatch)
 * 3. Check cancellation policy using canCancel
 * 4. Call repository cancel method
 */
export async function cancelAppointment(
  appointmentId: string,
  patientId: string
): Promise<void> {
  // 1. Find the appointment by ID
  const appointment = await appointmentRepository.findById(appointmentId);
  if (!appointment) {
    throw new AppError(
      ERROR_CODES.APPOINTMENT_NOT_FOUND,
      'Appointment not found',
      404
    );
  }

  // 2. Verify the patientId matches
  if (appointment.patientId !== patientId) {
    throw new AppError(
      ERROR_CODES.UNAUTHORIZED_CANCEL,
      'You are not authorized to cancel this appointment',
      403
    );
  }

  // 3. Check cancellation policy
  const cancellationResult = canCancel(appointment, new Date());

  if (!cancellationResult.allowed) {
    // Determine the specific error based on the reason
    if (appointment.status === 'cancelled') {
      throw new AppError(
        ERROR_CODES.ALREADY_CANCELLED,
        'Appointment has already been cancelled',
        400
      );
    }

    if (appointment.startTime <= new Date()) {
      throw new AppError(
        ERROR_CODES.PAST_APPOINTMENT,
        'Past appointments cannot be cancelled',
        400
      );
    }

    // Within 24-hour window
    throw new AppError(
      ERROR_CODES.CANCELLATION_POLICY,
      'Cancellation must be made more than 24 hours before the appointment',
      409
    );
  }

  // 4. Cancel the appointment
  await appointmentRepository.cancel(appointmentId);
}

/**
 * Formats a Date to "HH:mm" string (local time) for availability range comparison.
 * Availability ranges are stored in local time, so we must compare in local time.
 */
function formatTimeHHMM(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Looks up a patient's name by their ID.
 * Falls back to the patientId if the patient is not found.
 */
async function getPatientName(patientId: string): Promise<string> {
  try {
    const result = await query(
      'SELECT name FROM patients WHERE id = $1',
      [patientId]
    );
    if (result.rows.length > 0) {
      return result.rows[0].name as string;
    }
    return patientId;
  } catch {
    return patientId;
  }
}
