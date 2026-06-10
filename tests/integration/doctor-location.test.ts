import request from 'supertest';
import { app } from '../setup/test-app';
import { truncateAllTables, runMigrations, closePool } from '../setup/test-database';
import { createTestDoctor } from '../setup/test-factories';

/**
 * Integration tests for Doctor Location API (Google Maps feature)
 * Card: SDC-17
 * Spec: .kiro/specs/google-maps-clinic-location/requirements.md
 * 
 * Tests endpoints:
 *   PUT /api/doctors/:doctorId/location
 *   GET /api/doctors/:doctorId/location
 */
describe('Integration: Doctor Location API', () => {
  beforeAll(async () => {
    await runMigrations();
  });

  beforeEach(async () => {
    await truncateAllTables();
  });

  afterAll(async () => {
    await closePool();
  });

  describe('PUT /api/doctors/:doctorId/location', () => {
    it('should return 200 and save location when valid data is provided', async () => {
      const doctor = await createTestDoctor({ name: 'Dr. Mapa', specialty: 'cardiology' });

      const res = await request(app)
        .put(`/api/doctors/${doctor.id}/location`)
        .send({
          address: 'Av. Agamenon Magalhães, 4775, Recife-PE',
          latitude: -8.0476,
          longitude: -34.8770,
        });

      expect(res.status).toBe(200);
      expect(res.body.location).toMatchObject({
        address: 'Av. Agamenon Magalhães, 4775, Recife-PE',
        latitude: -8.0476,
        longitude: -34.8770,
      });
    });

    it('should return 400 VALIDATION_ERROR when address is missing', async () => {
      const doctor = await createTestDoctor();

      const res = await request(app)
        .put(`/api/doctors/${doctor.id}/location`)
        .send({ latitude: -8.0476, longitude: -34.8770 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 VALIDATION_ERROR when latitude is missing', async () => {
      const doctor = await createTestDoctor();

      const res = await request(app)
        .put(`/api/doctors/${doctor.id}/location`)
        .send({ address: 'Rua X', longitude: -34.8770 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 INVALID_COORDINATES when latitude is out of range', async () => {
      const doctor = await createTestDoctor();

      const res = await request(app)
        .put(`/api/doctors/${doctor.id}/location`)
        .send({ address: 'Rua X', latitude: 91, longitude: -34.8770 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_COORDINATES');
    });

    it('should return 400 INVALID_COORDINATES when longitude is out of range', async () => {
      const doctor = await createTestDoctor();

      const res = await request(app)
        .put(`/api/doctors/${doctor.id}/location`)
        .send({ address: 'Rua X', latitude: -8.0476, longitude: 181 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_COORDINATES');
    });

    it('should return 404 DOCTOR_NOT_FOUND when doctor does not exist', async () => {
      const res = await request(app)
        .put('/api/doctors/00000000-0000-0000-0000-000000000000/location')
        .send({
          address: 'Rua X',
          latitude: -8.0476,
          longitude: -34.8770,
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('DOCTOR_NOT_FOUND');
    });
  });

  describe('GET /api/doctors/:doctorId/location', () => {
    it('should return 200 with location data when doctor has location', async () => {
      const doctor = await createTestDoctor({ name: 'Dr. Loc', specialty: 'neurology' });

      // First save location
      await request(app)
        .put(`/api/doctors/${doctor.id}/location`)
        .send({
          address: 'Rua da Aurora, 500, Recife-PE',
          latitude: -8.0578,
          longitude: -34.8829,
        });

      // Then retrieve
      const res = await request(app)
        .get(`/api/doctors/${doctor.id}/location`);

      expect(res.status).toBe(200);
      expect(res.body.doctorId).toBe(doctor.id);
      expect(res.body.address).toBe('Rua da Aurora, 500, Recife-PE');
      expect(res.body.latitude).toBeCloseTo(-8.0578, 4);
      expect(res.body.longitude).toBeCloseTo(-34.8829, 4);
    });

    it('should return 200 with null fields when doctor has no location', async () => {
      const doctor = await createTestDoctor();

      const res = await request(app)
        .get(`/api/doctors/${doctor.id}/location`);

      expect(res.status).toBe(200);
      expect(res.body.doctorId).toBe(doctor.id);
      expect(res.body.address).toBeNull();
      expect(res.body.latitude).toBeNull();
      expect(res.body.longitude).toBeNull();
    });

    it('should return 404 DOCTOR_NOT_FOUND when doctor does not exist', async () => {
      const res = await request(app)
        .get('/api/doctors/00000000-0000-0000-0000-000000000000/location');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('DOCTOR_NOT_FOUND');
    });
  });
});
