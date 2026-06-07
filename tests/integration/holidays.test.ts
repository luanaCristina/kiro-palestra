import request from 'supertest';

// Mock the database module since holidays endpoints don't use DB
jest.mock('../../src/config/database', () => ({
  pool: { connect: jest.fn() },
  query: jest.fn(),
}));

import app from '../../src/app';

/**
 * Integration tests for the holidays and states endpoints.
 *
 * These endpoints are backed by in-memory data (no DB queries),
 * so we mock the database to avoid connection issues.
 */
describe('Integration: Holidays & States', () => {

  describe('GET /api/holidays?state=PE', () => {
    it('should return 200 with national + state holidays for PE', async () => {
      const response = await request(app).get('/api/holidays?state=PE');

      expect(response.status).toBe(200);
      expect(response.body.state).toBe('PE');
      expect(Array.isArray(response.body.holidays)).toBe(true);

      // Should include national holidays
      const nationalHolidays = response.body.holidays.filter(
        (h: any) => h.type === 'national'
      );
      expect(nationalHolidays.length).toBeGreaterThan(0);

      // Should include state-specific holidays for PE
      const stateHolidays = response.body.holidays.filter(
        (h: any) => h.type === 'state'
      );
      expect(stateHolidays.length).toBeGreaterThan(0);

      // Verify a known PE state holiday exists
      const revolucao = stateHolidays.find(
        (h: any) => h.name === 'Revolução Pernambucana de 1817'
      );
      expect(revolucao).toBeDefined();
      expect(revolucao.date).toBe('03-06');
    });
  });

  describe('GET /api/holidays?state=SP&date=2026-01-25', () => {
    it('should return isHoliday: true for Aniversário de São Paulo', async () => {
      const response = await request(app).get(
        '/api/holidays?state=SP&date=2026-01-25'
      );

      expect(response.status).toBe(200);
      expect(response.body.isHoliday).toBe(true);
      expect(response.body.holiday).toBeDefined();
      expect(response.body.holiday.date).toBe('01-25');
      expect(response.body.holiday.name).toBe('Aniversário de São Paulo');
      expect(response.body.holiday.type).toBe('state');
    });
  });

  describe('GET /api/holidays?state=SP&date=2026-03-10', () => {
    it('should return isHoliday: false for a regular day', async () => {
      const response = await request(app).get(
        '/api/holidays?state=SP&date=2026-03-10'
      );

      expect(response.status).toBe(200);
      expect(response.body.isHoliday).toBe(false);
      expect(response.body.holiday).toBeUndefined();
    });
  });

  describe('GET /api/holidays without state', () => {
    it('should return 400 VALIDATION_ERROR when state parameter is missing', async () => {
      const response = await request(app).get('/api/holidays');

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('state');
    });
  });

  describe('GET /api/states', () => {
    it('should return 200 with 27 states ordered by code', async () => {
      const response = await request(app).get('/api/states');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.states)).toBe(true);
      expect(response.body.states).toHaveLength(27);

      // Verify ordering by code
      const codes = response.body.states.map((s: any) => s.code);
      const sortedCodes = [...codes].sort();
      expect(codes).toEqual(sortedCodes);

      // First should be AC, last should be TO
      expect(response.body.states[0].code).toBe('AC');
      expect(response.body.states[0].name).toBe('Acre');
      expect(response.body.states[26].code).toBe('TO');
      expect(response.body.states[26].name).toBe('Tocantins');
    });
  });
});
