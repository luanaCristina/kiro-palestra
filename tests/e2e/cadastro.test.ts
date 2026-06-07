import { loadHTML, fillInput, clickButton, waitFor, getTextContent, cleanupDOM } from './helpers/dom-helpers';
import { mockFetch, resetFetchMock, assertFetchCalledWith } from './helpers/fetch-mock';

describe('E2E - Cadastro Tab', () => {
  beforeEach(() => {
    mockFetch([
      // Doctor creation success
      {
        method: 'POST',
        url: '/api/doctors',
        status: 201,
        body: { doctor: { id: 'doc-1', name: 'Dr. João Silva', specialty: 'cardiology' } },
      },
      // Patient creation success
      {
        method: 'POST',
        url: '/api/patients',
        status: 201,
        body: { patient: { id: 'pat-1', name: 'Maria Santos', email: 'maria@email.com' } },
      },
      // Doctors list (used by refreshDropdowns)
      {
        method: 'GET',
        url: '/api/doctors/all',
        status: 200,
        body: { doctors: [{ id: 'doc-1', name: 'Dr. João Silva', specialty: 'cardiology' }] },
      },
      // Patients list (used by refreshDropdowns)
      {
        method: 'GET',
        url: '/api/patients',
        status: 200,
        body: { patients: [{ id: 'pat-1', name: 'Maria Santos', email: 'maria@email.com' }] },
      },
      // States (used by init)
      {
        method: 'GET',
        url: '/api/states',
        status: 200,
        body: { states: [{ code: 'SP', name: 'São Paulo' }] },
      },
      // Doctors with specialty filter (used by init -> loadAvailableSlots)
      {
        method: 'GET',
        url: '/api/doctors?specialty=',
        status: 200,
        body: { doctors: [] },
      },
    ]);

    loadHTML();
  });

  afterEach(() => {
    cleanupDOM();
    resetFetchMock();
  });

  describe('Doctor Registration', () => {
    it('should show success message when registering with valid name and specialty', async () => {
      fillInput('#newDoctorName', 'Dr. João Silva');

      // Click the "Cadastrar Médico" button
      const buttons = document.querySelectorAll('#tab-cadastro button');
      const doctorButton = Array.from(buttons).find(
        (btn) => btn.textContent === 'Cadastrar Médico'
      ) as HTMLButtonElement;
      expect(doctorButton).toBeDefined();

      // Trigger createDoctor via the button's onclick
      const createDoctorFn = (global as any).window.createDoctor;
      await createDoctorFn();

      await waitFor(() => {
        const resultEl = document.getElementById('createDoctorResult');
        return resultEl !== null && resultEl.innerHTML.includes('cadastrado');
      });

      const resultText = document.getElementById('createDoctorResult')!.innerHTML;
      expect(resultText).toContain('Dr. João Silva');
      expect(resultText).toContain('cadastrado');
      expect(resultText).toContain('success');

      assertFetchCalledWith('/api/doctors', {
        method: 'POST',
        body: JSON.stringify({ name: 'Dr. João Silva', specialty: 'cardiology' }),
      });
    });

    it('should show validation error when name is empty', async () => {
      // Leave the name field empty (default is empty)
      fillInput('#newDoctorName', '');

      const createDoctorFn = (global as any).window.createDoctor;
      await createDoctorFn();

      await waitFor(() => {
        const resultEl = document.getElementById('createDoctorResult');
        return resultEl !== null && resultEl.innerHTML.includes('error');
      });

      const resultText = document.getElementById('createDoctorResult')!.innerHTML;
      expect(resultText).toContain('Informe o nome');
      expect(resultText).toContain('error');
    });
  });

  describe('Patient Registration', () => {
    it('should show success message when registering with valid name and email', async () => {
      fillInput('#newPatientName', 'Maria Santos');
      fillInput('#newPatientEmail', 'maria@email.com');

      const createPatientFn = (global as any).window.createPatient;
      await createPatientFn();

      await waitFor(() => {
        const resultEl = document.getElementById('createPatientResult');
        return resultEl !== null && resultEl.innerHTML.includes('cadastrado');
      });

      const resultText = document.getElementById('createPatientResult')!.innerHTML;
      expect(resultText).toContain('Maria Santos');
      expect(resultText).toContain('cadastrado');
      expect(resultText).toContain('success');

      assertFetchCalledWith('/api/patients', {
        method: 'POST',
        body: JSON.stringify({ name: 'Maria Santos', email: 'maria@email.com' }),
      });
    });

    it('should show validation error when email is empty', async () => {
      fillInput('#newPatientName', 'Maria Santos');
      fillInput('#newPatientEmail', '');

      const createPatientFn = (global as any).window.createPatient;
      await createPatientFn();

      await waitFor(() => {
        const resultEl = document.getElementById('createPatientResult');
        return resultEl !== null && resultEl.innerHTML.includes('error');
      });

      const resultText = document.getElementById('createPatientResult')!.innerHTML;
      expect(resultText).toContain('Informe nome e email');
      expect(resultText).toContain('error');
    });
  });

  describe('Form Cleanup', () => {
    it('should clear form fields after successful doctor registration', async () => {
      fillInput('#newDoctorName', 'Dr. João Silva');

      const createDoctorFn = (global as any).window.createDoctor;
      await createDoctorFn();

      await waitFor(() => {
        const resultEl = document.getElementById('createDoctorResult');
        return resultEl !== null && resultEl.innerHTML.includes('cadastrado');
      });

      const nameInput = document.getElementById('newDoctorName') as HTMLInputElement;
      expect(nameInput.value).toBe('');
    });

    it('should clear form fields after successful patient registration', async () => {
      fillInput('#newPatientName', 'Maria Santos');
      fillInput('#newPatientEmail', 'maria@email.com');

      const createPatientFn = (global as any).window.createPatient;
      await createPatientFn();

      await waitFor(() => {
        const resultEl = document.getElementById('createPatientResult');
        return resultEl !== null && resultEl.innerHTML.includes('cadastrado');
      });

      const nameInput = document.getElementById('newPatientName') as HTMLInputElement;
      const emailInput = document.getElementById('newPatientEmail') as HTMLInputElement;
      expect(nameInput.value).toBe('');
      expect(emailInput.value).toBe('');
    });
  });
});
