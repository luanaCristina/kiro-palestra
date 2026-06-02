import { AppointmentType, Specialty } from "./enums";
import { Appointment, Doctor, TimeSlot } from "./types";

/**
 * Request payload for booking an appointment.
 */
export interface BookingRequest {
  patientId: string;
  doctorId: string;
  startTime: string; // ISO 8601 datetime
  appointmentType: AppointmentType;
}

/**
 * Confirmation returned after a successful booking.
 */
export interface BookingConfirmation {
  appointmentId: string;
  patientName: string;
  doctorName: string;
  specialty: Specialty;
  date: string; // ISO 8601 date
  startTime: string; // ISO 8601 datetime
  endTime: string; // ISO 8601 datetime
  appointmentType: AppointmentType;
}

/**
 * Result of a doctor search query.
 */
export interface DoctorSearchResult {
  doctors: (Doctor & { availableSlots?: TimeSlot[] })[];
  message?: string;
}

/**
 * Result of an overlap detection check.
 */
export interface OverlapResult {
  hasOverlap: boolean;
  conflictingAppointment?: Appointment;
  overlappingRange?: { start: Date; end: Date };
}

/**
 * Result of a cancellation policy check.
 */
export interface CancellationResult {
  allowed: boolean;
  reason?: string;
}
