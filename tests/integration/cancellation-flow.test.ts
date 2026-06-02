import request from 'supertest';
import app from '../../src/app';
import { Appointment } from '../../src/models/types';
import { ERROR_CODES } from '../../src/models/errors';

// Mock the database module to prevent actual DB connections
jest.mock('../../src/config/database', () => ({
  pool: {
    connect: jest.fn(),
    query: jest.fn(),
  },
  query: jest.fn(),
}));

// Mock the appointment repository
jest.mock('../../src/repositories/appointment.repository');

import * as appointmentRepository from '../../src/repositories/appointment.repository';

const mockedFindById = appointmentRepository.findById as jest.MockedFunction<
  typeof appointmentRepository.findById
>;
const mockedCancel = appointmentRepository.cancel as jest.MockedFunction<
  typeof appointmentRepository.cancel
>;

/**
 * Integration tests for the cancellation flow.
 * Tests the full HTTP request/response cycle through Express with mocked repositories.
 *
 * Validates: Requirements 4.1, 4.2, 4.3, 4.5
 */
describe('Integration: Cancellation Flow', () => {
  const patientId = '550e8400-e29b-41d4-a716-446655440000';
  const appointmentId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  const doctorId = 'd1d2d3d4-e5f6-7890-abcd-ef1234567890';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful cancellation', () => {
    it('should return 200 and cancel an appointment more than 24 hours in the future', async () => {
      // Appointment is 48 hours in the future — well within cancellation policy
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const endDate = new Date(futureDate.getTime() + 30 * 60 * 1000);

      const mockAppointment: Appointment = {
        id: appointmentId,
        doctorId,
        patientId,
        startTime: futureDate,
        endTime: endDate,
        durationMinutes: 30,
        appointmentType: 'FOLLOW_UP',
        status: 'confirmed',
        createdAt: new Date(),
        cancelledAt: null,
      };

      mockedFindById.mockResolvedValue(mockAppointment);
      mockedCancel.mockResolvedValue(undefined);

      const response = await request(app)
        .post(`/api/appointments/${appointmentId}/cancel`)
        .send({ patientId });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Appointment cancelled successfully',
        appointmentId,
      });
      expect(mockedFindById).toHaveBeenCalledWith(appointmentId);
      expect(mockedCancel).toHaveBeenCalledWith(appointmentId);
    });
  });

  describe('Cancellation within 24-hour window', () => {
    it('should return 409 with CANCELLATION_POLICY error when appointment is less than 24 hours away', async () => {
      // Appointment is 12 hours in the future — within the 24-hour window
      const futureDate = new Date(Date.now() + 12 * 60 * 60 * 1000);
      const endDate = new Date(futureDate.getTime() + 60 * 60 * 1000);

      const mockAppointment: Appointment = {
        id: appointmentId,
        doctorId,
        patientId,
        startTime: futureDate,
        endTime: endDate,
        durationMinutes: 60,
        appointmentType: 'FIRST_VISIT',
        status: 'confirmed',
        createdAt: new Date(),
        cancelledAt: null,
      };

      mockedFindById.mockResolvedValue(mockAppointment);

      const response = await request(app)
        .post(`/api/appointments/${appointmentId}/cancel`)
        .send({ patientId });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe(ERROR_CODES.CANCELLATION_POLICY);
      expect(response.body.error.message).toContain('24 hours');
      expect(mockedCancel).not.toHaveBeenCalled();
    });
  });

  describe('Unauthorized cancellation', () => {
    it('should return 403 with UNAUTHORIZED_CANCEL error when patient does not own the appointment', async () => {
      const differentPatientId = '660e8400-e29b-41d4-a716-446655440099';
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const endDate = new Date(futureDate.getTime() + 30 * 60 * 1000);

      const mockAppointment: Appointment = {
        id: appointmentId,
        doctorId,
        patientId: differentPatientId, // Owned by a different patient
        startTime: futureDate,
        endTime: endDate,
        durationMinutes: 30,
        appointmentType: 'FOLLOW_UP',
        status: 'confirmed',
        createdAt: new Date(),
        cancelledAt: null,
      };

      mockedFindById.mockResolvedValue(mockAppointment);

      const response = await request(app)
        .post(`/api/appointments/${appointmentId}/cancel`)
        .send({ patientId }); // Requesting patient is different from owner

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe(ERROR_CODES.UNAUTHORIZED_CANCEL);
      expect(mockedCancel).not.toHaveBeenCalled();
    });
  });

  describe('Cancellation of non-existent appointment', () => {
    it('should return 404 with APPOINTMENT_NOT_FOUND error when appointment does not exist', async () => {
      mockedFindById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/appointments/nonexistent-id/cancel')
        .send({ patientId });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe(ERROR_CODES.APPOINTMENT_NOT_FOUND);
      expect(mockedCancel).not.toHaveBeenCalled();
    });
  });

  describe('Cancellation of already cancelled appointment', () => {
    it('should return 400 with ALREADY_CANCELLED error when appointment is already cancelled', async () => {
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const endDate = new Date(futureDate.getTime() + 30 * 60 * 1000);

      const mockAppointment: Appointment = {
        id: appointmentId,
        doctorId,
        patientId,
        startTime: futureDate,
        endTime: endDate,
        durationMinutes: 30,
        appointmentType: 'FOLLOW_UP',
        status: 'cancelled',
        createdAt: new Date(),
        cancelledAt: new Date(Date.now() - 60 * 60 * 1000),
      };

      mockedFindById.mockResolvedValue(mockAppointment);

      const response = await request(app)
        .post(`/api/appointments/${appointmentId}/cancel`)
        .send({ patientId });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe(ERROR_CODES.ALREADY_CANCELLED);
      expect(mockedCancel).not.toHaveBeenCalled();
    });
  });
});
