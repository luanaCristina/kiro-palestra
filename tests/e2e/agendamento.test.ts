import { loadHTML, selectOption, clickButton, waitFor, getTextContent, cleanupDOM } from './helpers/dom-helpers';
import { mockFetch, resetFetchMock, assertFetchCalledWith } from './helpers/fetch-mock';
import { JSDOM } from 'jsdom';

describe('E2E - Agendamento (Booking Tab)', () => {
  let dom: JSDOM;

  const mockDoctors = [
    { id: 'doctor-uuid-1', name: 'Dr. Carlos', specialty: 'cardiology' },
  ];

  const mockPatients = [
    { id: 'patient-uuid-1', name: 'Maria Silva', email: 'maria@test.com' },
  ];

  const mockStates = [
    { code: 'PE', name: 'Pernambuco' },
    { code: 'SP', name: 'São Paulo' },
  ];

  const futureDate = '2026-04-15'; // A Wednesday

  const mockSlotsResponse = {
    doctors: [
      {
        id: 'doctor-uuid-1',
        name: 'Dr. Carlos',
        specialty: 'cardiology',
        availableSlots: [
          { startTime: '2026-04-15T09:00:00.000Z', endTime: '2026-04-15T09:30:00.000Z' },
          { startTime: '2026-04-15T09:30:00.000Z', endTime: '2026-04-15T10:00:00.000Z' },
          { startTime: '2026-04-15T10:00:00.000Z', endTime: '2026-04-15T10:30:00.000Z' },
          { startTime: '2026-04-15T10:30:00.000Z', endTime: '2026-04-15T11:00:00.000Z' },
          { startTime: '2026-04-15T11:00:00.000Z', endTime: '2026-04-15T11:30:00.000Z' },
          { startTime: '2026-04-15T11:30:00.000Z', endTime: '2026-04-15T12:00:00.000Z' },
        ],
      },
    ],
  };

  const mockNoSlotsResponse = {
    doctors: [
      {
        id: 'doctor-uuid-1',
        name: 'Dr. Carlos',
        specialty: 'cardiology',
        availableSlots: [],
      },
    ],
  };

  const mockBookingConfirmation = {
    confirmation: {
      appointmentId: 'appt-uuid-1',
      patientName: 'Maria Silva',
      doctorName: 'Dr. Carlos',
      specialty: 'cardiology',
      date: '2026-04-15',
      startTime: '2026-04-15T09:00:00.000Z',
      endTime: '2026-04-15T10:00:00.000Z',
      appointmentType: 'FIRST_VISIT',
    },
  };

  beforeEach(() => {
    // Mock fetch BEFORE loadHTML so the init() script can use it
    mockFetch([
      { url: '/api/states', status: 200, body: { states: mockStates } },
      { url: '/api/doctors/all', status: 200, body: { doctors: mockDoctors } },
      { url: '/api/patients', status: 200, body: { patients: mockPatients } },
      { url: '/api/holidays', status: 200, body: { isHoliday: false } },
      { method: 'GET', url: '/api/doctors?', status: 200, body: mockSlotsResponse },
      { method: 'POST', url: '/api/appointments', status: 201, body: mockBookingConfirmation },
    ]);

    dom = loadHTML();
  });

  afterEach(() => {
    resetFetchMock();
    cleanupDOM();
  });

  it('should display available slots when doctor, date, and type are selected', async () => {
    // Wait for init to populate dropdowns
    await waitFor(() => {
      const doctorSelect = document.getElementById('bookDoctor') as HTMLSelectElement;
      return doctorSelect && doctorSelect.options.length > 0;
    });

    // Reset and set up fresh mocks for slot loading
    resetFetchMock();
    mockFetch([
      { url: '/api/holidays', status: 200, body: { isHoliday: false } },
      { method: 'GET', url: '/api/doctors?', status: 200, body: mockSlotsResponse },
    ]);

    // Select doctor
    selectOption('#bookDoctor', 'doctor-uuid-1');

    // Set date and trigger change event
    const dateInput = document.getElementById('bookDate') as HTMLInputElement;
    dateInput.value = futureDate;
    const changeEvent = new (global as any).window.Event('change', { bubbles: true });
    dateInput.dispatchEvent(changeEvent);

    // Wait for slots to load
    await waitFor(() => {
      const container = document.getElementById('slotsContainer');
      const slotBtns = container?.querySelectorAll('.slot-btn:not(.slot-unavailable)');
      return (slotBtns?.length ?? 0) > 0;
    });

    // Verify slots are displayed as clickable buttons
    const slotsContainer = document.getElementById('slotsContainer');
    const slotButtons = slotsContainer?.querySelectorAll('.slot-btn');
    expect(slotButtons!.length).toBeGreaterThan(0);

    // Verify the fetch was called with doctor's specialty
    assertFetchCalledWith('/api/doctors?specialty=cardiology');
  });

  it('should show confirmation after selecting a slot and booking', async () => {
    // Wait for init to populate dropdowns
    await waitFor(() => {
      const doctorSelect = document.getElementById('bookDoctor') as HTMLSelectElement;
      return doctorSelect && doctorSelect.options.length > 0;
    });

    // Reset and set up fresh mocks for slot loading + booking
    resetFetchMock();
    mockFetch([
      { url: '/api/holidays', status: 200, body: { isHoliday: false } },
      { method: 'GET', url: '/api/doctors?', status: 200, body: mockSlotsResponse },
      { method: 'POST', url: '/api/appointments', status: 201, body: mockBookingConfirmation },
    ]);

    // Select doctor
    selectOption('#bookDoctor', 'doctor-uuid-1');

    // Set date and trigger change event
    const dateInput = document.getElementById('bookDate') as HTMLInputElement;
    dateInput.value = futureDate;
    const changeEvent = new (global as any).window.Event('change', { bubbles: true });
    dateInput.dispatchEvent(changeEvent);

    // Wait for slots to load
    await waitFor(() => {
      const container = document.getElementById('slotsContainer');
      const slotBtns = container?.querySelectorAll('.slot-btn:not(.slot-unavailable)');
      return (slotBtns?.length ?? 0) > 0;
    });

    // Click on the first available slot
    const firstSlot = document.querySelector('#slotsContainer .slot-btn:not(.slot-unavailable)') as HTMLButtonElement;
    expect(firstSlot).not.toBeNull();
    firstSlot.click();

    // Verify slot is selected (has 'selected' class)
    expect(firstSlot.classList.contains('selected')).toBe(true);

    // Verify hidden input is set
    const bookDateTime = document.getElementById('bookDateTime') as HTMLInputElement;
    expect(bookDateTime.value).not.toBe('');

    // Click "Agendar Consulta" button
    const bookButton = document.querySelector('#tab-agendamento button[onclick="bookAppointment()"]') as HTMLButtonElement;
    bookButton.click();

    // Wait for the booking result to show
    await waitFor(() => {
      const result = document.getElementById('bookResult');
      return result !== null && result.innerHTML.includes('Consulta agendada');
    });

    // Verify confirmation is displayed
    const bookResult = document.getElementById('bookResult');
    expect(bookResult!.innerHTML).toContain('Maria Silva');
    expect(bookResult!.innerHTML).toContain('Dr. Carlos');
    expect(bookResult!.innerHTML).toContain('Consulta agendada');

    // Verify POST was made to /api/appointments
    assertFetchCalledWith('/api/appointments', { method: 'POST' });
  });

  it('should show informative message when no slots are available', async () => {
    // Wait for init to populate dropdowns
    await waitFor(() => {
      const doctorSelect = document.getElementById('bookDoctor') as HTMLSelectElement;
      return doctorSelect && doctorSelect.options.length > 0;
    });

    // Reset and set up mocks returning no available slots
    resetFetchMock();
    mockFetch([
      { url: '/api/holidays', status: 200, body: { isHoliday: false } },
      { method: 'GET', url: '/api/doctors?', status: 200, body: mockNoSlotsResponse },
    ]);

    // Select doctor
    selectOption('#bookDoctor', 'doctor-uuid-1');

    // Set date and trigger change event
    const dateInput = document.getElementById('bookDate') as HTMLInputElement;
    dateInput.value = futureDate;
    const changeEvent = new (global as any).window.Event('change', { bubbles: true });
    dateInput.dispatchEvent(changeEvent);

    // Wait for the "no slots" message
    await waitFor(() => {
      const container = document.getElementById('slotsContainer');
      return container?.querySelector('.slots-empty') !== null;
    });

    // Verify empty message is shown
    const slotsContainer = document.getElementById('slotsContainer');
    const emptyMessage = slotsContainer?.querySelector('.slots-empty');
    expect(emptyMessage).not.toBeNull();
    expect(emptyMessage!.textContent).toContain('Nenhum horário disponível');

    // Verify no slot buttons are rendered
    const slotButtons = slotsContainer?.querySelectorAll('.slot-btn');
    expect(slotButtons!.length).toBe(0);
  });

  it('should show error when booking without slot selection', async () => {
    // Wait for init to populate dropdowns
    await waitFor(() => {
      const doctorSelect = document.getElementById('bookDoctor') as HTMLSelectElement;
      return doctorSelect && doctorSelect.options.length > 0;
    });

    // Ensure no slot is selected (bookDateTime is empty)
    const bookDateTime = document.getElementById('bookDateTime') as HTMLInputElement;
    bookDateTime.value = '';

    // Click "Agendar Consulta" button without selecting a slot
    const bookButton = document.querySelector('#tab-agendamento button[onclick="bookAppointment()"]') as HTMLButtonElement;
    bookButton.click();

    // Wait for error message
    await waitFor(() => {
      const result = document.getElementById('bookResult');
      return result !== null && result.innerHTML.includes('Selecione um horário');
    });

    // Verify error message is displayed
    const bookResult = document.getElementById('bookResult');
    expect(bookResult!.innerHTML).toContain('Selecione um horário');
    expect(bookResult!.innerHTML).toContain('error');
  });
});
