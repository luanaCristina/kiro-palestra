import { Router, Request, Response } from 'express';
import { validate } from '../middleware/validate';
import { availabilityScheduleSchema } from '../validation/schemas';
import { updateAvailability } from '../services/doctor.service';
import { ERROR_CODES, ErrorResponse } from '../models/errors';

const router = Router();

/**
 * PUT /api/doctors/:doctorId/availability
 *
 * Updates a doctor's availability schedule.
 * Validates the schedule body using availabilityScheduleSchema.
 * Returns 200 with the updated schedule on success.
 * Returns 400 for validation errors (overlapping ranges, invalid times, max 5 ranges).
 * Returns 404 if doctor not found.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */
router.put(
  '/:doctorId/availability',
  validate(availabilityScheduleSchema, 'body'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { doctorId } = req.params;
      const { schedule } = req.body;

      const updatedSchedule = await updateAvailability(doctorId, {
        doctorId,
        ranges: schedule.ranges,
      });

      res.status(200).json({ schedule: updatedSchedule });
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error) {
        const serviceError = error as Error & { code: string };

        const errorResponse: ErrorResponse = {
          error: {
            code: serviceError.code,
            message: serviceError.message,
          },
        };

        switch (serviceError.code) {
          case ERROR_CODES.DOCTOR_NOT_FOUND:
            res.status(404).json(errorResponse);
            return;
          case ERROR_CODES.INVALID_TIME_RANGE:
          case ERROR_CODES.TOO_MANY_RANGES:
          case ERROR_CODES.OVERLAPPING_RANGES:
            res.status(400).json(errorResponse);
            return;
          default:
            res.status(500).json({
              error: {
                code: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred',
              },
            });
            return;
        }
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      });
    }
  }
);

export default router;
