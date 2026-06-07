/**
 * Jest setup file loaded via setupFiles config.
 * Runs before the test framework is installed.
 * Sets environment variables for the test database.
 */

// Force test database name before any pool initialization
process.env.DB_NAME = 'appointment_scheduling_test';
