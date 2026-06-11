import { ClinicLocation } from '../models/types';
import { ERROR_CODES } from '../models/errors';
import { query } from '../config/database';
import * as doctorRepository from '../repositories/doctor.repository';

/**
 * Creates a structured service error with code and message.
 */
function createServiceError(code: string, message: string): Error & { code: string } {
  const error = new Error(message) as Error & { code: string };
  error.code = code;
  return error;
}

/**
 * Updates (or creates) a doctor's clinic location.
 * Verifies the doctor exists before updating.
 *
 * @throws DOCTOR_NOT_FOUND if doctorId does not exist
 */
export async function updateLocation(
  doctorId: string,
  data: { address: string; latitude: number; longitude: number }
): Promise<ClinicLocation> {
  // Verify doctor exists
  const result = await query('SELECT id FROM doctors WHERE id = $1', [doctorId]);
  if (result.rows.length === 0) {
    throw createServiceError(ERROR_CODES.DOCTOR_NOT_FOUND, 'Doctor not found');
  }

  return doctorRepository.updateDoctorLocation(
    doctorId,
    data.address,
    data.latitude,
    data.longitude
  );
}

/**
 * Retrieves a doctor's clinic location.
 * Verifies the doctor exists before querying location.
 *
 * @throws DOCTOR_NOT_FOUND if doctorId does not exist
 * @returns ClinicLocation or null if no location is set
 */
export async function getLocation(
  doctorId: string
): Promise<ClinicLocation | null> {
  // Verify doctor exists
  const result = await query('SELECT id FROM doctors WHERE id = $1', [doctorId]);
  if (result.rows.length === 0) {
    throw createServiceError(ERROR_CODES.DOCTOR_NOT_FOUND, 'Doctor not found');
  }

  return doctorRepository.getDoctorLocation(doctorId);
}
