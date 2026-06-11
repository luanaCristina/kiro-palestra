import { z } from 'zod';

/**
 * Zod schema for validating clinic location input.
 * Validates address (non-empty, max 500 chars) and geographic coordinates.
 */
export const locationSchema = z.object({
  address: z.string().min(1, "Address is required").max(500, "Address too long"),
  latitude: z.number()
    .min(-90, "Latitude must be >= -90")
    .max(90, "Latitude must be <= 90"),
  longitude: z.number()
    .min(-180, "Longitude must be >= -180")
    .max(180, "Longitude must be <= 180"),
});
