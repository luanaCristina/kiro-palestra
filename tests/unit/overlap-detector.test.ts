import { intervalsOverlap, detectOverlap } from "../../src/modules/overlap-detector";
import { Appointment } from "../../src/models/types";

describe("intervalsOverlap", () => {
  it("should detect overlapping intervals", () => {
    const startA = new Date("2024-06-01T09:00:00Z");
    const endA = new Date("2024-06-01T10:00:00Z");
    const startB = new Date("2024-06-01T09:30:00Z");
    const endB = new Date("2024-06-01T10:30:00Z");

    expect(intervalsOverlap(startA, endA, startB, endB)).toBe(true);
  });

  it("should NOT detect overlap for adjacent intervals (one ends when other starts)", () => {
    const startA = new Date("2024-06-01T09:00:00Z");
    const endA = new Date("2024-06-01T10:00:00Z");
    const startB = new Date("2024-06-01T10:00:00Z");
    const endB = new Date("2024-06-01T11:00:00Z");

    expect(intervalsOverlap(startA, endA, startB, endB)).toBe(false);
  });

  it("should NOT detect overlap for non-overlapping intervals", () => {
    const startA = new Date("2024-06-01T09:00:00Z");
    const endA = new Date("2024-06-01T10:00:00Z");
    const startB = new Date("2024-06-01T11:00:00Z");
    const endB = new Date("2024-06-01T12:00:00Z");

    expect(intervalsOverlap(startA, endA, startB, endB)).toBe(false);
  });

  it("should detect overlap when intervals have the same start time", () => {
    const startA = new Date("2024-06-01T09:00:00Z");
    const endA = new Date("2024-06-01T10:00:00Z");
    const startB = new Date("2024-06-01T09:00:00Z");
    const endB = new Date("2024-06-01T09:30:00Z");

    expect(intervalsOverlap(startA, endA, startB, endB)).toBe(true);
  });

  it("should detect overlap for identical intervals", () => {
    const startA = new Date("2024-06-01T09:00:00Z");
    const endA = new Date("2024-06-01T10:00:00Z");
    const startB = new Date("2024-06-01T09:00:00Z");
    const endB = new Date("2024-06-01T10:00:00Z");

    expect(intervalsOverlap(startA, endA, startB, endB)).toBe(true);
  });

  it("should detect overlap when one interval is fully contained in the other", () => {
    const startA = new Date("2024-06-01T09:00:00Z");
    const endA = new Date("2024-06-01T12:00:00Z");
    const startB = new Date("2024-06-01T10:00:00Z");
    const endB = new Date("2024-06-01T11:00:00Z");

    expect(intervalsOverlap(startA, endA, startB, endB)).toBe(true);
  });

  it("should be symmetric (order of intervals does not matter)", () => {
    const startA = new Date("2024-06-01T09:00:00Z");
    const endA = new Date("2024-06-01T10:00:00Z");
    const startB = new Date("2024-06-01T09:30:00Z");
    const endB = new Date("2024-06-01T10:30:00Z");

    expect(intervalsOverlap(startA, endA, startB, endB)).toBe(
      intervalsOverlap(startB, endB, startA, endA)
    );
  });

  it("should detect overlap for zero-duration interval inside another interval", () => {
    const startA = new Date("2024-06-01T09:00:00Z");
    const endA = new Date("2024-06-01T10:00:00Z");
    // Zero-duration interval at a point inside A
    const startB = new Date("2024-06-01T09:30:00Z");
    const endB = new Date("2024-06-01T09:30:00Z");

    // The formula startA < endB && startB < endA evaluates to true
    // because 09:00 < 09:30 && 09:30 < 10:00
    expect(intervalsOverlap(startA, endA, startB, endB)).toBe(true);
  });

  it("should NOT detect overlap for zero-duration interval at the boundary of another interval", () => {
    const startA = new Date("2024-06-01T09:00:00Z");
    const endA = new Date("2024-06-01T10:00:00Z");
    // Zero-duration interval at the end boundary of A
    const startB = new Date("2024-06-01T10:00:00Z");
    const endB = new Date("2024-06-01T10:00:00Z");

    // startA < endB (09:00 < 10:00 = true) but startB < endA (10:00 < 10:00 = false)
    expect(intervalsOverlap(startA, endA, startB, endB)).toBe(false);
  });

  it("should NOT detect overlap when both intervals are zero-duration at same time", () => {
    const startA = new Date("2024-06-01T09:00:00Z");
    const endA = new Date("2024-06-01T09:00:00Z");
    const startB = new Date("2024-06-01T09:00:00Z");
    const endB = new Date("2024-06-01T09:00:00Z");

    expect(intervalsOverlap(startA, endA, startB, endB)).toBe(false);
  });

  it("should NOT detect overlap for adjacent intervals in reverse order (B ends when A starts)", () => {
    const startA = new Date("2024-06-01T10:00:00Z");
    const endA = new Date("2024-06-01T11:00:00Z");
    const startB = new Date("2024-06-01T09:00:00Z");
    const endB = new Date("2024-06-01T10:00:00Z");

    expect(intervalsOverlap(startA, endA, startB, endB)).toBe(false);
  });
});

describe("detectOverlap", () => {
  const makeAppointment = (start: string, end: string): Appointment => ({
    id: "appt-1",
    doctorId: "doc-1",
    patientId: "pat-1",
    startTime: new Date(start),
    endTime: new Date(end),
    durationMinutes: 60,
    appointmentType: "FIRST_VISIT",
    status: "confirmed",
    createdAt: new Date(),
    cancelledAt: null,
  });

  it("should return hasOverlap: false when no existing appointments", () => {
    const result = detectOverlap(
      [],
      new Date("2024-06-01T09:00:00Z"),
      new Date("2024-06-01T10:00:00Z")
    );

    expect(result).toEqual({ hasOverlap: false });
  });

  it("should return hasOverlap: false when no overlap exists", () => {
    const existing = [
      makeAppointment("2024-06-01T09:00:00Z", "2024-06-01T10:00:00Z"),
    ];

    const result = detectOverlap(
      existing,
      new Date("2024-06-01T10:00:00Z"),
      new Date("2024-06-01T11:00:00Z")
    );

    expect(result).toEqual({ hasOverlap: false });
  });

  it("should detect overlap and return conflicting appointment", () => {
    const existing = [
      makeAppointment("2024-06-01T09:00:00Z", "2024-06-01T10:00:00Z"),
    ];

    const result = detectOverlap(
      existing,
      new Date("2024-06-01T09:30:00Z"),
      new Date("2024-06-01T10:30:00Z")
    );

    expect(result.hasOverlap).toBe(true);
    expect(result.conflictingAppointment).toBeDefined();
    expect(result.conflictingAppointment!.id).toBe("appt-1");
    expect(result.overlappingRange).toBeDefined();
    expect(result.overlappingRange!.start).toEqual(new Date("2024-06-01T09:30:00Z"));
    expect(result.overlappingRange!.end).toEqual(new Date("2024-06-01T10:00:00Z"));
  });

  it("should return the first conflicting appointment when multiple overlaps exist", () => {
    const existing = [
      makeAppointment("2024-06-01T09:00:00Z", "2024-06-01T10:00:00Z"),
      { ...makeAppointment("2024-06-01T09:30:00Z", "2024-06-01T10:30:00Z"), id: "appt-2" },
    ];

    const result = detectOverlap(
      existing,
      new Date("2024-06-01T09:30:00Z"),
      new Date("2024-06-01T11:00:00Z")
    );

    expect(result.hasOverlap).toBe(true);
    expect(result.conflictingAppointment!.id).toBe("appt-1");
  });

  it("should allow adjacent appointments (no overlap)", () => {
    const existing = [
      makeAppointment("2024-06-01T09:00:00Z", "2024-06-01T10:00:00Z"),
    ];

    const result = detectOverlap(
      existing,
      new Date("2024-06-01T10:00:00Z"),
      new Date("2024-06-01T11:00:00Z")
    );

    expect(result).toEqual({ hasOverlap: false });
  });
});
