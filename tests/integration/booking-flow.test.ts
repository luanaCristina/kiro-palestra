import request from 'supertest';
import app from '../../src/app';
import { ERROR_CODES } from '../../src/models/errors';

/**
 * Integration tests for the booking flow.
 *
 * These tests exercise the full HTTP request/response cycle through all layers
 * (routes → validation → service → mocked repository) using supertest against
 * the Express app with mocked repositories.
 *
 * Validates: Requirements 1.1, 2.1, 2.2, 6.3
 */

// Mock the database module
jest.mock('../../src/config/database', () => {
  const mockClient = {
    query: jest.fn().mockResolvedValue({ rows: [] }),
    release: jest.fn(),
  };
  return {
    pool: {
      connect: jest.fn().mockResolvedValue(mockClient),
    },
    query: jest.fn().mockResolvedValue({ rows: [] }),
  };
});

jest.mock('../../src/repositories/doctor.repository');
jest.mock('../../src/repositories/appointment.repository');

import * as doctorRepository from '../../src/repositories/doctor.repository';
import * as appointmentRepository from '../../src/repositories/appointment.repository';

const mockedDoctorRepo = doctorRepository as jest.Mocked<typeof doctorRepository>;
const mockedAppointmentRepo = appointmentRepository as jest.Mocked<typeof appointmentRepository>;

describe('Integration: Booking Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Full booking flow: book appointment → verify confirmation', () => {
    it('should return 201 with complete BookingConfirmation for a valid FIRST_VISIT booking', async () => {
      // Set up a doctor with availability
      const doctorId = '550e8400-e29b-41d4-a716-446655440001';
      const patientId = '550e8400-e29b-41d4-a716-446655440002';

      mockedDoctorRepo.findById.mockResolvedValue({
        id: doctorId,
        name: 'Dr. Maria Silva',
        specialty: 'cardiology',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      });

      // Doctor available on Saturday (day 6) from 09:00 to 17:00
      mockedDoctorRepo.getAvailabilityRanges.mockResolvedValue([
        { dayOfWeek: 6, startTime: '09:00', endTime: '17:00' },
      ]);

      // No existing appointments (slot is free)
      mockedAppointmentRepo.findByDoctorForUpdate.mockResolvedValue([]);

      // Mock appointment creation
      const startTime = new Date('2025-03-15T10:00:00.000Z'); // Saturday
      const endTime = new Date('2025-03-15T11:00:00.000Z');
      mockedAppointmentRepo.create.mockResolvedValue({
        id: 'apt-uuid-12345678',
        doctorId,
        patientId,
        startTime,
        endTime,
        durationMinutes: 60,
        appointmentType: 'FIRST_VISIT',
        status: 'confirmed',
        createdAt: new Date(),
        cancelledAt: null,
      });

      // Mock patient name lookup
      const { query: mockQuery } = require('../../src/config/database');
      mockQuery.mockResolvedValue({ rows: [{ name: 'João Santos' }] });

      const response = await request(app)
        .post('/api/appointments')
        .send({
          patientId,
          doctorId,
          startTime: '2025-03-15T10:00:00.000Z',
          appointmentType: 'FIRST_VISIT',
        });

      expect(response.status).toBe(201);
      expect(response.body.confirmation).toBeDefined();

      const confirmation = response.body.confirmation;
      expect(confirmation.appointmentId).toBe('apt-uuid-12345678');
      expect(confirmation.patientName).toBe('João Santos');
      expect(confirmation.doctorName).toBe('Dr. Maria Silva');
      expect(confirmation.specialty).toBe('cardiology');
      expect(confirmation.date).toBe('2025-03-15');
      expect(confirmation.startTime).toBe('2025-03-15T10:00:00.000Z');
      expect(confirmation.endTime).toBe('2025-03-15T11:00:00.000Z');
      expect(confirmation.appointmentType).toBe('FIRST_VISIT');
    });

    it('should return 201 with correct 30-minute duration for FOLLOW_UP booking', async () => {
      const doctorId = '550e8400-e29b-41d4-a716-446655440001';
      const patientId = '550e8400-e29b-41d4-a716-446655440002';

      mockedDoctorRepo.findById.mockResolvedValue({
        id: doctorId,
        name: 'Dr. Carlos Mendes',
        specialty: 'dermatology',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      });

      mockedDoctorRepo.getAvailabilityRanges.mockResolvedValue([
        { dayOfWeek: 6, startTime: '08:00', endTime: '18:00' },
      ]);

      mockedAppointmentRepo.findByDoctorForUpdate.mockResolvedValue([]);

      const startTime = new Date('2025-03-15T14:00:00.000Z');
      const endTime = new Date('2025-03-15T14:30:00.000Z');
      mockedAppointmentRepo.create.mockResolvedValue({
        id: 'apt-follow-up-001',
        doctorId,
        patientId,
        startTime,
        endTime,
        durationMinutes: 30,
        appointmentType: 'FOLLOW_UP',
        status: 'confirmed',
        createdAt: new Date(),
        cancelledAt: null,
      });

      const { query: mockQuery } = require('../../src/config/database');
      mockQuery.mockResolvedValue({ rows: [{ name: 'Ana Costa' }] });

      const response = await request(app)
        .post('/api/appointments')
        .send({
          patientId,
          doctorId,
          startTime: '2025-03-15T14:00:00.000Z',
          appointmentType: 'FOLLOW_UP',
        });

      expect(response.status).toBe(201);

      const confirmation = response.body.confirmation;
      expect(confirmation.appointmentType).toBe('FOLLOW_UP');
      expect(confirmation.startTime).toBe('2025-03-15T14:00:00.000Z');
      expect(confirmation.endTime).toBe('2025-03-15T14:30:00.000Z');

      // Verify duration is 30 minutes
      const start = new Date(confirmation.startTime);
      const end = new Date(confirmation.endTime);
      expect((end.getTime() - start.getTime()) / (60 * 1000)).toBe(30);
    });
  });

  describe('Booking outside availability is rejected', () => {
    it('should return 409 with OUTSIDE_AVAILABILITY when booking outside doctor hours', async () => {
      const doctorId = '550e8400-e29b-41d4-a716-446655440001';
      const patientId = '550e8400-e29b-41d4-a716-446655440002';

      mockedDoctorRepo.findById.mockResolvedValue({
        id: doctorId,
        name: 'Dr. Maria Silva',
        specialty: 'cardiology',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      });

      // Doctor available only 09:00-12:00 on Saturday
      mockedDoctorRepo.getAvailabilityRanges.mockResolvedValue([
        { dayOfWeek: 6, startTime: '09:00', endTime: '12:00' },
      ]);

      // Attempt to book at 14:00 (outside availability)
      const response = await request(app)
        .post('/api/appointments')
        .send({
          patientId,
          doctorId,
          startTime: '2025-03-15T14:00:00.000Z', // Saturday, 14:00 UTC
          appointmentType: 'FIRST_VISIT',
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe(ERROR_CODES.OUTSIDE_AVAILABILITY);
    });

    it('should return 409 with NO_AVAILABILITY when doctor has no availability configured', async () => {
      const doctorId = '550e8400-e29b-41d4-a716-446655440001';
      const patientId = '550e8400-e29b-41d4-a716-446655440002';

      mockedDoctorRepo.findById.mockResolvedValue({
        id: doctorId,
        name: 'Dr. Maria Silva',
        specialty: 'cardiology',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      });

      // Doctor has no availability ranges at all
      mockedDoctorRepo.getAvailabilityRanges.mockResolvedValue([]);

      const response = await request(app)
        .post('/api/appointments')
        .send({
          patientId,
          doctorId,
          startTime: '2025-03-15T10:00:00.000Z',
          appointmentType: 'FOLLOW_UP',
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe(ERROR_CODES.NO_AVAILABILITY);
    });
  });

  describe('Booking with invalid appointment type is rejected', () => {
    it('should return 400 with VALIDATION_ERROR for invalid appointmentType', async () => {
      const response = await request(app)
        .post('/api/appointments')
        .send({
          patientId: '550e8400-e29b-41d4-a716-446655440002',
          doctorId: '550e8400-e29b-41d4-a716-446655440001',
          startTime: '2025-03-15T10:00:00.000Z',
          appointmentType: 'CHECKUP', // Invalid type
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('appointment type');
    });

    it('should return 400 with VALIDATION_ERROR for missing appointmentType', async () => {
      const response = await request(app)
        .post('/api/appointments')
        .send({
          patientId: '550e8400-e29b-41d4-a716-446655440002',
          doctorId: '550e8400-e29b-41d4-a716-446655440001',
          startTime: '2025-03-15T10:00:00.000Z',
          // appointmentType is missing
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 with VALIDATION_ERROR for invalid patientId format', async () => {
      const response = await request(app)
        .post('/api/appointments')
        .send({
          patientId: 'not-a-uuid',
          doctorId: '550e8400-e29b-41d4-a716-446655440001',
          startTime: '2025-03-15T10:00:00.000Z',
          appointmentType: 'FIRST_VISIT',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 with VALIDATION_ERROR for invalid startTime format', async () => {
      const response = await request(app)
        .post('/api/appointments')
        .send({
          patientId: '550e8400-e29b-41d4-a716-446655440002',
          doctorId: '550e8400-e29b-41d4-a716-446655440001',
          startTime: 'not-a-date',
          appointmentType: 'FIRST_VISIT',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
