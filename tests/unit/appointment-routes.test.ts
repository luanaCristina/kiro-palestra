import express from 'express';
import request from 'supertest';
import appointmentRoutes from '../../src/routes/appointment.routes';
import { AppError } from '../../src/services/appointment.service';
import { ERROR_CODES } from '../../src/models/errors';

// Mock the appointment service
jest.mock('../../src/services/appointment.service', () => ({
  cancelAppointment: jest.fn(),
  AppError: class AppError extends Error {
    constructor(
      public code: string,
      message: string,
      public statusCode: number,
      public details?: Record<string, unknown>
    ) {
      super(message);
      this.name = 'AppError';
    }
  },
}));

const { cancelAppointment } = require('../../src/services/appointment.service');

describe('POST /api/appointments/:appointmentId/cancel', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/appointments', appointmentRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 200 on successful cancellation', async () => {
    cancelAppointment.mockResolvedValue(undefined);

    const response = await request(app)
      .post('/api/appointments/apt-123/cancel')
      .send({ patientId: '550e8400-e29b-41d4-a716-446655440000' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: 'Appointment cancelled successfully',
      appointmentId: 'apt-123',
    });
    expect(cancelAppointment).toHaveBeenCalledWith(
      'apt-123',
      '550e8400-e29b-41d4-a716-446655440000'
    );
  });

  it('should return 400 when patientId is missing', async () => {
    const response = await request(app)
      .post('/api/appointments/apt-123/cancel')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 when patientId is not a valid UUID', async () => {
    const response = await request(app)
      .post('/api/appointments/apt-123/cancel')
      .send({ patientId: 'not-a-uuid' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 404 when appointment is not found', async () => {
    const { AppError: AppErrorClass } = require('../../src/services/appointment.service');
    cancelAppointment.mockRejectedValue(
      new AppErrorClass(
        ERROR_CODES.APPOINTMENT_NOT_FOUND,
        'Appointment not found',
        404
      )
    );

    const response = await request(app)
      .post('/api/appointments/nonexistent/cancel')
      .send({ patientId: '550e8400-e29b-41d4-a716-446655440000' });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe(ERROR_CODES.APPOINTMENT_NOT_FOUND);
  });

  it('should return 403 when patient is not authorized', async () => {
    const { AppError: AppErrorClass } = require('../../src/services/appointment.service');
    cancelAppointment.mockRejectedValue(
      new AppErrorClass(
        ERROR_CODES.UNAUTHORIZED_CANCEL,
        'You are not authorized to cancel this appointment',
        403
      )
    );

    const response = await request(app)
      .post('/api/appointments/apt-123/cancel')
      .send({ patientId: '550e8400-e29b-41d4-a716-446655440000' });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe(ERROR_CODES.UNAUTHORIZED_CANCEL);
  });

  it('should return 409 when cancellation policy is violated', async () => {
    const { AppError: AppErrorClass } = require('../../src/services/appointment.service');
    cancelAppointment.mockRejectedValue(
      new AppErrorClass(
        ERROR_CODES.CANCELLATION_POLICY,
        'Cancellation must be made more than 24 hours before the appointment',
        409
      )
    );

    const response = await request(app)
      .post('/api/appointments/apt-123/cancel')
      .send({ patientId: '550e8400-e29b-41d4-a716-446655440000' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe(ERROR_CODES.CANCELLATION_POLICY);
  });

  it('should return 400 when appointment is already cancelled', async () => {
    const { AppError: AppErrorClass } = require('../../src/services/appointment.service');
    cancelAppointment.mockRejectedValue(
      new AppErrorClass(
        ERROR_CODES.ALREADY_CANCELLED,
        'Appointment has already been cancelled',
        400
      )
    );

    const response = await request(app)
      .post('/api/appointments/apt-123/cancel')
      .send({ patientId: '550e8400-e29b-41d4-a716-446655440000' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe(ERROR_CODES.ALREADY_CANCELLED);
  });

  it('should return 400 when appointment is in the past', async () => {
    const { AppError: AppErrorClass } = require('../../src/services/appointment.service');
    cancelAppointment.mockRejectedValue(
      new AppErrorClass(
        ERROR_CODES.PAST_APPOINTMENT,
        'Past appointments cannot be cancelled',
        400
      )
    );

    const response = await request(app)
      .post('/api/appointments/apt-123/cancel')
      .send({ patientId: '550e8400-e29b-41d4-a716-446655440000' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe(ERROR_CODES.PAST_APPOINTMENT);
  });
});
