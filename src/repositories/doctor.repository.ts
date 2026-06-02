import { pool, query } from '../config/database';
import { Specialty } from '../models/enums';
import { AvailabilityRange, Doctor } from '../models/types';

/**
 * Search doctors by specialty, returning a maximum of 50 results.
 */
export async function searchBySpecialty(specialty: Specialty): Promise<Doctor[]> {
  const result = await query<{
    id: string;
    name: string;
    specialty: string;
    created_at: Date;
    updated_at: Date;
  }>(
    'SELECT id, name, specialty, created_at, updated_at FROM doctors WHERE specialty = $1 LIMIT 50',
    [specialty]
  );

  return result.rows.map(mapRowToDoctor);
}

/**
 * Find a doctor by their unique identifier.
 */
export async function findById(doctorId: string): Promise<Doctor | null> {
  const result = await query<{
    id: string;
    name: string;
    specialty: string;
    created_at: Date;
    updated_at: Date;
  }>(
    'SELECT id, name, specialty, created_at, updated_at FROM doctors WHERE id = $1',
    [doctorId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapRowToDoctor(result.rows[0]);
}

/**
 * Get availability ranges for a doctor, optionally filtered by day of week.
 */
export async function getAvailabilityRanges(
  doctorId: string,
  dayOfWeek?: number
): Promise<AvailabilityRange[]> {
  let sql = 'SELECT day_of_week, start_time, end_time FROM availability_ranges WHERE doctor_id = $1';
  const params: unknown[] = [doctorId];

  if (dayOfWeek !== undefined) {
    sql += ' AND day_of_week = $2';
    params.push(dayOfWeek);
  }

  sql += ' ORDER BY day_of_week, start_time';

  const result = await query<{
    day_of_week: number;
    start_time: string;
    end_time: string;
  }>(sql, params);

  return result.rows.map(mapRowToAvailabilityRange);
}

/**
 * Update a doctor's availability ranges using a transaction.
 * Deletes all existing ranges and inserts the new ones atomically.
 */
export async function updateAvailability(
  doctorId: string,
  ranges: AvailabilityRange[]
): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Delete all existing availability ranges for this doctor
    await client.query(
      'DELETE FROM availability_ranges WHERE doctor_id = $1',
      [doctorId]
    );

    // Insert all new ranges
    for (const range of ranges) {
      await client.query(
        'INSERT INTO availability_ranges (doctor_id, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4)',
        [doctorId, range.dayOfWeek, range.startTime, range.endTime]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Maps a database row to a Doctor interface (snake_case → camelCase).
 */
function mapRowToDoctor(row: {
  id: string;
  name: string;
  specialty: string;
  created_at: Date;
  updated_at: Date;
}): Doctor {
  return {
    id: row.id,
    name: row.name,
    specialty: row.specialty as Specialty,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Maps a database row to an AvailabilityRange interface.
 * Converts TIME columns (returned as "HH:mm:ss") to "HH:mm" format.
 */
function mapRowToAvailabilityRange(row: {
  day_of_week: number;
  start_time: string;
  end_time: string;
}): AvailabilityRange {
  return {
    dayOfWeek: row.day_of_week,
    startTime: formatTime(row.start_time),
    endTime: formatTime(row.end_time),
  };
}

/**
 * Formats a TIME value (which may be "HH:mm:ss") to "HH:mm".
 */
function formatTime(time: string): string {
  const parts = time.split(':');
  return `${parts[0]}:${parts[1]}`;
}
