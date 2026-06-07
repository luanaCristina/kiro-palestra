import request from 'supertest';
import { app } from '../setup/test-app';
import { truncateAllTables, runMigrations, closePool } from '../setup/test-database';
import { createTestDoctor } from '../setup/test-factories';

// Ensure DB_NAME is the base name so getTestPool() appends _test correctly
process.env.DB_NAME = 'appointment_scheduling';

describe('Integration: Doctors API', () => {
  beforeAll(async () => {
    await runMigrations();
  });

  beforeEach(async () => {
    await truncateAllTables();
  });

  afterAll(async () => {
    await closePool();
  });

  describe('POST /api/doctors', () => {
    it('should return 201 with doctor object when valid name and specialty are provided', async () => {
      const res = await request(app)
        .post('/api/doctors')
        .send({ name: 'Dr. Maria Silva', specialty: 'cardiology' });

      expect(res.status).toBe(201);
      expect(res.body.doctor).toMatchObject({
        name: 'Dr. Maria Silva',
        specialty: 'cardiology',
      });
      expect(res.body.doctor.id).toBeDefined();
      expect(res.body.doctor.created_at).toBeDefined();
    });

    it('should return 400 with VALIDATION_ERROR when name is missing', async () => {
      const res = await request(app)
        .post('/api/doctors')
        .send({ specialty: 'cardiology' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 with VALIDATION_ERROR when specialty is missing', async () => {
      const res = await request(app)
        .post('/api/doctors')
        .send({ name: 'Dr. Maria Silva' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/doctors/all', () => {
    it('should return 200 with doctors ordered by name', async () => {
      await createTestDoctor({ name: 'Dr. Zara', specialty: 'neurology' });
      await createTestDoctor({ name: 'Dr. Ana', specialty: 'cardiology' });
      await createTestDoctor({ name: 'Dr. Maria', specialty: 'pediatrics' });

      const res = await request(app).get('/api/doctors/all');

      expect(res.status).toBe(200);
      expect(res.body.doctors).toHaveLength(3);
      expect(res.body.doctors[0].name).toBe('Dr. Ana');
      expect(res.body.doctors[1].name).toBe('Dr. Maria');
      expect(res.body.doctors[2].name).toBe('Dr. Zara');
    });

    it('should return 200 with empty array when no doctors exist', async () => {
      const res = await request(app).get('/api/doctors/all');

      expect(res.status).toBe(200);
      expect(res.body.doctors).toEqual([]);
    });
  });

  describe('GET /api/doctors?specialty=...', () => {
    it('should return 200 with filtered doctors for valid specialty', async () => {
      await createTestDoctor({ name: 'Dr. Heart', specialty: 'cardiology' });
      await createTestDoctor({ name: 'Dr. Brain', specialty: 'neurology' });
      await createTestDoctor({ name: 'Dr. Heart2', specialty: 'cardiology' });

      const res = await request(app).get('/api/doctors?specialty=cardiology');

      expect(res.status).toBe(200);
      expect(res.body.doctors).toBeDefined();
    });

    it('should return 400 with INVALID_SPECIALTY for invalid specialty', async () => {
      const res = await request(app).get('/api/doctors?specialty=invalid_specialty');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_SPECIALTY');
    });

    it('should return 400 with INVALID_DATE_RANGE for invalid date', async () => {
      const res = await request(app).get('/api/doctors?specialty=cardiology&date=not-a-date');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_DATE_RANGE');
    });
  });

  describe('PUT /api/doctors/:doctorId/availability', () => {
    it('should return 200 with updated schedule when valid schedule is provided', async () => {
      const doctor = await createTestDoctor({ name: 'Dr. Available', specialty: 'cardiology' });

      const schedule = {
        schedule: {
          ranges: [
            { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
          ],
        },
      };

      const res = await request(app)
        .put(`/api/doctors/${doctor.id}/availability`)
        .send(schedule);

      expect(res.status).toBe(200);
      expect(res.body.schedule).toMatchObject({
        doctorId: doctor.id,
        ranges: schedule.schedule.ranges,
      });
    });

    it('should return 400 with VALIDATION_ERROR (TOO_MANY_RANGES) when more than 5 ranges per day', async () => {
      const doctor = await createTestDoctor({ name: 'Dr. Busy', specialty: 'cardiology' });

      const schedule = {
        schedule: {
          ranges: [
            { dayOfWeek: 1, startTime: '06:00', endTime: '07:00' },
            { dayOfWeek: 1, startTime: '08:00', endTime: '09:00' },
            { dayOfWeek: 1, startTime: '10:00', endTime: '11:00' },
            { dayOfWeek: 1, startTime: '12:00', endTime: '13:00' },
            { dayOfWeek: 1, startTime: '14:00', endTime: '15:00' },
            { dayOfWeek: 1, startTime: '16:00', endTime: '17:00' },
          ],
        },
      };

      const res = await request(app)
        .put(`/api/doctors/${doctor.id}/availability`)
        .send(schedule);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 with VALIDATION_ERROR (OVERLAPPING_RANGES) when ranges overlap', async () => {
      const doctor = await createTestDoctor({ name: 'Dr. Overlap', specialty: 'cardiology' });

      const schedule = {
        schedule: {
          ranges: [
            { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
            { dayOfWeek: 1, startTime: '11:00', endTime: '14:00' },
          ],
        },
      };

      const res = await request(app)
        .put(`/api/doctors/${doctor.id}/availability`)
        .send(schedule);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 with VALIDATION_ERROR (INVALID_TIME_RANGE) when endTime is before startTime', async () => {
      const doctor = await createTestDoctor({ name: 'Dr. Invalid', specialty: 'cardiology' });

      const schedule = {
        schedule: {
          ranges: [
            { dayOfWeek: 1, startTime: '17:00', endTime: '09:00' },
          ],
        },
      };

      const res = await request(app)
        .put(`/api/doctors/${doctor.id}/availability`)
        .send(schedule);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 with DOCTOR_NOT_FOUND when doctor does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const schedule = {
        schedule: {
          ranges: [
            { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
          ],
        },
      };

      const res = await request(app)
        .put(`/api/doctors/${nonExistentId}/availability`)
        .send(schedule);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('DOCTOR_NOT_FOUND');
    });
  });
});
