import request from 'supertest';
import { app } from '../setup/test-app';
import { truncateAllTables, runMigrations, closePool } from '../setup/test-database';
import { createTestDoctor, createTestAvailabilityRange } from '../setup/test-factories';

// Ensure DB_NAME is the base name so getTestPool() appends _test correctly
process.env.DB_NAME = 'appointment_scheduling';

const NON_EXISTENT_UUID = '00000000-0000-0000-0000-000000000000';

describe('Integration: Availability API', () => {
  beforeAll(async () => {
    await runMigrations();
  });

  beforeEach(async () => {
    await truncateAllTables();
  });

  afterAll(async () => {
    await closePool();
  });

  describe('GET /api/availability/:doctorId', () => {
    it('should return 200 with ordered ranges when doctor has availability', async () => {
      const doctor = await createTestDoctor();

      // Create ranges out of order to verify sorting
      await createTestAvailabilityRange(doctor.id, { dayOfWeek: 3, startTime: '10:00', endTime: '14:00' });
      await createTestAvailabilityRange(doctor.id, { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' });
      await createTestAvailabilityRange(doctor.id, { dayOfWeek: 1, startTime: '14:00', endTime: '17:00' });

      const res = await request(app).get(`/api/availability/${doctor.id}`);

      expect(res.status).toBe(200);
      expect(res.body.doctorId).toBe(doctor.id);
      expect(res.body.ranges).toHaveLength(3);

      // Verify ordering by day_of_week, then start_time
      expect(res.body.ranges[0].day_of_week).toBe(1);
      expect(res.body.ranges[0].start_time).toBe('09:00:00');
      expect(res.body.ranges[1].day_of_week).toBe(1);
      expect(res.body.ranges[1].start_time).toBe('14:00:00');
      expect(res.body.ranges[2].day_of_week).toBe(3);
      expect(res.body.ranges[2].start_time).toBe('10:00:00');
    });

    it('should return 200 with empty array when doctor has no ranges', async () => {
      const doctor = await createTestDoctor();

      const res = await request(app).get(`/api/availability/${doctor.id}`);

      expect(res.status).toBe(200);
      expect(res.body.doctorId).toBe(doctor.id);
      expect(res.body.ranges).toEqual([]);
    });
  });

  describe('DELETE /api/availability/:rangeId', () => {
    it('should return 200 when deleting an existing range', async () => {
      const doctor = await createTestDoctor();
      const range = await createTestAvailabilityRange(doctor.id);

      const res = await request(app).delete(`/api/availability/${range.id}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBeDefined();
      expect(res.body.id).toBe(range.id);

      // Verify it's actually deleted
      const getRes = await request(app).get(`/api/availability/${doctor.id}`);
      expect(getRes.body.ranges).toHaveLength(0);
    });

    it('should return 404 with NOT_FOUND when range does not exist', async () => {
      const res = await request(app).delete(`/api/availability/${NON_EXISTENT_UUID}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PUT /api/availability/:rangeId', () => {
    it('should return 200 with updated range when valid data is provided', async () => {
      const doctor = await createTestDoctor();
      const range = await createTestAvailabilityRange(doctor.id, {
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '12:00',
      });

      const res = await request(app)
        .put(`/api/availability/${range.id}`)
        .send({ dayOfWeek: 2, startTime: '10:00', endTime: '15:00' });

      expect(res.status).toBe(200);
      expect(res.body.range).toMatchObject({
        id: range.id,
        day_of_week: 2,
        start_time: '10:00:00',
        end_time: '15:00:00',
      });
    });

    it('should return 404 with NOT_FOUND when range does not exist', async () => {
      const res = await request(app)
        .put(`/api/availability/${NON_EXISTENT_UUID}`)
        .send({ dayOfWeek: 2, startTime: '10:00', endTime: '15:00' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
