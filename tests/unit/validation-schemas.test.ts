import {
  specialtySchema,
  dateQuerySchema,
  bookingRequestSchema,
  cancellationRequestSchema,
  availabilityScheduleSchema,
} from "../../src/validation/schemas";

describe("Validation Schemas", () => {
  describe("specialtySchema", () => {
    it("accepts valid specialties", () => {
      const validSpecialties = [
        "cardiology",
        "dermatology",
        "neurology",
        "orthopedics",
        "pediatrics",
        "psychiatry",
        "general_practice",
      ];
      for (const specialty of validSpecialties) {
        expect(specialtySchema.safeParse(specialty).success).toBe(true);
      }
    });

    it("rejects invalid specialty", () => {
      const result = specialtySchema.safeParse("invalid_specialty");
      expect(result.success).toBe(false);
    });
  });

  describe("dateQuerySchema", () => {
    it("accepts a valid future date", () => {
      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      const dateStr = tomorrow.toISOString().split("T")[0];
      expect(dateQuerySchema.safeParse(dateStr).success).toBe(true);
    });

    it("accepts today's date", () => {
      const today = new Date();
      const dateStr = today.toISOString().split("T")[0];
      expect(dateQuerySchema.safeParse(dateStr).success).toBe(true);
    });

    it("rejects a date in the past", () => {
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const dateStr = yesterday.toISOString().split("T")[0];
      const result = dateQuerySchema.safeParse(dateStr);
      expect(result.success).toBe(false);
    });

    it("rejects a date more than 90 days in the future", () => {
      const farFuture = new Date();
      farFuture.setUTCDate(farFuture.getUTCDate() + 91);
      const dateStr = farFuture.toISOString().split("T")[0];
      const result = dateQuerySchema.safeParse(dateStr);
      expect(result.success).toBe(false);
    });

    it("accepts a date exactly 90 days in the future", () => {
      const maxDate = new Date();
      maxDate.setUTCHours(0, 0, 0, 0);
      maxDate.setUTCDate(maxDate.getUTCDate() + 90);
      const dateStr = maxDate.toISOString().split("T")[0];
      expect(dateQuerySchema.safeParse(dateStr).success).toBe(true);
    });

    it("rejects an invalid date format", () => {
      const result = dateQuerySchema.safeParse("not-a-date");
      expect(result.success).toBe(false);
    });

    it("rejects a datetime string (must be date only)", () => {
      const result = dateQuerySchema.safeParse("2025-01-15T10:00:00Z");
      expect(result.success).toBe(false);
    });
  });

  describe("bookingRequestSchema", () => {
    const validRequest = {
      patientId: "550e8400-e29b-41d4-a716-446655440000",
      doctorId: "660e8400-e29b-41d4-a716-446655440001",
      startTime: "2025-06-15T10:00:00Z",
      appointmentType: "FIRST_VISIT",
    };

    it("accepts a valid booking request", () => {
      expect(bookingRequestSchema.safeParse(validRequest).success).toBe(true);
    });

    it("accepts FOLLOW_UP appointment type", () => {
      const result = bookingRequestSchema.safeParse({
        ...validRequest,
        appointmentType: "FOLLOW_UP",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid appointment type", () => {
      const result = bookingRequestSchema.safeParse({
        ...validRequest,
        appointmentType: "CHECKUP",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid patientId (not UUID)", () => {
      const result = bookingRequestSchema.safeParse({
        ...validRequest,
        patientId: "not-a-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid doctorId (not UUID)", () => {
      const result = bookingRequestSchema.safeParse({
        ...validRequest,
        doctorId: "not-a-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid startTime", () => {
      const result = bookingRequestSchema.safeParse({
        ...validRequest,
        startTime: "not-a-datetime",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("cancellationRequestSchema", () => {
    it("accepts a valid cancellation request", () => {
      const result = cancellationRequestSchema.safeParse({
        patientId: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid patientId", () => {
      const result = cancellationRequestSchema.safeParse({
        patientId: "not-a-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing patientId", () => {
      const result = cancellationRequestSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("availabilityScheduleSchema", () => {
    it("accepts a valid schedule with ranges in 15-minute increments", () => {
      const result = availabilityScheduleSchema.safeParse({
        schedule: {
          ranges: [
            { dayOfWeek: 1, startTime: "09:00", endTime: "12:00" },
            { dayOfWeek: 1, startTime: "14:00", endTime: "17:00" },
          ],
        },
      });
      expect(result.success).toBe(true);
    });

    it("accepts times at all valid 15-minute increments", () => {
      const result = availabilityScheduleSchema.safeParse({
        schedule: {
          ranges: [
            { dayOfWeek: 2, startTime: "08:00", endTime: "08:15" },
            { dayOfWeek: 2, startTime: "09:30", endTime: "09:45" },
          ],
        },
      });
      expect(result.success).toBe(true);
    });

    it("rejects times not in 15-minute increments", () => {
      const result = availabilityScheduleSchema.safeParse({
        schedule: {
          ranges: [{ dayOfWeek: 1, startTime: "09:10", endTime: "12:00" }],
        },
      });
      expect(result.success).toBe(false);
    });

    it("rejects endTime equal to startTime", () => {
      const result = availabilityScheduleSchema.safeParse({
        schedule: {
          ranges: [{ dayOfWeek: 1, startTime: "09:00", endTime: "09:00" }],
        },
      });
      expect(result.success).toBe(false);
    });

    it("rejects endTime before startTime", () => {
      const result = availabilityScheduleSchema.safeParse({
        schedule: {
          ranges: [{ dayOfWeek: 1, startTime: "14:00", endTime: "09:00" }],
        },
      });
      expect(result.success).toBe(false);
    });

    it("rejects more than 5 ranges per day", () => {
      const result = availabilityScheduleSchema.safeParse({
        schedule: {
          ranges: [
            { dayOfWeek: 1, startTime: "08:00", endTime: "09:00" },
            { dayOfWeek: 1, startTime: "09:00", endTime: "10:00" },
            { dayOfWeek: 1, startTime: "10:00", endTime: "11:00" },
            { dayOfWeek: 1, startTime: "11:00", endTime: "12:00" },
            { dayOfWeek: 1, startTime: "13:00", endTime: "14:00" },
            { dayOfWeek: 1, startTime: "14:00", endTime: "15:00" },
          ],
        },
      });
      expect(result.success).toBe(false);
    });

    it("accepts exactly 5 ranges per day", () => {
      const result = availabilityScheduleSchema.safeParse({
        schedule: {
          ranges: [
            { dayOfWeek: 1, startTime: "08:00", endTime: "09:00" },
            { dayOfWeek: 1, startTime: "09:00", endTime: "10:00" },
            { dayOfWeek: 1, startTime: "10:00", endTime: "11:00" },
            { dayOfWeek: 1, startTime: "11:00", endTime: "12:00" },
            { dayOfWeek: 1, startTime: "13:00", endTime: "14:00" },
          ],
        },
      });
      expect(result.success).toBe(true);
    });

    it("rejects overlapping ranges on the same day", () => {
      const result = availabilityScheduleSchema.safeParse({
        schedule: {
          ranges: [
            { dayOfWeek: 1, startTime: "09:00", endTime: "12:00" },
            { dayOfWeek: 1, startTime: "11:00", endTime: "14:00" },
          ],
        },
      });
      expect(result.success).toBe(false);
    });

    it("allows adjacent ranges on the same day (no overlap)", () => {
      const result = availabilityScheduleSchema.safeParse({
        schedule: {
          ranges: [
            { dayOfWeek: 1, startTime: "09:00", endTime: "12:00" },
            { dayOfWeek: 1, startTime: "12:00", endTime: "15:00" },
          ],
        },
      });
      expect(result.success).toBe(true);
    });

    it("allows overlapping ranges on different days", () => {
      const result = availabilityScheduleSchema.safeParse({
        schedule: {
          ranges: [
            { dayOfWeek: 1, startTime: "09:00", endTime: "12:00" },
            { dayOfWeek: 2, startTime: "09:00", endTime: "12:00" },
          ],
        },
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid dayOfWeek", () => {
      const result = availabilityScheduleSchema.safeParse({
        schedule: {
          ranges: [{ dayOfWeek: 7, startTime: "09:00", endTime: "12:00" }],
        },
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative dayOfWeek", () => {
      const result = availabilityScheduleSchema.safeParse({
        schedule: {
          ranges: [{ dayOfWeek: -1, startTime: "09:00", endTime: "12:00" }],
        },
      });
      expect(result.success).toBe(false);
    });

    it("accepts an empty ranges array", () => {
      const result = availabilityScheduleSchema.safeParse({
        schedule: {
          ranges: [],
        },
      });
      expect(result.success).toBe(true);
    });
  });
});
