CREATE TABLE IF NOT EXISTS availability_ranges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id),
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL
);

CREATE INDEX idx_availability_ranges_doctor_day
  ON availability_ranges (doctor_id, day_of_week);
