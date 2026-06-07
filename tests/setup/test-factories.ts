import { getTestPool } from './test-database';

/**
 * Interfaces for test factory return types.
 */
export interface TestDoctor {
  id: string;
  name: string;
  specialty: string;
}

export interface TestPatient {
  id: string;
  name: string;
  email: string;
}

export interface TestAppointment {
  id: string;
  doctorId: string;
  patientId: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  appointmentType: string;
  status: string;
}

export interface TestAvailabilityRange {
  id: string;
  doctorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

/**
 * Creates a test doctor in the database with sensible defaults.
 * Defaults: name = 'Dr. Test', specialty = 'general_practice'
 */
export async function createTestDoctor(
  overrides?: Partial<{ name: string; specialty: string }>
): Promise<TestDoctor> {
  const pool = getTestPool();

  const name = overrides?.name ?? 'Dr. Test';
  const specialty = overrides?.specialty ?? 'general_practice';

  const result = await pool.query(
    `INSERT INTO doctors (name, specialty) VALUES ($1, $2) RETURNING id, name, specialty`,
    [name, specialty]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    specialty: row.specialty,
  };
}

/**
 * Creates a test patient in the database with sensible defaults.
 * Defaults: name = 'Test Patient', email = 'test.patient@example.com'
 */
export async function createTestPatient(
  overrides?: Partial<{ name: string; email: string }>
): Promise<TestPatient> {
  const pool = getTestPool();

  const name = overrides?.name ?? 'Test Patient';
  const email = overrides?.email ?? 'test.patient@example.com';

  const result = await pool.query(
    `INSERT INTO patients (name, email) VALUES ($1, $2) RETURNING id, name, email`,
    [name, email]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    email: row.email,
  };
}

/**
 * Creates a test appointment in the database with sensible defaults.
 * Requires a doctor and patient to already exist in the database.
 * Defaults:
 *   - appointmentType: 'FIRST_VISIT'
 *   - status: 'confirmed'
 *   - startTime: tomorrow at 10:00 UTC
 *   - durationMinutes: 60 (based on FIRST_VISIT)
 *   - endTime: startTime + durationMinutes
 */
export async function createTestAppointment(
  overrides?: Partial<{
    doctorId: string;
    patientId: string;
    startTime: Date;
    endTime: Date;
    durationMinutes: number;
    appointmentType: string;
    status: string;
  }>
): Promise<TestAppointment> {
  const pool = getTestPool();

  // If doctorId or patientId not provided, create them
  let doctorId = overrides?.doctorId;
  let patientId = overrides?.patientId;

  if (!doctorId) {
    const doctor = await createTestDoctor();
    doctorId = doctor.id;
  }

  if (!patientId) {
    const patient = await createTestPatient();
    patientId = patient.id;
  }

  const appointmentType = overrides?.appointmentType ?? 'FIRST_VISIT';
  const durationMinutes = overrides?.durationMinutes ?? (appointmentType === 'FOLLOW_UP' ? 30 : 60);
  const status = overrides?.status ?? 'confirmed';

  // Default startTime: tomorrow at 10:00 UTC
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const startTime = overrides?.startTime ?? tomorrow;
  const endTime = overrides?.endTime ?? new Date(startTime.getTime() + durationMinutes * 60 * 1000);

  const result = await pool.query(
    `INSERT INTO appointments (doctor_id, patient_id, start_time, end_time, duration_minutes, appointment_type, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, doctor_id, patient_id, start_time, end_time, duration_minutes, appointment_type, status`,
    [doctorId, patientId, startTime, endTime, durationMinutes, appointmentType, status]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    doctorId: row.doctor_id,
    patientId: row.patient_id,
    startTime: new Date(row.start_time),
    endTime: new Date(row.end_time),
    durationMinutes: row.duration_minutes,
    appointmentType: row.appointment_type,
    status: row.status,
  };
}

/**
 * Creates a test availability range in the database.
 * Defaults: dayOfWeek = 1 (Monday), startTime = '09:00', endTime = '17:00'
 */
export async function createTestAvailabilityRange(
  doctorId: string,
  overrides?: Partial<{ dayOfWeek: number; startTime: string; endTime: string }>
): Promise<TestAvailabilityRange> {
  const pool = getTestPool();

  const dayOfWeek = overrides?.dayOfWeek ?? 1;
  const startTime = overrides?.startTime ?? '09:00';
  const endTime = overrides?.endTime ?? '17:00';

  const result = await pool.query(
    `INSERT INTO availability_ranges (doctor_id, day_of_week, start_time, end_time)
     VALUES ($1, $2, $3, $4)
     RETURNING id, doctor_id, day_of_week, start_time, end_time`,
    [doctorId, dayOfWeek, startTime, endTime]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    doctorId: row.doctor_id,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time,
    endTime: row.end_time,
  };
}
