import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET /api/config/maps
 *
 * Returns the Google Maps API key from environment variable.
 * Used by the frontend to dynamically load the Maps JavaScript API.
 */
router.get('/maps', (_req: Request, res: Response): void => {
  res.status(200).json({ apiKey: process.env.GOOGLE_MAPS_API_KEY || null });
});

export default router;
