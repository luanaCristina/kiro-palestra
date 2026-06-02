import express from 'express';
import request from 'supertest';
import doctorRoutes from '../../src/routes/doctor.routes';
import * as doctorService from '../../src/services/doctor.service';
import { ERROR_CODES } from '../../src/models/errors';

jest.mock('../../src/services/doctor.service');

const mockedDoctorService = doctorService as jest.Mocked<typeof doctorService>;

const app = express();
app.use(express.json());
app.use('/api/doctors', doctorRoutes);

describe('Doctor Routes - PUT /:doctorId/availability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const validBody = {
    schedule: {
      ranges: [
        { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
        { dayOfWeek: 1, startTime: '13:00', endTime: '17:00' },
      ],
    },
  };

  it('should return 200 with updated schedule on success', async () => {
    mockedDoctorService.updateAvailability.mockResolvedValue({
      doctorId: 'doc-123',
      ranges: validBody.schedule.ranges,
    });

    const res = await request(app)
      .put('/api/doctors/doc-123/availability')
      .send(validBody);

    expect(res.status).toBe(200);
    expect(res.body.schedule).toEqual({
      doctorId: 'doc-123',
      ranges: validBody.schedule.ranges,
    });
    expect(mockedDoctorService.updateAvailability).toHaveBeenCalledWith('doc-123', {
      doctorId: 'doc-123',
      ranges: validBody.schedule.ranges,
    });
  });

  it('should return 400 for validation errors (invalid time format)', async () => {
    const invalidBody = {
      schedule: {
        ranges: [
          { dayOfWeek: 1, startTime: '09:07', endTime: '12:00' },
        ],
      },
    };

    const res = await request(app)
      .put('/api/doctors/doc-123/availability')
      .send(invalidBody);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for validation errors (endTime before startTime)', async () => {
    const invalidBody = {
      schedule: {
        ranges: [
          { dayOfWeek: 1, startTime: '17:00', endTime: '09:00' },
        ],
      },
    };

    const res = await request(app)
      .put('/api/doctors/doc-123/availability')
      .send(invalidBody);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for validation errors (more than 5 ranges per day)', async () => {
    const invalidBody = {
      schedule: {
        ranges: Array.from({ length: 6 }, (_, i) => ({
          dayOfWeek: 1,
          startTime: `${String(8 + i).padStart(2, '0')}:00`,
          endTime: `${String(8 + i).padStart(2, '0')}:30`,
        })),
      },
    };

    const res = await request(app)
      .put('/api/doctors/doc-123/availability')
      .send(invalidBody);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for validation errors (overlapping ranges)', async () => {
    const invalidBody = {
      schedule: {
        ranges: [
          { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
          { dayOfWeek: 1, startTime: '11:00', endTime: '14:00' },
        ],
      },
    };

    const res = await request(app)
      .put('/api/doctors/doc-123/availability')
      .send(invalidBody);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 404 when doctor is not found (service error)', async () => {
    const error = new Error('Doctor not found') as Error & { code: string };
    error.code = ERROR_CODES.DOCTOR_NOT_FOUND;
    mockedDoctorService.updateAvailability.mockRejectedValue(error);

    const res = await request(app)
      .put('/api/doctors/non-existent/availability')
      .send(validBody);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe(ERROR_CODES.DOCTOR_NOT_FOUND);
  });

  it('should return 400 when service throws INVALID_TIME_RANGE', async () => {
    const error = new Error('Invalid time range') as Error & { code: string };
    error.code = ERROR_CODES.INVALID_TIME_RANGE;
    mockedDoctorService.updateAvailability.mockRejectedValue(error);

    const res = await request(app)
      .put('/api/doctors/doc-123/availability')
      .send(validBody);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(ERROR_CODES.INVALID_TIME_RANGE);
  });

  it('should return 400 when service throws TOO_MANY_RANGES', async () => {
    const error = new Error('Too many ranges') as Error & { code: string };
    error.code = ERROR_CODES.TOO_MANY_RANGES;
    mockedDoctorService.updateAvailability.mockRejectedValue(error);

    const res = await request(app)
      .put('/api/doctors/doc-123/availability')
      .send(validBody);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(ERROR_CODES.TOO_MANY_RANGES);
  });

  it('should return 400 when service throws OVERLAPPING_RANGES', async () => {
    const error = new Error('Overlapping ranges') as Error & { code: string };
    error.code = ERROR_CODES.OVERLAPPING_RANGES;
    mockedDoctorService.updateAvailability.mockRejectedValue(error);

    const res = await request(app)
      .put('/api/doctors/doc-123/availability')
      .send(validBody);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(ERROR_CODES.OVERLAPPING_RANGES);
  });

  it('should return 500 for unexpected errors', async () => {
    mockedDoctorService.updateAvailability.mockRejectedValue(new Error('Unexpected'));

    const res = await request(app)
      .put('/api/doctors/doc-123/availability')
      .send(validBody);

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });

  it('should return 400 for missing schedule in body', async () => {
    const res = await request(app)
      .put('/api/doctors/doc-123/availability')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for invalid dayOfWeek', async () => {
    const invalidBody = {
      schedule: {
        ranges: [
          { dayOfWeek: 7, startTime: '09:00', endTime: '12:00' },
        ],
      },
    };

    const res = await request(app)
      .put('/api/doctors/doc-123/availability')
      .send(invalidBody);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
