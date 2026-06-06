import { Router, Request, Response } from 'express';
import { validate } from '../middleware/validate';
import { bookingRequestSchema, cancellationRequestSchema } from '../validation/schemas';
import { bookAppointment, cancelAppointment, AppError } from '../services/appointment.service';
import { ErrorResponse } from '../models/errors';
import { query } from '../config/database';

const router = Router();

/**
 * GET /api/appointments
 * Lists all appointments with doctor and patient names.
 */
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(`
      SELECT a.id, a.start_time, a.end_time, a.duration_minutes, a.appointment_type, a.status, a.created_at, a.cancelled_at,
             d.name as doctor_name, d.specialty,
             p.name as patient_name
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      JOIN patients p ON a.patient_id = p.id
      ORDER BY a.start_time DESC
    `);
    res.status(200).json({ appointments: result.rows });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch appointments' } });
  }
});

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
