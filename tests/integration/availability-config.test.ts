import request from 'supertest';
import app from '../../src/app';
import * as doctorRepository from '../../src/repositories/doctor.repository';
import * as appointmentRepository from '../../src/repositories/appointment.repository';
import { Doctor } from '../../src/models/types';

// Mock repositories and database at the module level
jest.mock('../../src/repositories/doctor.repository');
jest.mock('../../src/repositories/appointment.repository');
jest.mock('../../src/config/database', () => ({
  pool: { connect: jest.fn() },
  query: jest.fn(),
}));

const mockedDoctorRepo = doctorRepository as jest.Mocked<typeof doctorRepository>;
const mockedAppointmentRepo = appointmentRepository as jest.Mocked<typeof appointmentRepository>;

describe('Integration: Availability Configuration', () => {
  const mockDoctor: Doctor = {
    id: 'doc-uuid-1234',
    name: 'Dr. Smith',
    specialty: 'cardiology',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Validates: Requirements 6.1, 6.2
   * Successful schedule update returns 200 with the updated schedule.
   */
  describe('Successful schedule update', () => {
    it('should return 200 with updated schedule when valid data is provided', async () => {
      mockedDoctorRepo.findById.mockResolvedValue(mockDoctor);
      mockedDoctorRepo.updateAvailability.mockResolvedValue();

      const validSchedule = {
        schedule: {
          ranges: [
            { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
            { dayOfWeek: 1, startTime: '14:00', endTime: '17:00' },
            { dayOfWeek: 3, startTime: '08:00', endTime: '12:00' },
          ],
        },
      };

      const res = await request(app)
        .put(`/api/doctors/${mockDoctor.id}/availability`)
        .send(validSchedule);

      expect(res.status).toBe(200);
      expect(res.body.schedule).toEqual({
        doctorId: mockDoctor.id,
        ranges: validSchedule.schedule.ranges,
      });
      expect(mockedDoctorRepo.findById).toHaveBeenCalledWith(mockDoctor.id);
      expect(mockedDoctorRepo.updateAvailability).toHaveBeenCalledWith(
        mockDoctor.id,
        validSchedule.schedule.ranges
      );
    });
  });

  /**
   * Validates: Requirements 6.2
   * Schedule update does not affect existing appointments.
   */
  describe('Schedule update does not affect existing appointments', () => {
    it('should not call appointment repository to modify appointments when updating schedule', async () => {
      mockedDoctorRepo.findById.mockResolvedValue(mockDoctor);
      mockedDoctorRepo.updateAvailability.mockResolvedValue();

      const newSchedule = {
        schedule: {
          ranges: [
            { dayOfWeek: 2, startTime: '10:00', endTime: '14:00' },
          ],
        },
      };

      const res = await request(app)
        .put(`/api/doctors/${mockDoctor.id}/availability`)
        .send(newSchedule);

      expect(res.status).toBe(200);

      // Verify appointment repository is never called to modify appointments
      expect(mockedAppointmentRepo.cancel).not.toHaveBeenCalled();
      expect(mockedAppointmentRepo.create).not.toHaveBeenCalled();
      expect(mockedAppointmentRepo.findByDoctorAndDateRange).not.toHaveBeenCalled();
      expect(mockedAppointmentRepo.findByDoctorForUpdate).not.toHaveBeenCalled();
    });
  });

  /**
   * Validates: Requirements 6.5
   * Overlapping ranges on the same day are rejected.
   */
  describe('Overlapping ranges are rejected', () => {
    it('should return 400 with VALIDATION_ERROR for overlapping ranges on same day', async () => {
      const overlappingSchedule = {
        schedule: {
          ranges: [
            { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
            { dayOfWeek: 1, startTime: '11:00', endTime: '14:00' },
          ],
        },
      };

      const res = await request(app)
        .put(`/api/doctors/${mockDoctor.id}/availability`)
        .send(overlappingSchedule);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');

      // Service should never be called since validation catches it first
      expect(mockedDoctorRepo.findById).not.toHaveBeenCalled();
      expect(mockedDoctorRepo.updateAvailability).not.toHaveBeenCalled();
    });

    it('should return 400 for ranges where one is fully contained within another', async () => {
      const containedSchedule = {
        schedule: {
          ranges: [
            { dayOfWeek: 2, startTime: '08:00', endTime: '17:00' },
            { dayOfWeek: 2, startTime: '10:00', endTime: '12:00' },
          ],
        },
      };

      const res = await request(app)
        .put(`/api/doctors/${mockDoctor.id}/availability`)
        .send(containedSchedule);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should allow adjacent (non-overlapping) ranges on the same day', async () => {
      mockedDoctorRepo.findById.mockResolvedValue(mockDoctor);
      mockedDoctorRepo.updateAvailability.mockResolvedValue();

      const adjacentSchedule = {
        schedule: {
          ranges: [
            { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
            { dayOfWeek: 1, startTime: '12:00', endTime: '15:00' },
          ],
        },
      };

      const res = await request(app)
        .put(`/api/doctors/${mockDoctor.id}/availability`)
        .send(adjacentSchedule);

      expect(res.status).toBe(200);
      expect(res.body.schedule.ranges).toHaveLength(2);
    });
  });

  /**
   * Validates: Requirements 6.4
   * Max 5 ranges per day enforcement.
   */
  describe('Max 5 ranges per day enforcement', () => {
    it('should return 400 with VALIDATION_ERROR when more than 5 ranges on same day', async () => {
      const sixRangesSchedule = {
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
        .put(`/api/doctors/${mockDoctor.id}/availability`)
        .send(sixRangesSchedule);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');

      // Service should never be called since validation catches it first
      expect(mockedDoctorRepo.findById).not.toHaveBeenCalled();
      expect(mockedDoctorRepo.updateAvailability).not.toHaveBeenCalled();
    });

    it('should allow exactly 5 ranges per day', async () => {
      mockedDoctorRepo.findById.mockResolvedValue(mockDoctor);
      mockedDoctorRepo.updateAvailability.mockResolvedValue();

      const fiveRangesSchedule = {
        schedule: {
          ranges: [
            { dayOfWeek: 1, startTime: '06:00', endTime: '07:00' },
            { dayOfWeek: 1, startTime: '08:00', endTime: '09:00' },
            { dayOfWeek: 1, startTime: '10:00', endTime: '11:00' },
            { dayOfWeek: 1, startTime: '12:00', endTime: '13:00' },
            { dayOfWeek: 1, startTime: '14:00', endTime: '15:00' },
          ],
        },
      };

      const res = await request(app)
        .put(`/api/doctors/${mockDoctor.id}/availability`)
        .send(fiveRangesSchedule);

      expect(res.status).toBe(200);
      expect(res.body.schedule.ranges).toHaveLength(5);
    });

    it('should allow more than 5 ranges total if spread across different days', async () => {
      mockedDoctorRepo.findById.mockResolvedValue(mockDoctor);
      mockedDoctorRepo.updateAvailability.mockResolvedValue();

      const multiDaySchedule = {
        schedule: {
          ranges: [
            { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
            { dayOfWeek: 1, startTime: '13:00', endTime: '17:00' },
            { dayOfWeek: 2, startTime: '09:00', endTime: '12:00' },
            { dayOfWeek: 2, startTime: '13:00', endTime: '17:00' },
            { dayOfWeek: 3, startTime: '09:00', endTime: '12:00' },
            { dayOfWeek: 3, startTime: '13:00', endTime: '17:00' },
          ],
        },
      };

      const res = await request(app)
        .put(`/api/doctors/${mockDoctor.id}/availability`)
        .send(multiDaySchedule);

      expect(res.status).toBe(200);
      expect(res.body.schedule.ranges).toHaveLength(6);
    });
  });

  /**
   * Validates: Requirements 6.1
   * Invalid time range (endTime <= startTime) is rejected.
   */
  describe('Invalid time range (endTime <= startTime)', () => {
    it('should return 400 with VALIDATION_ERROR when endTime is before startTime', async () => {
      const invalidSchedule = {
        schedule: {
          ranges: [
            { dayOfWeek: 1, startTime: '14:00', endTime: '09:00' },
          ],
        },
      };

      const res = await request(app)
        .put(`/api/doctors/${mockDoctor.id}/availability`)
        .send(invalidSchedule);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 with VALIDATION_ERROR when endTime equals startTime', async () => {
      const invalidSchedule = {
        schedule: {
          ranges: [
            { dayOfWeek: 1, startTime: '09:00', endTime: '09:00' },
          ],
        },
      };

      const res = await request(app)
        .put(`/api/doctors/${mockDoctor.id}/availability`)
        .send(invalidSchedule);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  /**
   * Validates: Requirements 6.1
   * Doctor not found returns 404.
   */
  describe('Doctor not found', () => {
    it('should return 404 with DOCTOR_NOT_FOUND when doctor does not exist', async () => {
      mockedDoctorRepo.findById.mockResolvedValue(null);

      const validSchedule = {
        schedule: {
          ranges: [
            { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
          ],
        },
      };

      const res = await request(app)
        .put('/api/doctors/nonexistent-uuid/availability')
        .send(validSchedule);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('DOCTOR_NOT_FOUND');
    });
  });
});
