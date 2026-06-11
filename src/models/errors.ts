/**
 * Standard error response structure for the API.
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Error codes used throughout the scheduling system.
 */
export const ERROR_CODES = {
  /** Specialty not in accepted values */
  INVALID_SPECIALTY: "INVALID_SPECIALTY",
  /** Date in past or > 90 days future */
  INVALID_DATE_RANGE: "INVALID_DATE_RANGE",
  /** Type is not FIRST_VISIT or FOLLOW_UP */
  INVALID_APPOINTMENT_TYPE: "INVALID_APPOINTMENT_TYPE",
  /** Availability end <= start */
  INVALID_TIME_RANGE: "INVALID_TIME_RANGE",
  /** More than 5 ranges per day */
  TOO_MANY_RANGES: "TOO_MANY_RANGES",
  /** Availability ranges overlap on same day */
  OVERLAPPING_RANGES: "OVERLAPPING_RANGES",
  /** Appointment already cancelled */
  ALREADY_CANCELLED: "ALREADY_CANCELLED",
  /** Cannot cancel past appointment */
  PAST_APPOINTMENT: "PAST_APPOINTMENT",
  /** Free gap too short for requested type */
  INSUFFICIENT_TIME: "INSUFFICIENT_TIME",
  /** Patient doesn't own the appointment */
  UNAUTHORIZED_CANCEL: "UNAUTHORIZED_CANCEL",
  /** Appointment ID doesn't exist */
  APPOINTMENT_NOT_FOUND: "APPOINTMENT_NOT_FOUND",
  /** Doctor ID doesn't exist */
  DOCTOR_NOT_FOUND: "DOCTOR_NOT_FOUND",
  /** Time slot already booked (overlap) */
  SLOT_UNAVAILABLE: "SLOT_UNAVAILABLE",
  /** Within 24-hour cancellation window */
  CANCELLATION_POLICY: "CANCELLATION_POLICY",
  /** Doctor has no schedule configured */
  NO_AVAILABILITY: "NO_AVAILABILITY",
  /** Requested time outside doctor's hours */
  OUTSIDE_AVAILABILITY: "OUTSIDE_AVAILABILITY",
  /** Latitude or longitude out of valid range */
  INVALID_COORDINATES: "INVALID_COORDINATES",
} as const;

/**
 * Type representing valid error code values.
 */
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
