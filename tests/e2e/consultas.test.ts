import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';
import { mockFetch, resetFetchMock } from './helpers/fetch-mock';
import { waitFor } from './helpers/dom-helpers';

/**
 * Custom HTML loader that injects fetch into the JSDOM window via beforeParse
 * so the inline init() script can execute without errors.
 */
function loadHTMLWithFetch(): JSDOM {
  const htmlPath = path.resolve(__dirname, '..', '..', 'public', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf-8');

  const dom = new JSDOM(html, {
    url: 'http://localhost:3000',
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    beforeParse(window: any) {
      // Inject the mocked global.fetch into the JSDOM window
      window.fetch = global.fetch;
    },
  });

  (global as any).document = dom.window.document;
  (global as any).window = dom.window;
  (global as any).HTMLElement = dom.window.HTMLElement;

  Object.defineProperty(global, 'navigator', {
    value: dom.window.navigator,
    writable: true,
    configurable: true,
  });

  return dom;
}

function cleanup(dom: JSDOM | null): void {
  if (dom) {
    dom.window.close();
  }
  delete (global as any).document;
  delete (global as any).window;
  delete (global as any).HTMLElement;
  Object.defineProperty(global, 'navigator', {
    value: undefined,
    writable: true,
    configurable: true,
  });
}

describe('E2E - Consultas Tab', () => {
  let dom: JSDOM;

  const mockAppointments = [
    {
      id: 'appt-1',
      patient_name: 'Maria Silva',
      doctor_name: 'Dr. João',
      start_time: '2026-03-15T10:00:00.000Z',
      end_time: '2026-03-15T11:00:00.000Z',
      appointment_type: 'FIRST_VISIT',
      status: 'confirmed',
      specialty: 'cardiology',
    },
    {
      id: 'appt-2',
      patient_name: 'Carlos Souza',
      doctor_name: 'Dr. Ana',
      start_time: '2026-03-16T14:00:00.000Z',
      end_time: '2026-03-16T14:30:00.000Z',
      appointment_type: 'FOLLOW_UP',
      status: 'cancelled',
      specialty: 'dermatology',
    },
  ];

  afterEach(() => {
    resetFetchMock();
    cleanup(dom);
  });

  describe('Appointment list shows all appointments with details', () => {
    it('should display all appointments with patient name, doctor name, date, time, type and status', async () => {
      // Set up mocks before loading HTML (init() calls fetch)
      mockFetch([
        { url: '/api/states', status: 200, body: { states: [{ code: 'PE', name: 'Pernambuco' }] } },
        { url: '/api/doctors/all', status: 200, body: { doctors: [] } },
        { url: '/api/patients', status: 200, body: { patients: [] } },
        { url: '/api/doctors', status: 200, body: { doctors: [] } },
        { url: '/api/holidays', status: 200, body: { isHoliday: false } },
        { method: 'GET', url: '/api/appointments', status: 200, body: { appointments: mockAppointments } },
      ]);

      dom = loadHTMLWithFetch();

      // Allow init() to complete, then call loadAppointments
      await new Promise(resolve => setTimeout(resolve, 100));

      // Update window.fetch to point to current mock
      (dom.window as any).fetch = global.fetch;

      const loadAppointments = (dom.window as any).loadAppointments;
      await loadAppointments();

      const container = document.getElementById('appointmentsList');
      expect(container).not.toBeNull();

      const html = container!.innerHTML;

      // Verify first appointment details
      expect(html).toContain('Maria Silva');
      expect(html).toContain('Dr. João');
      expect(html).toContain('Primeira Consulta');
      expect(html).toContain('Confirmada');

      // Verify second appointment details
      expect(html).toContain('Carlos Souza');
      expect(html).toContain('Dr. Ana');
      expect(html).toContain('Retorno');
      expect(html).toContain('Cancelada');

      // Verify cancelled appointment has no action buttons
      const cards = container!.querySelectorAll('.appointment-card');
      expect(cards.length).toBe(2);

      // The cancelled appointment should have the 'cancelled' class
      const cancelledCard = container!.querySelector('.appointment-card.cancelled');
      expect(cancelledCard).not.toBeNull();
      expect(cancelledCard!.innerHTML).not.toContain('❌ Cancelar');

      // The confirmed appointment should have action buttons
      const confirmedCards = container!.querySelectorAll('.appointment-card:not(.cancelled)');
      expect(confirmedCards.length).toBe(1);
      expect(confirmedCards[0].innerHTML).toContain('Cancelar');
      expect(confirmedCards[0].innerHTML).toContain('Reagendar');
    });
  });

  describe('Cancellation with >24h changes status to Cancelada', () => {
    it('should cancel appointment and reload list showing Cancelada status', async () => {
      // Appointment far in the future (>24h from now)
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      const futureStart = futureDate.toISOString();
      const futureEnd = new Date(futureDate.getTime() + 60 * 60 * 1000).toISOString();

      const appointmentToCancel = {
        id: 'appt-cancel-1',
        patient_name: 'Pedro Lima',
        doctor_name: 'Dr. Clara',
        start_time: futureStart,
        end_time: futureEnd,
        appointment_type: 'FIRST_VISIT',
        status: 'confirmed',
        specialty: 'neurology',
      };

      const cancelledAppointment = {
        ...appointmentToCancel,
        status: 'cancelled',
      };

      // Initial mocks include patients so allPatients is populated via init() -> refreshDropdowns()
      mockFetch([
        { url: '/api/states', status: 200, body: { states: [{ code: 'PE', name: 'Pernambuco' }] } },
        { url: '/api/doctors/all', status: 200, body: { doctors: [] } },
        { url: '/api/patients', status: 200, body: { patients: [{ id: 'patient-1', name: 'Pedro Lima', email: 'pedro@test.com' }] } },
        { url: '/api/doctors', status: 200, body: { doctors: [] } },
        { url: '/api/holidays', status: 200, body: { isHoliday: false } },
        { method: 'GET', url: '/api/appointments', status: 200, body: { appointments: [appointmentToCancel] } },
      ]);

      dom = loadHTMLWithFetch();

      // Allow init() to complete (populates allPatients)
      await new Promise(resolve => setTimeout(resolve, 100));

      (dom.window as any).fetch = global.fetch;

      // Load appointments to show the list
      const loadAppointments = (dom.window as any).loadAppointments;
      await loadAppointments();

      const container = document.getElementById('appointmentsList');
      await waitFor(() => container!.innerHTML.includes('Pedro Lima'), 3000);

      // Verify it shows as Confirmada initially
      expect(container!.innerHTML).toContain('Confirmada');

      // Mock confirm dialog and alert
      (dom.window as any).confirm = () => true;
      (dom.window as any).alert = jest.fn();

      // Update mock to return cancelled version after cancel
      resetFetchMock();
      mockFetch([
        { method: 'POST', url: '/api/appointments/appt-cancel-1/cancel', status: 200, body: { message: 'Appointment cancelled successfully' } },
        { method: 'GET', url: '/api/appointments', status: 200, body: { appointments: [cancelledAppointment] } },
        { url: '/api/states', status: 200, body: { states: [] } },
        { url: '/api/doctors/all', status: 200, body: { doctors: [] } },
        { url: '/api/patients', status: 200, body: { patients: [] } },
        { url: '/api/doctors', status: 200, body: { doctors: [] } },
        { url: '/api/holidays', status: 200, body: { isHoliday: false } },
      ]);
      (dom.window as any).fetch = global.fetch;

      // Call cancelAppt directly
      const cancelAppt = (dom.window as any).cancelAppt;
      await cancelAppt('appt-cancel-1', 'Pedro Lima');

      // Verify alert was called with success message
      expect((dom.window as any).alert).toHaveBeenCalledWith('✅ Cancelada!');

      // Wait for the list to reload with cancelled status
      await waitFor(() => container!.innerHTML.includes('Cancelada'), 3000);

      // After reload, appointment should show as Cancelada
      expect(container!.innerHTML).toContain('Cancelada');
      // Cancelled appointment should not have action buttons
      const cancelledCard = container!.querySelector('.appointment-card.cancelled');
      expect(cancelledCard).not.toBeNull();
      expect(cancelledCard!.innerHTML).not.toContain('❌ Cancelar');
    });
  });

  describe('Cancellation with ≤24h shows error and keeps Confirmada', () => {
    it('should show error when cancelling within 24h and keep status as Confirmada', async () => {
      // Appointment within 24h from now
      const soonDate = new Date();
      soonDate.setHours(soonDate.getHours() + 12); // 12h from now (≤24h)
      const soonStart = soonDate.toISOString();
      const soonEnd = new Date(soonDate.getTime() + 60 * 60 * 1000).toISOString();

      const appointmentSoon = {
        id: 'appt-soon-1',
        patient_name: 'Ana Costa',
        doctor_name: 'Dr. Roberto',
        start_time: soonStart,
        end_time: soonEnd,
        appointment_type: 'FOLLOW_UP',
        status: 'confirmed',
        specialty: 'pediatrics',
      };

      // Initial mocks include patients so allPatients is populated
      mockFetch([
        { url: '/api/states', status: 200, body: { states: [{ code: 'PE', name: 'Pernambuco' }] } },
        { url: '/api/doctors/all', status: 200, body: { doctors: [] } },
        { url: '/api/patients', status: 200, body: { patients: [{ id: 'patient-2', name: 'Ana Costa', email: 'ana@test.com' }] } },
        { url: '/api/doctors', status: 200, body: { doctors: [] } },
        { url: '/api/holidays', status: 200, body: { isHoliday: false } },
        { method: 'GET', url: '/api/appointments', status: 200, body: { appointments: [appointmentSoon] } },
        { method: 'POST', url: '/api/appointments/appt-soon-1/cancel', status: 409, body: { error: { code: 'CANCELLATION_POLICY', message: 'Cancelamento deve ser feito com mais de 24 horas de antecedência' } } },
      ]);

      dom = loadHTMLWithFetch();

      // Allow init() to complete (populates allPatients)
      await new Promise(resolve => setTimeout(resolve, 100));

      (dom.window as any).fetch = global.fetch;

      // Load appointments
      const loadAppointments = (dom.window as any).loadAppointments;
      await loadAppointments();

      const container = document.getElementById('appointmentsList');
      await waitFor(() => container!.innerHTML.includes('Ana Costa'), 3000);

      // Verify it shows as Confirmada
      expect(container!.innerHTML).toContain('Confirmada');

      // Mock confirm dialog and alert
      (dom.window as any).confirm = () => true;
      (dom.window as any).alert = jest.fn();

      // Attempt cancellation
      const cancelAppt = (dom.window as any).cancelAppt;
      await cancelAppt('appt-soon-1', 'Ana Costa');

      // Verify alert was called with error message containing the cancellation policy info
      expect((dom.window as any).alert).toHaveBeenCalledWith(
        expect.stringContaining('Cancelamento deve ser feito com mais de 24 horas de antecedência')
      );

      // Status should remain as Confirmada (no reload happened since cancel failed)
      expect(container!.innerHTML).toContain('Confirmada');
      expect(container!.querySelector('.appointment-card.cancelled')).toBeNull();
    });
  });
});
