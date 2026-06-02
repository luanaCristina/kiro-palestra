import { PoolClient } from 'pg';
import { query } from '../config/database';
import { Appointment } from '../models/types';
import { AppointmentStatus, AppointmentType } from '../models/enums';

/**
 * Maps a database row (snake_case) to an Appointment object (camelCase).
 */
function mapRowToAppointment(row: Record<string, unknown>): Appointment {
  return {
    id: row.id as string,
    doctorId: row.doctor_id as string,
    patientId: row.patient_id as string,
    startTime: new Date(row.start_time as string),
    endTime: new Date(row.end_time as string),
    durationMinutes: row.duration_minutes as number,
    appointmentType: row.appointment_type as AppointmentType,
    status: row.status as AppointmentStatus,
    createdAt: new Date(row.created_at as string),
    cancelledAt: row.cancelled_at ? new Date(row.cancelled_at as string) : null,
  };
}

/**
 * Finds all non-cancelled appointments for a doctor within a date range.
 * Used for availability checks and slot calculation.
 */
export async function findByDoctorAndDateRange(
  doctorId: string,
  startDate: Date,
  endDate: Date
): Promise<Appointment[]> {
  const result = await query(
    `SELECT * FROM appointments
     WHERE doctor_id = $1
       AND start_time >= $2
       AND start_time < $3
       AND status != 'cancelled'
     ORDER BY start_time ASC`,
    [doctorId, startDate.toISOString(), endDate.toISOString()]
  );

  return result.rows.map(mapRowToAppointment);
}

/**
 * Finds all non-cancelled appointments for a doctor within a date range
 * using SELECT ... FOR UPDATE to lock rows for concurrency control.
 * Must be called within a transaction (using a PoolClient).
 */
export async function findByDoctorForUpdate(
  client: PoolClient,
  doctorId: string,
  startDate: Date,
  endDate: Date
): Promise<Appointment[]> {
  const result = await client.query(
    `SELECT * FROM appointments
     WHERE doctor_id = $1
       AND start_time >= $2
       AND start_time < $3
       AND status != 'cancelled'
     FOR UPDATE`,
    [doctorId, startDate.toISOString(), endDate.toISOString()]
  );

  return result.rows.map(mapRowToAppointment);
}

/**
 * Creates a new appointment in the database.
 * Uses gen_random_uuid() for the id if not provided.
 */
export async function create(
  appointment: Omit<Appointment, 'id' | 'createdAt'>,
  client?: PoolClient
): Promise<Appointment> {
  const queryFn = client
    ? (text: string, params?: unknown[]) => client.query(text, params)
    : query;

  const result = await queryFn(
    `INSERT INTO appointments (doctor_id, patient_id, start_time, end_time, duration_minutes, appointment_type, status, cancelled_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      appointment.doctorId,
      appointment.patientId,
      appointment.startTime.toISOString(),
      appointment.endTime.toISOString(),
      appointment.durationMinutes,
      appointment.appointmentType,
      appointment.status,
      appointment.cancelledAt,
    ]
  );

  return mapRowToAppointment(result.rows[0]);
}

/**
 * Finds an appointment by its ID.
 * Returns null if not found.
 */
export async function findById(appointmentId: string): Promise<Appointment | null> {
  const result = await query(
    `SELECT * FROM appointments WHERE id = $1`,
    [appointmentId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapRowToAppointment(result.rows[0]);
}

/**
 * Cancels an appointment by setting its status to 'cancelled'
 * and recording the cancellation timestamp.
 */
export async function cancel(appointmentId: string): Promise<void> {
  await query(
    `UPDATE appointments
     SET status = 'cancelled', cancelled_at = NOW()
     WHERE id = $1`,
    [appointmentId]
  );
}
