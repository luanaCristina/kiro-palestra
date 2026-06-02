import { searchDoctors, updateAvailability } from '../../src/services/doctor.service';
import * as doctorRepository from '../../src/repositories/doctor.repository';
import * as appointmentRepository from '../../src/repositories/appointment.repository';
import { ERROR_CODES } from '../../src/models/errors';
import { Doctor, AvailabilityRange, Appointment, AvailabilitySchedule } from '../../src/models/types';

// Mock the repositories
jest.mock('../../src/repositories/doctor.repository');
jest.mock('../../src/repositories/appointment.repository');

const mockedDoctorRepo = doctorRepository as jest.Mocked<typeof doctorRepository>;
const mockedAppointmentRepo = appointmentRepository as jest.Mocked<typeof appointmentRepository>;

describe('Doctor Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const makeDoctors = (count: number): Doctor[] =>
    Array.from({ length: count }, (_, i) => ({
      id: `doc-${i + 1}`,
      name: `Doctor ${i + 1}`,
      specialty: 'cardiology' as const,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    }));

  describe('searchDoctors', () => {
    it('should return empty array with message when no doctors match specialty', async () => {
      mockedDoctorRepo.searchBySpecialty.mockResolvedValue([]);

      const result = await searchDoctors('cardiology');

      expect(result.doctors).toEqual([]);
      expect(result.message).toBe(
        'No doctors found for the selected specialty and date combination'
      );
    });

    it('should return all matching doctors without slot info when no date provided', async () => {
      const doctors = makeDoctors(3);
      mockedDoctorRepo.searchBySpecialty.mockResolvedValue(doctors);

      const result = await searchDoctors('cardiology');

      expect(result.doctors).toEqual(doctors);
      expect(result.message).toBeUndefined();
    });

    it('should filter out doctors with no available slots when date is provided', async () => {
      const doctors = makeDoctors(2);
      mockedDoctorRepo.searchBySpecialty.mockResolvedValue(doctors);

      // Doctor 1 has availability, Doctor 2 does not
      mockedDoctorRepo.getAvailabilityRanges
        .mockResolvedValueOnce([
          { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
        ])
        .mockResolvedValueOnce([]); // No availability for doctor 2

      mockedAppointmentRepo.findByDoctorAndDateRange
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      // 2027-03-15 is a Monday (day 1)
      const result = await searchDoctors('cardiology', '2027-03-15');

      // Only doctor 1 should be in results (doctor 2 has no availability ranges)
      expect(result.doctors.length).toBe(1);
      expect(result.doctors[0].id).toBe('doc-1');
      expect(result.doctors[0].availableSlots).toBeDefined();
      expect(result.doctors[0].availableSlots!.length).toBeGreaterThan(0);
    });

    it('should order results by earliest available slot', async () => {
      const doctors = makeDoctors(2);
      mockedDoctorRepo.searchBySpecialty.mockResolvedValue(doctors);

      // Doctor 1 has later availability, Doctor 2 has earlier availability
      mockedDoctorRepo.getAvailabilityRanges
        .mockResolvedValueOnce([
          { dayOfWeek: 1, startTime: '14:00', endTime: '17:00' },
        ])
        .mockResolvedValueOnce([
          { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
        ]);

      mockedAppointmentRepo.findByDoctorAndDateRange
        .mockResolvedValue([]);

      const result = await searchDoctors('cardiology', '2027-03-15');

      // Doctor 2 should come first (earlier slot at 09:00 vs 14:00)
      expect(result.doctors.length).toBe(2);
      expect(result.doctors[0].id).toBe('doc-2');
      expect(result.doctors[1].id).toBe('doc-1');
    });

    it('should return empty with message when all doctors have no available slots', async () => {
      const doctors = makeDoctors(1);
      mockedDoctorRepo.searchBySpecialty.mockResolvedValue(doctors);

      // Doctor has no availability on the target day
      mockedDoctorRepo.getAvailabilityRanges.mockResolvedValue([]);
      mockedAppointmentRepo.findByDoctorAndDateRange.mockResolvedValue([]);

      const result = await searchDoctors('cardiology', '2027-03-15');

      expect(result.doctors).toEqual([]);
      expect(result.message).toBe(
        'No doctors found for the selected specialty and date combination'
      );
    });

    it('should include available slots in each doctor result', async () => {
      const doctors = makeDoctors(1);
      mockedDoctorRepo.searchBySpecialty.mockResolvedValue(doctors);

      mockedDoctorRepo.getAvailabilityRanges.mockResolvedValue([
        { dayOfWeek: 1, startTime: '09:00', endTime: '10:00' },
      ]);
      mockedAppointmentRepo.findByDoctorAndDateRange.mockResolvedValue([]);

      const result = await searchDoctors('cardiology', '2027-03-15');

      expect(result.doctors[0].availableSlots).toBeDefined();
      expect(result.doctors[0].availableSlots!.length).toBeGreaterThan(0);
      // All slots should be marked as available
      for (const slot of result.doctors[0].availableSlots!) {
        expect(slot.available).toBe(true);
      }
    });
  });

  describe('updateAvailability', () => {
    it('should throw DOCTOR_NOT_FOUND when doctor does not exist', async () => {
      mockedDoctorRepo.findById.mockResolvedValue(null);

      const schedule: AvailabilitySchedule = {
        doctorId: 'non-existent',
        ranges: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }],
      };

      await expect(updateAvailability('non-existent', schedule)).rejects.toMatchObject({
        code: ERROR_CODES.DOCTOR_NOT_FOUND,
      });
    });

    it('should throw INVALID_TIME_RANGE when endTime <= startTime', async () => {
      mockedDoctorRepo.findById.mockResolvedValue(makeDoctors(1)[0]);

      const schedule: AvailabilitySchedule = {
        doctorId: 'doc-1',
        ranges: [{ dayOfWeek: 1, startTime: '17:00', endTime: '09:00' }],
      };

      await expect(updateAvailability('doc-1', schedule)).rejects.toMatchObject({
        code: ERROR_CODES.INVALID_TIME_RANGE,
      });
    });

    it('should throw INVALID_TIME_RANGE when endTime equals startTime', async () => {
      mockedDoctorRepo.findById.mockResolvedValue(makeDoctors(1)[0]);

      const schedule: AvailabilitySchedule = {
        doctorId: 'doc-1',
        ranges: [{ dayOfWeek: 1, startTime: '09:00', endTime: '09:00' }],
      };

      await expect(updateAvailability('doc-1', schedule)).rejects.toMatchObject({
        code: ERROR_CODES.INVALID_TIME_RANGE,
      });
    });

    it('should throw TOO_MANY_RANGES when more than 5 ranges on same day', async () => {
      mockedDoctorRepo.findById.mockResolvedValue(makeDoctors(1)[0]);

      const ranges: AvailabilityRange[] = Array.from({ length: 6 }, (_, i) => ({
        dayOfWeek: 1,
        startTime: `${String(8 + i).padStart(2, '0')}:00`,
        endTime: `${String(8 + i).padStart(2, '0')}:30`,
      }));

      const schedule: AvailabilitySchedule = { doctorId: 'doc-1', ranges };

      await expect(updateAvailability('doc-1', schedule)).rejects.toMatchObject({
        code: ERROR_CODES.TOO_MANY_RANGES,
      });
    });

    it('should throw OVERLAPPING_RANGES when ranges overlap on same day', async () => {
      mockedDoctorRepo.findById.mockResolvedValue(makeDoctors(1)[0]);

      const schedule: AvailabilitySchedule = {
        doctorId: 'doc-1',
        ranges: [
          { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
          { dayOfWeek: 1, startTime: '11:00', endTime: '14:00' },
        ],
      };

      await expect(updateAvailability('doc-1', schedule)).rejects.toMatchObject({
        code: ERROR_CODES.OVERLAPPING_RANGES,
      });
    });

    it('should allow adjacent ranges (one ends when other starts)', async () => {
      mockedDoctorRepo.findById.mockResolvedValue(makeDoctors(1)[0]);
      mockedDoctorRepo.updateAvailability.mockResolvedValue(undefined);

      const schedule: AvailabilitySchedule = {
        doctorId: 'doc-1',
        ranges: [
          { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
          { dayOfWeek: 1, startTime: '12:00', endTime: '17:00' },
        ],
      };

      const result = await updateAvailability('doc-1', schedule);

      expect(result.doctorId).toBe('doc-1');
      expect(result.ranges).toEqual(schedule.ranges);
    });

    it('should allow ranges on different days without overlap check', async () => {
      mockedDoctorRepo.findById.mockResolvedValue(makeDoctors(1)[0]);
      mockedDoctorRepo.updateAvailability.mockResolvedValue(undefined);

      const schedule: AvailabilitySchedule = {
        doctorId: 'doc-1',
        ranges: [
          { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
          { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
        ],
      };

      const result = await updateAvailability('doc-1', schedule);

      expect(result.doctorId).toBe('doc-1');
      expect(result.ranges.length).toBe(2);
    });

    it('should persist schedule and return updated schedule on success', async () => {
      mockedDoctorRepo.findById.mockResolvedValue(makeDoctors(1)[0]);
      mockedDoctorRepo.updateAvailability.mockResolvedValue(undefined);

      const schedule: AvailabilitySchedule = {
        doctorId: 'doc-1',
        ranges: [
          { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
          { dayOfWeek: 1, startTime: '13:00', endTime: '17:00' },
        ],
      };

      const result = await updateAvailability('doc-1', schedule);

      expect(mockedDoctorRepo.updateAvailability).toHaveBeenCalledWith(
        'doc-1',
        schedule.ranges
      );
      expect(result).toEqual({ doctorId: 'doc-1', ranges: schedule.ranges });
    });

    it('should allow exactly 5 ranges per day', async () => {
      mockedDoctorRepo.findById.mockResolvedValue(makeDoctors(1)[0]);
      mockedDoctorRepo.updateAvailability.mockResolvedValue(undefined);

      const ranges: AvailabilityRange[] = [
        { dayOfWeek: 1, startTime: '08:00', endTime: '09:00' },
        { dayOfWeek: 1, startTime: '09:00', endTime: '10:00' },
        { dayOfWeek: 1, startTime: '10:00', endTime: '11:00' },
        { dayOfWeek: 1, startTime: '11:00', endTime: '12:00' },
        { dayOfWeek: 1, startTime: '13:00', endTime: '14:00' },
      ];

      const schedule: AvailabilitySchedule = { doctorId: 'doc-1', ranges };

      const result = await updateAvailability('doc-1', schedule);
      expect(result.ranges.length).toBe(5);
    });
  });
});
