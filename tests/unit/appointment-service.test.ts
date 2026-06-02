import { bookAppointment, cancelAppointment, AppError } from '../../src/services/appointment.service';
import * as doctorRepository from '../../src/repositories/doctor.repository';
import * as appointmentRepository from '../../src/repositories/appointment.repository';
import { ERROR_CODES } from '../../src/models/errors';
import { Appointment } from '../../src/models/types';

// Mock the database and repositories
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

const mockedDoctorRepo = doctorRepository as jest.Mocked<typeof doctorRepository>;
const mockedAppointmentRepo = appointmentRepository as jest.Mocked<typeof appointmentRepository>;

describe('AppointmentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('bookAppointment', () => {
    const validRequest = {
      patientId: 'patient-123',
      doctorId: 'doctor-456',
      startTime: '2025-03-15T10:00:00.000Z',
      appointmentType: 'FIRST_VISIT' as const,
    };

    it('should throw DOCTOR_NOT_FOUND when doctor does not exist', async () => {
      mockedDoctorRepo.findById.mockResolvedValue(null);

      await expect(bookAppointment(validRequest)).rejects.toMatchObject({
        code: ERROR_CODES.DOCTOR_NOT_FOUND,
        statusCode: 404,
      });
    });

    it('should throw NO_AVAILABILITY when doctor has no availability ranges', async () => {
      mockedDoctorRepo.findById.mockResolvedValue({
        id: 'doctor-456',
        name: 'Dr. Smith',
        specialty: 'cardiology',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockedDoctorRepo.getAvailabilityRanges.mockResolvedValue([]);

      await expect(bookAppointment(validRequest)).rejects.toMatchObject({
        code: ERROR_CODES.NO_AVAILABILITY,
        statusCode: 409,
      });
    });

    it('should throw OUTSIDE_AVAILABILITY when appointment is outside doctor hours', async () => {
      mockedDoctorRepo.findById.mockResolvedValue({
        id: 'doctor-456',
        name: 'Dr. Smith',
        specialty: 'cardiology',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      // Doctor available 08:00-12:00, but appointment at 14:00 (UTC hours depend on timezone)
      mockedDoctorRepo.getAvailabilityRanges.mockResolvedValue([
        { dayOfWeek: 6, startTime: '08:00', endTime: '12:00' },
      ]);

      const request = {
        ...validRequest,
        startTime: '2025-03-15T14:00:00.000Z', // Saturday
      };

      await expect(bookAppointment(request)).rejects.toMatchObject({
        code: ERROR_CODES.OUTSIDE_AVAILABILITY,
        statusCode: 409,
      });
    });

    it('should throw SLOT_UNAVAILABLE when there is an overlap', async () => {
      mockedDoctorRepo.findById.mockResolvedValue({
        id: 'doctor-456',
        name: 'Dr. Smith',
        specialty: 'cardiology',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockedDoctorRepo.getAvailabilityRanges.mockResolvedValue([
        { dayOfWeek: 6, startTime: '00:00', endTime: '23:59' },
      ]);

      const existingAppointment: Appointment = {
        id: 'existing-apt-1',
        doctorId: 'doctor-456',
        patientId: 'other-patient',
        startTime: new Date('2025-03-15T10:00:00.000Z'),
        endTime: new Date('2025-03-15T11:00:00.000Z'),
        durationMinutes: 60,
        appointmentType: 'FIRST_VISIT',
        status: 'confirmed',
        createdAt: new Date(),
        cancelledAt: null,
      };

      mockedAppointmentRepo.findByDoctorForUpdate.mockResolvedValue([existingAppointment]);

      await expect(bookAppointment(validRequest)).rejects.toMatchObject({
        code: ERROR_CODES.SLOT_UNAVAILABLE,
        statusCode: 409,
      });
    });

    it('should successfully book an appointment when slot is available', async () => {
      mockedDoctorRepo.findById.mockResolvedValue({
        id: 'doctor-456',
        name: 'Dr. Smith',
        specialty: 'cardiology',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockedDoctorRepo.getAvailabilityRanges.mockResolvedValue([
        { dayOfWeek: 6, startTime: '00:00', endTime: '23:59' },
      ]);
      mockedAppointmentRepo.findByDoctorForUpdate.mockResolvedValue([]);
      mockedAppointmentRepo.create.mockResolvedValue({
        id: 'apt-789',
        doctorId: 'doctor-456',
        patientId: 'patient-123',
        startTime: new Date('2025-03-15T10:00:00.000Z'),
        endTime: new Date('2025-03-15T11:00:00.000Z'),
        durationMinutes: 60,
        appointmentType: 'FIRST_VISIT',
        status: 'confirmed',
        createdAt: new Date(),
        cancelledAt: null,
      });

      // Mock patient lookup
      const { query: mockQuery } = require('../../src/config/database');
      mockQuery.mockResolvedValue({ rows: [{ name: 'John Doe' }] });

      const result = await bookAppointment(validRequest);

      expect(result.appointmentId).toBe('apt-789');
      expect(result.doctorName).toBe('Dr. Smith');
      expect(result.specialty).toBe('cardiology');
      expect(result.patientName).toBe('John Doe');
      expect(result.appointmentType).toBe('FIRST_VISIT');
      expect(result.date).toBe('2025-03-15');
    });

    it('should calculate correct end time for FOLLOW_UP (30 minutes)', async () => {
      mockedDoctorRepo.findById.mockResolvedValue({
        id: 'doctor-456',
        name: 'Dr. Smith',
        specialty: 'cardiology',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockedDoctorRepo.getAvailabilityRanges.mockResolvedValue([
        { dayOfWeek: 6, startTime: '00:00', endTime: '23:59' },
      ]);
      mockedAppointmentRepo.findByDoctorForUpdate.mockResolvedValue([]);
      mockedAppointmentRepo.create.mockImplementation(async (apt) => ({
        id: 'apt-follow',
        ...apt,
        createdAt: new Date(),
      }));

      const { query: mockQuery } = require('../../src/config/database');
      mockQuery.mockResolvedValue({ rows: [{ name: 'Jane Doe' }] });

      const request = {
        ...validRequest,
        appointmentType: 'FOLLOW_UP' as const,
      };

      const result = await bookAppointment(request);

      const start = new Date(result.startTime);
      const end = new Date(result.endTime);
      const diffMinutes = (end.getTime() - start.getTime()) / (60 * 1000);
      expect(diffMinutes).toBe(30);
    });
  });

  describe('cancelAppointment', () => {
    it('should throw APPOINTMENT_NOT_FOUND when appointment does not exist', async () => {
      mockedAppointmentRepo.findById.mockResolvedValue(null);

      await expect(
        cancelAppointment('nonexistent-id', 'patient-123')
      ).rejects.toMatchObject({
        code: ERROR_CODES.APPOINTMENT_NOT_FOUND,
        statusCode: 404,
      });
    });

    it('should throw UNAUTHORIZED_CANCEL when patient does not own the appointment', async () => {
      mockedAppointmentRepo.findById.mockResolvedValue({
        id: 'apt-1',
        doctorId: 'doctor-456',
        patientId: 'other-patient',
        startTime: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from now
        endTime: new Date(Date.now() + 49 * 60 * 60 * 1000),
        durationMinutes: 60,
        appointmentType: 'FIRST_VISIT',
        status: 'confirmed',
        createdAt: new Date(),
        cancelledAt: null,
      });

      await expect(
        cancelAppointment('apt-1', 'patient-123')
      ).rejects.toMatchObject({
        code: ERROR_CODES.UNAUTHORIZED_CANCEL,
        statusCode: 403,
      });
    });

    it('should throw ALREADY_CANCELLED when appointment is already cancelled', async () => {
      mockedAppointmentRepo.findById.mockResolvedValue({
        id: 'apt-1',
        doctorId: 'doctor-456',
        patientId: 'patient-123',
        startTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 49 * 60 * 60 * 1000),
        durationMinutes: 60,
        appointmentType: 'FIRST_VISIT',
        status: 'cancelled',
        createdAt: new Date(),
        cancelledAt: new Date(),
      });

      await expect(
        cancelAppointment('apt-1', 'patient-123')
      ).rejects.toMatchObject({
        code: ERROR_CODES.ALREADY_CANCELLED,
        statusCode: 400,
      });
    });

    it('should throw PAST_APPOINTMENT when appointment is in the past', async () => {
      mockedAppointmentRepo.findById.mockResolvedValue({
        id: 'apt-1',
        doctorId: 'doctor-456',
        patientId: 'patient-123',
        startTime: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        endTime: new Date(Date.now() - 30 * 60 * 1000),
        durationMinutes: 30,
        appointmentType: 'FOLLOW_UP',
        status: 'confirmed',
        createdAt: new Date(),
        cancelledAt: null,
      });

      await expect(
        cancelAppointment('apt-1', 'patient-123')
      ).rejects.toMatchObject({
        code: ERROR_CODES.PAST_APPOINTMENT,
        statusCode: 400,
      });
    });

    it('should throw CANCELLATION_POLICY when within 24-hour window', async () => {
      mockedAppointmentRepo.findById.mockResolvedValue({
        id: 'apt-1',
        doctorId: 'doctor-456',
        patientId: 'patient-123',
        startTime: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
        endTime: new Date(Date.now() + 13 * 60 * 60 * 1000),
        durationMinutes: 60,
        appointmentType: 'FIRST_VISIT',
        status: 'confirmed',
        createdAt: new Date(),
        cancelledAt: null,
      });

      await expect(
        cancelAppointment('apt-1', 'patient-123')
      ).rejects.toMatchObject({
        code: ERROR_CODES.CANCELLATION_POLICY,
        statusCode: 409,
      });
    });

    it('should successfully cancel when more than 24 hours before appointment', async () => {
      mockedAppointmentRepo.findById.mockResolvedValue({
        id: 'apt-1',
        doctorId: 'doctor-456',
        patientId: 'patient-123',
        startTime: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from now
        endTime: new Date(Date.now() + 49 * 60 * 60 * 1000),
        durationMinutes: 60,
        appointmentType: 'FIRST_VISIT',
        status: 'confirmed',
        createdAt: new Date(),
        cancelledAt: null,
      });

      await expect(
        cancelAppointment('apt-1', 'patient-123')
      ).resolves.toBeUndefined();

      expect(mockedAppointmentRepo.cancel).toHaveBeenCalledWith('apt-1');
    });
  });
});
