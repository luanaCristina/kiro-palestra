import request from 'supertest';
import { app } from '../setup/test-app';
import { truncateAllTables, runMigrations, closePool } from '../setup/test-database';
import {
  createTestDoctor,
  createTestPatient,
  createTestAppointment,
  createTestAvailabilityRange,
} from '../setup/test-factories';

// Ensure DB_NAME is the base name so getTestPool() appends _test correctly
process.env.DB_NAME = 'appointment_scheduling';

describe('Integration: Appointments API', () => {
  beforeAll(async () => {
    await runMigrations();
  });

  beforeEach(async () => {
    await truncateAllTables();
  });

  afterAll(async () => {
    await closePool();
  });

  /**
   * Helper: returns a future date that falls on the given dayOfWeek (using getDay()).
   * Sets LOCAL hours so that the service's formatTimeHHMM (which uses getHours/getMinutes)
   * sees the correct time relative to availability ranges.
   */
  function getFutureDateForDayOfWeek(dayOfWeek: number, hour: number = 10, minute: number = 0): Date {
    // Start from a known future date and find the next occurrence of dayOfWeek
    const base = new Date('2027-01-04T00:00:00'); // Local time, a date in the future
    // Find offset from base.getDay() to desired dayOfWeek
    const baseDay = base.getDay();
    let offset = dayOfWeek - baseDay;
    if (offset < 0) offset += 7;
    const target = new Date(base);
    target.setDate(target.getDate() + offset);
    target.setHours(hour, minute, 0, 0);
    return target;
  }

  describe('POST /api/appointments', () => {
    it('should return 201 with confirmation when booking is valid', async () => {
      const doctor = await createTestDoctor({ name: 'Dr. Booking', specialty: 'cardiology' });
      const patient = await createTestPatient({ name: 'John Patient', email: 'john@test.com' });

      // Create availability for Monday (dayOfWeek=1), 09:00-17:00
      await createTestAvailabilityRange(doctor.id, {
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00',
      });

      // Book on a Monday at 10:00 UTC (within availability)
      const startTime = getFutureDateForDayOfWeek(1, 10, 0);

      const res = await request(app)
        .post('/api/appointments')
        .send({
          patientId: patient.id,
          doctorId: doctor.id,
          startTime: startTime.toISOString(),
          appointmentType: 'FIRST_VISIT',
        });

      expect(res.status).toBe(201);
      expect(res.body.confirmation).toBeDefined();
      expect(res.body.confirmation.appointmentId).toBeDefined();
      expect(res.body.confirmation.doctorName).toBe('Dr. Booking');
      expect(res.body.confirmation.patientName).toBe('John Patient');
      expect(res.body.confirmation.appointmentType).toBe('FIRST_VISIT');
    });

    it('should return 400 when patientId is not a valid UUID', async () => {
      const doctor = await createTestDoctor();

      const res = await request(app)
        .post('/api/appointments')
        .send({
          patientId: 'not-a-valid-uuid',
          doctorId: doctor.id,
          startTime: new Date('2027-01-04T10:00:00.000Z').toISOString(),
          appointmentType: 'FIRST_VISIT',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when appointmentType is invalid', async () => {
      const doctor = await createTestDoctor();
      const patient = await createTestPatient();

      const res = await request(app)
        .post('/api/appointments')
        .send({
          patientId: patient.id,
          doctorId: doctor.id,
          startTime: new Date('2027-01-04T10:00:00.000Z').toISOString(),
          appointmentType: 'INVALID_TYPE',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 409 SLOT_UNAVAILABLE when slot is already occupied', async () => {
      const doctor = await createTestDoctor({ name: 'Dr. Busy', specialty: 'cardiology' });
      const patient1 = await createTestPatient({ name: 'Patient 1', email: 'p1@test.com' });
      const patient2 = await createTestPatient({ name: 'Patient 2', email: 'p2@test.com' });

      // Create availability for Monday
      await createTestAvailabilityRange(doctor.id, {
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00',
      });

      const startTime = getFutureDateForDayOfWeek(1, 10, 0);

      // First booking — should succeed
      await request(app)
        .post('/api/appointments')
        .send({
          patientId: patient1.id,
          doctorId: doctor.id,
          startTime: startTime.toISOString(),
          appointmentType: 'FIRST_VISIT',
        });

      // Second booking at the same time — should fail with SLOT_UNAVAILABLE
      const res = await request(app)
        .post('/api/appointments')
        .send({
          patientId: patient2.id,
          doctorId: doctor.id,
          startTime: startTime.toISOString(),
          appointmentType: 'FIRST_VISIT',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('SLOT_UNAVAILABLE');
    });

    it('should return 409 OUTSIDE_AVAILABILITY when time is outside doctor availability', async () => {
      const doctor = await createTestDoctor({ name: 'Dr. Limited', specialty: 'cardiology' });
      const patient = await createTestPatient({ name: 'Late Patient', email: 'late@test.com' });

      // Create availability for Monday 09:00-12:00 only
      await createTestAvailabilityRange(doctor.id, {
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '12:00',
      });

      // Try to book at 16:00 local — clearly outside availability (09:00-12:00)
      const startTime = getFutureDateForDayOfWeek(1, 16, 0);

      const res = await request(app)
        .post('/api/appointments')
        .send({
          patientId: patient.id,
          doctorId: doctor.id,
          startTime: startTime.toISOString(),
          appointmentType: 'FOLLOW_UP',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('OUTSIDE_AVAILABILITY');
    });

    it('should return 409 NO_AVAILABILITY when doctor has no schedule for that day', async () => {
      const doctor = await createTestDoctor({ name: 'Dr. NoSchedule', specialty: 'cardiology' });
      const patient = await createTestPatient({ name: 'No Luck', email: 'noluck@test.com' });

      // Create availability only for Monday (dayOfWeek=1)
      await createTestAvailabilityRange(doctor.id, {
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00',
      });

      // Try to book on Tuesday (dayOfWeek=2) — no availability configured
      const startTime = getFutureDateForDayOfWeek(2, 10, 0);

      const res = await request(app)
        .post('/api/appointments')
        .send({
          patientId: patient.id,
          doctorId: doctor.id,
          startTime: startTime.toISOString(),
          appointmentType: 'FIRST_VISIT',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('NO_AVAILABILITY');
    });

    it('should return 404 DOCTOR_NOT_FOUND when doctorId does not exist', async () => {
      const patient = await createTestPatient({ name: 'Orphan Patient', email: 'orphan@test.com' });
      const nonExistentDoctorId = '00000000-0000-0000-0000-000000000000';

      const res = await request(app)
        .post('/api/appointments')
        .send({
          patientId: patient.id,
          doctorId: nonExistentDoctorId,
          startTime: new Date('2027-01-04T10:00:00.000Z').toISOString(),
          appointmentType: 'FIRST_VISIT',
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('DOCTOR_NOT_FOUND');
    });
  });

  describe('GET /api/appointments', () => {
    it('should return 200 with ordered appointment list', async () => {
      const doctor = await createTestDoctor({ name: 'Dr. List', specialty: 'cardiology' });
      const patient = await createTestPatient({ name: 'List Patient', email: 'list@test.com' });

      // Create two appointments with different start times
      const earlier = new Date('2027-01-05T09:00:00.000Z');
      const later = new Date('2027-01-05T14:00:00.000Z');

      await createTestAppointment({
        doctorId: doctor.id,
        patientId: patient.id,
        startTime: earlier,
        endTime: new Date(earlier.getTime() + 60 * 60 * 1000),
        durationMinutes: 60,
        appointmentType: 'FIRST_VISIT',
        status: 'confirmed',
      });

      await createTestAppointment({
        doctorId: doctor.id,
        patientId: patient.id,
        startTime: later,
        endTime: new Date(later.getTime() + 30 * 60 * 1000),
        durationMinutes: 30,
        appointmentType: 'FOLLOW_UP',
        status: 'confirmed',
      });

      const res = await request(app).get('/api/appointments');

      expect(res.status).toBe(200);
      expect(res.body.appointments).toHaveLength(2);
      // Ordered by start_time DESC — later appointment first
      expect(new Date(res.body.appointments[0].start_time).getTime())
        .toBeGreaterThan(new Date(res.body.appointments[1].start_time).getTime());
    });
  });

  describe('POST /api/appointments/:id/cancel', () => {
    it('should return 200 when cancelling >24h before appointment', async () => {
      const doctor = await createTestDoctor({ name: 'Dr. Cancel', specialty: 'cardiology' });
      const patient = await createTestPatient({ name: 'Cancel Patient', email: 'cancel@test.com' });

      // Create an appointment far in the future (2027) — well >24h from now
      const futureDate = new Date('2027-06-15T10:00:00.000Z');
      const appointment = await createTestAppointment({
        doctorId: doctor.id,
        patientId: patient.id,
        startTime: futureDate,
        endTime: new Date(futureDate.getTime() + 60 * 60 * 1000),
        durationMinutes: 60,
        appointmentType: 'FIRST_VISIT',
        status: 'confirmed',
      });

      const res = await request(app)
        .post(`/api/appointments/${appointment.id}/cancel`)
        .send({ patientId: patient.id });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('cancelled');
      expect(res.body.appointmentId).toBe(appointment.id);
    });

    it('should return 409 CANCELLATION_POLICY when cancelling ≤24h before appointment', async () => {
      const doctor = await createTestDoctor({ name: 'Dr. Policy', specialty: 'cardiology' });
      const patient = await createTestPatient({ name: 'Policy Patient', email: 'policy@test.com' });

      // Create appointment that starts in exactly 12 hours (within 24h window)
      const soon = new Date(Date.now() + 12 * 60 * 60 * 1000);
      const appointment = await createTestAppointment({
        doctorId: doctor.id,
        patientId: patient.id,
        startTime: soon,
        endTime: new Date(soon.getTime() + 60 * 60 * 1000),
        durationMinutes: 60,
        appointmentType: 'FIRST_VISIT',
        status: 'confirmed',
      });

      const res = await request(app)
        .post(`/api/appointments/${appointment.id}/cancel`)
        .send({ patientId: patient.id });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CANCELLATION_POLICY');
    });

    it('should return 400 ALREADY_CANCELLED when appointment is already cancelled', async () => {
      const doctor = await createTestDoctor({ name: 'Dr. Double', specialty: 'cardiology' });
      const patient = await createTestPatient({ name: 'Double Patient', email: 'double@test.com' });

      // Create an already cancelled appointment far in the future
      const futureDate = new Date('2027-08-20T10:00:00.000Z');
      const appointment = await createTestAppointment({
        doctorId: doctor.id,
        patientId: patient.id,
        startTime: futureDate,
        endTime: new Date(futureDate.getTime() + 60 * 60 * 1000),
        durationMinutes: 60,
        appointmentType: 'FIRST_VISIT',
        status: 'cancelled',
      });

      const res = await request(app)
        .post(`/api/appointments/${appointment.id}/cancel`)
        .send({ patientId: patient.id });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ALREADY_CANCELLED');
    });

    it('should return 403 UNAUTHORIZED_CANCEL when patientId does not match', async () => {
      const doctor = await createTestDoctor({ name: 'Dr. Auth', specialty: 'cardiology' });
      const patient = await createTestPatient({ name: 'Auth Patient', email: 'auth@test.com' });
      const otherPatient = await createTestPatient({ name: 'Other Patient', email: 'other@test.com' });

      // Create appointment for patient
      const futureDate = new Date('2027-09-10T10:00:00.000Z');
      const appointment = await createTestAppointment({
        doctorId: doctor.id,
        patientId: patient.id,
        startTime: futureDate,
        endTime: new Date(futureDate.getTime() + 60 * 60 * 1000),
        durationMinutes: 60,
        appointmentType: 'FIRST_VISIT',
        status: 'confirmed',
      });

      // Try to cancel with a different patient's ID
      const res = await request(app)
        .post(`/api/appointments/${appointment.id}/cancel`)
        .send({ patientId: otherPatient.id });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('UNAUTHORIZED_CANCEL');
    });
  });
});
