import { Router, Request, Response } from 'express';
import { validate } from '../middleware/validate';
import { availabilityScheduleSchema, specialtySchema, dateQuerySchema } from '../validation/schemas';
import { updateAvailability, searchDoctors } from '../services/doctor.service';
import { ERROR_CODES, ErrorResponse } from '../models/errors';
import { Specialty } from '../models/enums';
import { query } from '../config/database';

const router = Router();

/**
 * GET /api/doctors/all
 * Returns all doctors (for UI dropdowns).
 */
router.get('/all', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query('SELECT id, name, specialty, created_at FROM doctors ORDER BY name');
    res.status(200).json({ doctors: result.rows });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch doctors' } });
  }
});

/**
 * POST /api/doctors
 * Creates a new doctor.
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, specialty } = req.body;
    if (!name || !specialty) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'name and specialty are required' } });
      return;
    }
    const result = await query(
      'INSERT INTO doctors (name, specialty) VALUES ($1, $2) RETURNING id, name, specialty, created_at',
      [name, specialty]
    );
    res.status(201).json({ doctor: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create doctor' } });
  }
});

/**
 * GET /api/doctors?specialty=cardiology&date=2025-06-09
 *
 * Searches for doctors by specialty with optional date filter.
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { specialty, date } = req.query;

    // Validate specialty
    const specialtyResult = specialtySchema.safeParse(specialty);
    if (!specialtyResult.success) {
      res.status(400).json({
        error: { code: ERROR_CODES.INVALID_SPECIALTY, message: specialtyResult.error.issues[0].message }
      });
      return;
    }

    // Validate date if provided
    if (date) {
      const dateResult = dateQuerySchema.safeParse(date);
      if (!dateResult.success) {
        res.status(400).json({
          error: { code: ERROR_CODES.INVALID_DATE_RANGE, message: dateResult.error.issues[0].message }
        });
        return;
      }
    }

    const result = await searchDoctors(specialtyResult.data as Specialty, date as string | undefined);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

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
