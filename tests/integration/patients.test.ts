import request from 'supertest';
import { app } from '../setup/test-app';
import { truncateAllTables, runMigrations, closePool } from '../setup/test-database';
import { createTestPatient } from '../setup/test-factories';

/**
 * Integration tests for the Patients API.
 *
 * Tests exercise the full HTTP request/response cycle against a real PostgreSQL
 * test database using supertest.
 *
 * Validates: Requirements 2.1, 2.2, 2.3
 */
describe('Integration: Patients API', () => {
  beforeAll(async () => {
    await runMigrations();
  });

  beforeEach(async () => {
    await truncateAllTables();
  });

  afterAll(async () => {
    await closePool();
  });

  describe('POST /api/patients', () => {
    it('should return 201 with patient object when name and email are valid', async () => {
      const response = await request(app)
        .post('/api/patients')
        .send({ name: 'Maria Silva', email: 'maria.silva@example.com' });

      expect(response.status).toBe(201);
      expect(response.body.patient).toBeDefined();
      expect(response.body.patient.id).toBeDefined();
      expect(response.body.patient.name).toBe('Maria Silva');
      expect(response.body.patient.email).toBe('maria.silva@example.com');
      expect(response.body.patient.created_at).toBeDefined();
    });

    it('should return 400 with VALIDATION_ERROR when name is missing', async () => {
      const response = await request(app)
        .post('/api/patients')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('name and email are required');
    });

    it('should return 400 with VALIDATION_ERROR when email is missing', async () => {
      const response = await request(app)
        .post('/api/patients')
        .send({ name: 'Maria Silva' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('name and email are required');
    });

    it('should return 400 with VALIDATION_ERROR when both name and email are missing', async () => {
      const response = await request(app)
        .post('/api/patients')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('name and email are required');
    });
  });

  describe('GET /api/patients', () => {
    it('should return 200 with patients ordered alphabetically by name', async () => {
      // Create patients in non-alphabetical order
      await createTestPatient({ name: 'Carlos Mendes', email: 'carlos@example.com' });
      await createTestPatient({ name: 'Ana Costa', email: 'ana@example.com' });
      await createTestPatient({ name: 'Bruno Lima', email: 'bruno@example.com' });

      const response = await request(app).get('/api/patients');

      expect(response.status).toBe(200);
      expect(response.body.patients).toBeDefined();
      expect(Array.isArray(response.body.patients)).toBe(true);
      expect(response.body.patients).toHaveLength(3);

      // Verify alphabetical order by name
      expect(response.body.patients[0].name).toBe('Ana Costa');
      expect(response.body.patients[1].name).toBe('Bruno Lima');
      expect(response.body.patients[2].name).toBe('Carlos Mendes');

      // Verify each patient has the required fields
      for (const patient of response.body.patients) {
        expect(patient.id).toBeDefined();
        expect(patient.name).toBeDefined();
        expect(patient.email).toBeDefined();
        expect(patient.created_at).toBeDefined();
      }
    });

    it('should return 200 with empty array when no patients exist', async () => {
      const response = await request(app).get('/api/patients');

      expect(response.status).toBe(200);
      expect(response.body.patients).toBeDefined();
      expect(Array.isArray(response.body.patients)).toBe(true);
      expect(response.body.patients).toHaveLength(0);
    });
  });
});
