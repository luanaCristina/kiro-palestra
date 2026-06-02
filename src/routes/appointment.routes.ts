import { Router, Request, Response } from 'express';
import { validate } from '../middleware/validate';
import { bookingRequestSchema, cancellationRequestSchema } from '../validation/schemas';
import { bookAppointment, cancelAppointment, AppError } from '../services/appointment.service';
import { ErrorResponse } from '../models/errors';

const router = Router();

/**
 * POST /api/appointments
 *
 * Books a new appointment for a patient.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.3, 6.3, 6.7, 7.4, 7.5
 */
router.post(
  '/',
  validate(bookingRequestSchema, 'body'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const confirmation = await bookAppointment(req.body);

      res.status(201).json({ confirmation });
    } catch (error) {
      if (error instanceof AppError) {
        const errorResponse: ErrorResponse = {
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
        };
        res.status(error.statusCode).json(errorResponse);
        return;
      }

      // Unexpected errors are handled by the global error handler
      throw error;
    }
  }
);

/**
 * POST /api/appointments/:appointmentId/cancel
 *
 * Cancels an appointment for a patient.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */
router.post(
  '/:appointmentId/cancel',
  validate(cancellationRequestSchema, 'body'),
  async (req: Request, res: Response): Promise<void> => {
    const { appointmentId } = req.params;
    const { patientId } = req.body;

    try {
      await cancelAppointment(appointmentId, patientId);

      res.status(200).json({
        message: 'Appointment cancelled successfully',
        appointmentId,
      });
    } catch (error) {
      if (error instanceof AppError) {
        const errorResponse: ErrorResponse = {
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
        };
        res.status(error.statusCode).json(errorResponse);
        return;
      }

      // Unexpected errors are handled by the global error handler
      throw error;
    }
  }
);

export default router;
