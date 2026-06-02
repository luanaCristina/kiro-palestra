import { AppointmentStatus, AppointmentType, Specialty } from "./enums";

/**
 * Represents a doctor in the system.
 */
export interface Doctor {
  id: string;
  name: string;
  specialty: Specialty;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Represents a patient in the system.
 */
export interface Patient {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

/**
 * Represents a scheduled appointment between a patient and a doctor.
 */
export interface Appointment {
  id: string;
  doctorId: string;
  patientId: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  appointmentType: AppointmentType;
  status: AppointmentStatus;
  createdAt: Date;
  cancelledAt: Date | null;
}

/**
 * Represents a discrete time slot within a doctor's availability.
 */
export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  available: boolean;
}

/**
 * Represents a single availability time range for a doctor on a specific day.
 * Times are in HH:mm format and must be in 15-minute increments.
 */
export interface AvailabilityRange {
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
}

/**
 * Represents a doctor's complete availability schedule.
 */
export interface AvailabilitySchedule {
  doctorId: string;
  ranges: AvailabilityRange[];
}
