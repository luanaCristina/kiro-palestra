/**
 * Test app export for integration tests.
 *
 * Sets the DB_NAME environment variable to the test database before importing
 * the Express app, ensuring all queries go to the test database.
 *
 * Usage with Supertest:
 *   import { app } from '../setup/test-app';
 *   const response = await request(app).get('/health');
 */

// Set test database environment variable BEFORE importing app
// This ensures the pg Pool in src/config/database.ts connects to the test DB
process.env.DB_NAME = 'appointment_scheduling_test';

import app from '../../src/app';

export { app };
