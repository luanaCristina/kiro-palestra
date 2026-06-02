CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL,
  appointment_type VARCHAR(20) NOT NULL CHECK (appointment_type IN ('FIRST_VISIT', 'FOLLOW_UP')),
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_appointments_doctor_start_status
  ON appointments (doctor_id, start_time, status);
