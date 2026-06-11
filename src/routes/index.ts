import { Router, Request, Response } from 'express';
import doctorRoutes from './doctor.routes';
import appointmentRoutes from './appointment.routes';
import locationRoutes from './location.routes';
import configRoutes from './config.routes';
import { query } from '../config/database';
import { getHolidaysForState, isHoliday, BRAZILIAN_STATES } from '../modules/holidays';

const router = Router();

router.use('/doctors', doctorRoutes);
router.use('/doctors', locationRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/config', configRoutes);

/**
 * GET /api/patients
 */
router.get('/patients', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query('SELECT id, name, email, created_at FROM patients ORDER BY name');
    res.status(200).json({ patients: result.rows });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch patients' } });
  }
});

/**
 * POST /api/patients
 */
router.post('/patients', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'name and email are required' } });
      return;
    }
    const result = await query(
      'INSERT INTO patients (name, email) VALUES ($1, $2) RETURNING id, name, email, created_at',
      [name, email]
    );
    res.status(201).json({ patient: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create patient' } });
  }
});

/**
 * GET /api/holidays?state=PE
 * Returns all holidays for a Brazilian state.
 */
router.get('/holidays', (req: Request, res: Response): void => {
  const { state, date } = req.query;
  if (!state) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'state parameter is required (e.g., PE, SP, RJ)' } });
    return;
  }

  // If date provided, check if it's a holiday
  if (date) {
    const holiday = isHoliday(date as string, state as string);
    if (holiday) {
      res.status(200).json({ isHoliday: true, holiday });
    } else {
      res.status(200).json({ isHoliday: false });
    }
    return;
  }

  // Return all holidays for the state
  const holidays = getHolidaysForState(state as string);
  res.status(200).json({ state, holidays });
});

/**
 * GET /api/states
 * Returns list of Brazilian states.
 */
router.get('/states', (_req: Request, res: Response): void => {
  res.status(200).json({ states: BRAZILIAN_STATES });
});

/**
 * GET /api/availability/:doctorId
 * Returns all availability ranges for a doctor.
 */
router.get('/availability/:doctorId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { doctorId } = req.params;
    const result = await query(
      'SELECT id, day_of_week, start_time, end_time FROM availability_ranges WHERE doctor_id = $1 ORDER BY day_of_week, start_time',
      [doctorId]
    );
    res.status(200).json({ doctorId, ranges: result.rows });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch availability' } });
  }
});

/**
 * DELETE /api/availability/:rangeId
 * Deletes a specific availability range.
 */
router.delete('/availability/:rangeId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { rangeId } = req.params;
    const result = await query('DELETE FROM availability_ranges WHERE id = $1 RETURNING id', [rangeId]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Availability range not found' } });
      return;
    }
    res.status(200).json({ message: 'Availability range deleted', id: rangeId });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete availability range' } });
  }
});

/**
 * PUT /api/availability/:rangeId
 * Updates a specific availability range.
 */
router.put('/availability/:rangeId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { rangeId } = req.params;
    const { dayOfWeek, startTime, endTime } = req.body;
    const result = await query(
      'UPDATE availability_ranges SET day_of_week = $1, start_time = $2, end_time = $3 WHERE id = $4 RETURNING id, day_of_week, start_time, end_time',
      [dayOfWeek, startTime, endTime, rangeId]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Availability range not found' } });
      return;
    }
    res.status(200).json({ range: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update availability range' } });
  }
});

export default router;
