import { Router, Request, Response } from 'express';
import { validate } from '../middleware/validate';
import { locationSchema } from '../validation/schemas';
import { ERROR_CODES, ErrorResponse } from '../models/errors';
import * as locationService from '../services/location.service';

const router = Router();

/**
 * PUT /api/doctors/:doctorId/location
 *
 * Save or update a doctor's clinic location.
 * Validates body with locationSchema via validate middleware.
 * Returns 200 with { location } on success.
 * Returns 404 if doctor not found.
 * Returns 400 for validation or coordinate errors.
 */
router.put(
  '/:doctorId/location',
  validate(locationSchema, 'body'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { doctorId } = req.params;
      const { address, latitude, longitude } = req.body;

      const location = await locationService.updateLocation(doctorId, {
        address,
        latitude,
        longitude,
      });

      res.status(200).json({ location });
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
          case ERROR_CODES.INVALID_COORDINATES:
            res.status(400).json(errorResponse);
            return;
          default:
            break;
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

/**
 * GET /api/doctors/:doctorId/location
 *
 * Retrieve a doctor's clinic location.
 * Returns 200 with { location } (or { location: null } if not set).
 * Returns 404 if doctor not found.
 */
router.get(
  '/:doctorId/location',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { doctorId } = req.params;

      const location = await locationService.getLocation(doctorId);

      res.status(200).json({ location });
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error) {
        const serviceError = error as Error & { code: string };

        const errorResponse: ErrorResponse = {
          error: {
            code: serviceError.code,
            message: serviceError.message,
          },
        };

        if (serviceError.code === ERROR_CODES.DOCTOR_NOT_FOUND) {
          res.status(404).json(errorResponse);
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
