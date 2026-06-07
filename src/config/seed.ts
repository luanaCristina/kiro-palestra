import { pool } from './database';

/**
 * Seeds the database with demo data if tables are empty.
 * Only inserts if no doctors/patients exist (idempotent).
 */
export async function seedDemoData(): Promise<void> {
  const client = await pool.connect();

  try {
    // Check if data already exists
    const doctorsCount = await client.query('SELECT COUNT(*) FROM doctors');
    if (parseInt(doctorsCount.rows[0].count, 10) > 0) {
      console.log('Demo data already exists, skipping seed');
      return;
    }

    console.log('Seeding demo data...');

    // Create 3 doctors
    const doctors = await client.query(`
      INSERT INTO doctors (name, specialty) VALUES
        ('Dra. Camila Rodrigues', 'cardiology'),
        ('Dr. Fernando Oliveira', 'neurology'),
        ('Dra. Beatriz Santos', 'pediatrics')
      RETURNING id, name, specialty
    `);

    console.log(`Created ${doctors.rows.length} doctors`);

    // Create 3 patients
    const patients = await client.query(`
      INSERT INTO patients (name, email) VALUES
        ('Lucas Ferreira', 'lucas.ferreira@email.com'),
        ('Ana Paula Costa', 'ana.costa@email.com'),
        ('Roberto Almeida', 'roberto.almeida@email.com')
      RETURNING id, name, email
    `);

    console.log(`Created ${patients.rows.length} patients`);

    // Add availability for each doctor
    const [camila, fernando, beatriz] = doctors.rows;

    // Dra. Camila - Cardiology: Mon-Fri 08:00-12:00, 14:00-18:00
    await client.query(`
      INSERT INTO availability_ranges (doctor_id, day_of_week, start_time, end_time) VALUES
        ($1, 1, '08:00', '12:00'),
        ($1, 1, '14:00', '18:00'),
        ($1, 2, '08:00', '12:00'),
        ($1, 3, '08:00', '12:00'),
        ($1, 3, '14:00', '18:00'),
        ($1, 4, '08:00', '12:00'),
        ($1, 5, '08:00', '12:00')
    `, [camila.id]);

    // Dr. Fernando - Neurology: Tue-Thu 09:00-13:00, 15:00-19:00
    await client.query(`
      INSERT INTO availability_ranges (doctor_id, day_of_week, start_time, end_time) VALUES
        ($1, 2, '09:00', '13:00'),
        ($1, 2, '15:00', '19:00'),
        ($1, 3, '09:00', '13:00'),
        ($1, 4, '09:00', '13:00'),
        ($1, 4, '15:00', '19:00')
    `, [fernando.id]);

    // Dra. Beatriz - Pediatrics: Mon, Wed, Fri 07:00-12:00
    await client.query(`
      INSERT INTO availability_ranges (doctor_id, day_of_week, start_time, end_time) VALUES
        ($1, 1, '07:00', '12:00'),
        ($1, 3, '07:00', '12:00'),
        ($1, 5, '07:00', '12:00')
    `, [beatriz.id]);

    console.log('Availability ranges configured for all doctors');
    console.log('Demo data seeded successfully!');
  } finally {
    client.release();
  }
}
