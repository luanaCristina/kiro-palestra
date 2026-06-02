import { z } from "zod";
import { SPECIALTIES, APPOINTMENT_TYPES } from "../models/enums";

/**
 * Validates that a value is a supported medical specialty.
 */
export const specialtySchema = z.enum(SPECIALTIES as unknown as [string, ...string[]], {
  errorMap: () => ({
    message: `Invalid specialty. Accepted values: ${SPECIALTIES.join(", ")}`,
  }),
});

/**
 * Validates an ISO 8601 date string that is not in the past
 * and not more than 90 days in the future.
 */
export const dateQuerySchema = z
  .string()
  .refine(
    (val) => {
      const date = new Date(val);
      return !isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(val);
    },
    { message: "Date must be a valid ISO 8601 date (YYYY-MM-DD)" }
  )
  .refine(
    (val) => {
      const date = new Date(val + "T00:00:00.000Z");
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      return date >= today;
    },
    { message: "Date must not be in the past" }
  )
  .refine(
    (val) => {
      const date = new Date(val + "T00:00:00.000Z");
      const maxDate = new Date();
      maxDate.setUTCHours(0, 0, 0, 0);
      maxDate.setUTCDate(maxDate.getUTCDate() + 90);
      return date <= maxDate;
    },
    { message: "Date must not be more than 90 days in the future" }
  );

/**
 * Validates a booking request payload.
 */
export const bookingRequestSchema = z.object({
  patientId: z.string().uuid({ message: "patientId must be a valid UUID" }),
  doctorId: z.string().uuid({ message: "doctorId must be a valid UUID" }),
  startTime: z.string().refine(
    (val) => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    },
    { message: "startTime must be a valid ISO 8601 datetime string" }
  ),
  appointmentType: z.enum(APPOINTMENT_TYPES as unknown as [string, ...string[]], {
    errorMap: () => ({
      message: `Invalid appointment type. Accepted values: ${APPOINTMENT_TYPES.join(", ")}`,
    }),
  }),
});

/**
 * Validates a cancellation request payload.
 */
export const cancellationRequestSchema = z.object({
  patientId: z.string().uuid({ message: "patientId must be a valid UUID" }),
});

/**
 * Validates that a time string is in HH:mm format with 15-minute increments.
 */
const timeIn15MinIncrements = z
  .string()
  .regex(/^\d{2}:\d{2}$/, { message: "Time must be in HH:mm format" })
  .refine(
    (val) => {
      const [hours, minutes] = val.split(":").map(Number);
      return hours >= 0 && hours <= 23 && [0, 15, 30, 45].includes(minutes);
    },
    { message: "Time must be in 15-minute increments (minutes must be 0, 15, 30, or 45)" }
  );

/**
 * Schema for a single availability range.
 */
const availabilityRangeSchema = z
  .object({
    dayOfWeek: z
      .number()
      .int()
      .min(0, { message: "dayOfWeek must be between 0 (Sunday) and 6 (Saturday)" })
      .max(6, { message: "dayOfWeek must be between 0 (Sunday) and 6 (Saturday)" }),
    startTime: timeIn15MinIncrements,
    endTime: timeIn15MinIncrements,
  })
  .refine(
    (range) => {
      const [startH, startM] = range.startTime.split(":").map(Number);
      const [endH, endM] = range.endTime.split(":").map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      return endMinutes > startMinutes;
    },
    { message: "endTime must be after startTime" }
  );

/**
 * Validates an availability schedule with constraints:
 * - Max 5 ranges per day
 * - No overlapping ranges on the same day
 */
export const availabilityScheduleSchema = z
  .object({
    schedule: z.object({
      ranges: z.array(availabilityRangeSchema),
    }),
  })
  .refine(
    (data) => {
      // Check max 5 ranges per day
      const countByDay: Record<number, number> = {};
      for (const range of data.schedule.ranges) {
        countByDay[range.dayOfWeek] = (countByDay[range.dayOfWeek] || 0) + 1;
        if (countByDay[range.dayOfWeek] > 5) {
          return false;
        }
      }
      return true;
    },
    { message: "Maximum of 5 time ranges per day allowed" }
  )
  .refine(
    (data) => {
      // Check no overlapping ranges on the same day
      const rangesByDay: Record<number, Array<{ start: number; end: number }>> = {};

      for (const range of data.schedule.ranges) {
        const [startH, startM] = range.startTime.split(":").map(Number);
        const [endH, endM] = range.endTime.split(":").map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        if (!rangesByDay[range.dayOfWeek]) {
          rangesByDay[range.dayOfWeek] = [];
        }

        // Check overlap with existing ranges on the same day
        for (const existing of rangesByDay[range.dayOfWeek]) {
          if (startMinutes < existing.end && existing.start < endMinutes) {
            return false;
          }
        }

        rangesByDay[range.dayOfWeek].push({ start: startMinutes, end: endMinutes });
      }
      return true;
    },
    { message: "Overlapping time ranges on the same day are not allowed" }
  );
