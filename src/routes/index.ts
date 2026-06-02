import { Router } from 'express';
import doctorRoutes from './doctor.routes';
import appointmentRoutes from './appointment.routes';

const router = Router();

router.use('/doctors', doctorRoutes);
router.use('/appointments', appointmentRoutes);

export default router;
