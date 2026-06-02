import { calculateAvailableSlots } from "../../src/modules/slot-calculator";
import { Appointment, AvailabilityRange } from "../../src/models/types";

describe("Slot Calculator", () => {
  // Use a date far in the future to avoid "past slot" filtering
  const futureDate = "2027-03-15"; // A Monday (day 1)
  const futureDateDayOfWeek = new Date("2027-03-15T00:00:00").getDay(); // 1 = Monday

  const makeAppointment = (
    startHour: number,
    startMin: number,
    endHour: number,
    endMin: number
  ): Appointment => {
    const start = new Date(`${futureDate}T00:00:00`);
    start.setHours(startHour, startMin, 0, 0);
    const end = new Date(`${futureDate}T00:00:00`);
    end.setHours(endHour, endMin, 0, 0);

    return {
      id: "apt-1",
      doctorId: "doc-1",
      patientId: "pat-1",
      startTime: start,
      endTime: end,
      durationMinutes: (endHour - startHour) * 60 + (endMin - startMin),
      appointmentType: "FOLLOW_UP",
      status: "confirmed",
      createdAt: new Date(),
      cancelledAt: null,
    };
  };

  describe("calculateAvailableSlots", () => {
    it("should return empty array when no availability ranges match the date", () => {
      const ranges: AvailabilityRange[] = [
        { dayOfWeek: 0, startTime: "09:00", endTime: "17:00" }, // Sunday
      ];

      const slots = calculateAvailableSlots(ranges, [], futureDate, 30);
      expect(slots).toEqual([]);
    });

    it("should generate slots at 15-minute increments for an empty schedule", () => {
      const ranges: AvailabilityRange[] = [
        { dayOfWeek: futureDateDayOfWeek, startTime: "09:00", endTime: "10:00" },
      ];

      const slots = calculateAvailableSlots(ranges, [], futureDate, 30);

      // 09:00-10:00 with 30-min duration: slots at 09:00, 09:15, 09:30
      // (09:45 + 30 = 10:15 which exceeds 10:00)
      expect(slots.length).toBe(3);

      expect(slots[0].startTime.getHours()).toBe(9);
      expect(slots[0].startTime.getMinutes()).toBe(0);
      expect(slots[0].endTime.getHours()).toBe(9);
      expect(slots[0].endTime.getMinutes()).toBe(30);

      expect(slots[1].startTime.getHours()).toBe(9);
      expect(slots[1].startTime.getMinutes()).toBe(15);

      expect(slots[2].startTime.getHours()).toBe(9);
      expect(slots[2].startTime.getMinutes()).toBe(30);
    });

    it("should subtract booked appointments from availability", () => {
      const ranges: AvailabilityRange[] = [
        { dayOfWeek: futureDateDayOfWeek, startTime: "09:00", endTime: "11:00" },
      ];

      // Appointment from 09:30 to 10:00
      const appointments = [makeAppointment(9, 30, 10, 0)];

      const slots = calculateAvailableSlots(ranges, appointments, futureDate, 30);

      // Free gaps: 09:00-09:30 and 10:00-11:00
      // Gap 09:00-09:30 (30 min): slot at 09:00 (09:00+30=09:30 fits)
      // Gap 10:00-11:00 (60 min): slots at 10:00, 10:15, 10:30
      expect(slots.length).toBe(4);

      // First slot in first gap
      expect(slots[0].startTime.getHours()).toBe(9);
      expect(slots[0].startTime.getMinutes()).toBe(0);

      // Slots in second gap
      expect(slots[1].startTime.getHours()).toBe(10);
      expect(slots[1].startTime.getMinutes()).toBe(0);
      expect(slots[2].startTime.getHours()).toBe(10);
      expect(slots[2].startTime.getMinutes()).toBe(15);
      expect(slots[3].startTime.getHours()).toBe(10);
      expect(slots[3].startTime.getMinutes()).toBe(30);
    });

    it("should return no slots when fully booked", () => {
      const ranges: AvailabilityRange[] = [
        { dayOfWeek: futureDateDayOfWeek, startTime: "09:00", endTime: "10:00" },
      ];

      const appointments = [makeAppointment(9, 0, 10, 0)];

      const slots = calculateAvailableSlots(ranges, appointments, futureDate, 30);
      expect(slots).toEqual([]);
    });

    it("should not generate slots when gap is smaller than duration", () => {
      const ranges: AvailabilityRange[] = [
        { dayOfWeek: futureDateDayOfWeek, startTime: "09:00", endTime: "10:00" },
      ];

      // Appointment from 09:00 to 09:45, leaving only 15 min gap
      const appointments = [makeAppointment(9, 0, 9, 45)];

      // Need 30 min but only 15 min available
      const slots = calculateAvailableSlots(ranges, appointments, futureDate, 30);
      expect(slots).toEqual([]);
    });

    it("should handle 60-minute duration (FIRST_VISIT)", () => {
      const ranges: AvailabilityRange[] = [
        { dayOfWeek: futureDateDayOfWeek, startTime: "09:00", endTime: "11:00" },
      ];

      const slots = calculateAvailableSlots(ranges, [], futureDate, 60);

      // 09:00-11:00 with 60-min duration: slots at 09:00, 09:15, 09:30, 09:45, 10:00
      // (10:15 + 60 = 11:15 which exceeds 11:00)
      expect(slots.length).toBe(5);
      expect(slots[4].startTime.getHours()).toBe(10);
      expect(slots[4].startTime.getMinutes()).toBe(0);
    });

    it("should ensure slot end time does not exceed availability boundary", () => {
      const ranges: AvailabilityRange[] = [
        { dayOfWeek: futureDateDayOfWeek, startTime: "09:00", endTime: "09:45" },
      ];

      const slots = calculateAvailableSlots(ranges, [], futureDate, 30);

      // Only 09:00 fits (09:00+30=09:30 <= 09:45)
      // 09:15+30=09:45 <= 09:45, also fits
      // 09:30+30=10:00 > 09:45, does NOT fit
      expect(slots.length).toBe(2);

      for (const slot of slots) {
        const boundary = new Date(`${futureDate}T00:00:00`);
        boundary.setHours(9, 45, 0, 0);
        expect(slot.endTime.getTime()).toBeLessThanOrEqual(boundary.getTime());
      }
    });

    it("should mark all returned slots as available", () => {
      const ranges: AvailabilityRange[] = [
        { dayOfWeek: futureDateDayOfWeek, startTime: "09:00", endTime: "10:00" },
      ];

      const slots = calculateAvailableSlots(ranges, [], futureDate, 30);

      for (const slot of slots) {
        expect(slot.available).toBe(true);
      }
    });

    it("should ignore cancelled appointments", () => {
      const ranges: AvailabilityRange[] = [
        { dayOfWeek: futureDateDayOfWeek, startTime: "09:00", endTime: "10:00" },
      ];

      const cancelledAppointment: Appointment = {
        ...makeAppointment(9, 0, 9, 30),
        status: "cancelled",
        cancelledAt: new Date(),
      };

      const slots = calculateAvailableSlots(
        ranges,
        [cancelledAppointment],
        futureDate,
        30
      );

      // Cancelled appointment should not block slots
      // Full hour available: 09:00, 09:15, 09:30
      expect(slots.length).toBe(3);
    });

    it("should handle multiple availability ranges on the same day", () => {
      const ranges: AvailabilityRange[] = [
        { dayOfWeek: futureDateDayOfWeek, startTime: "09:00", endTime: "10:00" },
        { dayOfWeek: futureDateDayOfWeek, startTime: "14:00", endTime: "15:00" },
      ];

      const slots = calculateAvailableSlots(ranges, [], futureDate, 30);

      // Each range produces 3 slots (30-min duration in 1-hour window)
      expect(slots.length).toBe(6);

      // Verify slots from both ranges
      const morningSlots = slots.filter(
        (s) => s.startTime.getHours() < 12
      );
      const afternoonSlots = slots.filter(
        (s) => s.startTime.getHours() >= 12
      );
      expect(morningSlots.length).toBe(3);
      expect(afternoonSlots.length).toBe(3);
    });

    it("should exclude slots whose start time is in the past", () => {
      // Use today's date with a time range that's partially in the past
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const todayDayOfWeek = now.getDay();

      // Set range to start 2 hours ago and end 2 hours from now
      const pastHour = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const futureHour = new Date(now.getTime() + 2 * 60 * 60 * 1000);

      const startTime = `${String(pastHour.getHours()).padStart(2, "0")}:${String(
        Math.floor(pastHour.getMinutes() / 15) * 15
      ).padStart(2, "0")}`;
      const endTime = `${String(futureHour.getHours()).padStart(2, "0")}:${String(
        Math.floor(futureHour.getMinutes() / 15) * 15
      ).padStart(2, "0")}`;

      const ranges: AvailabilityRange[] = [
        { dayOfWeek: todayDayOfWeek, startTime, endTime },
      ];

      const slots = calculateAvailableSlots(ranges, [], today, 30);

      // All returned slots should have start time in the future
      for (const slot of slots) {
        expect(slot.startTime.getTime()).toBeGreaterThan(now.getTime());
      }
    });
  });
});
