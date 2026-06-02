/**
 * Medical specialties supported by the scheduling system.
 */
export type Specialty =
  | "cardiology"
  | "dermatology"
  | "neurology"
  | "orthopedics"
  | "pediatrics"
  | "psychiatry"
  | "general_practice";

/**
 * Valid specialty values as a readonly array for runtime validation.
 */
export const SPECIALTIES: readonly Specialty[] = [
  "cardiology",
  "dermatology",
  "neurology",
  "orthopedics",
  "pediatrics",
  "psychiatry",
  "general_practice",
];

/**
 * Appointment type determines the duration of the visit.
 * - FIRST_VISIT: 60 minutes
 * - FOLLOW_UP: 30 minutes
 */
export type AppointmentType = "FIRST_VISIT" | "FOLLOW_UP";

/**
 * Valid appointment type values as a readonly array for runtime validation.
 */
export const APPOINTMENT_TYPES: readonly AppointmentType[] = [
  "FIRST_VISIT",
  "FOLLOW_UP",
];

/**
 * Status of an appointment in the system.
 */
export type AppointmentStatus = "confirmed" | "cancelled";

/**
 * Duration in minutes for each appointment type.
 */
export const APPOINTMENT_DURATIONS: Record<AppointmentType, number> = {
  FIRST_VISIT: 60,
  FOLLOW_UP: 30,
};
