import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';
import { mockFetch, resetFetchMock } from './helpers/fetch-mock';

/**
 * E2E tests for the Disponibilidade (Availability) tab.
 * Tests cover: adding ranges, editing via modal, deleting with confirmation,
 * and cancelling the delete dialog.
 */
describe('E2E - Disponibilidade Tab', () => {
  let dom: JSDOM;
  let window: any;
  let document: Document;

  const mockDoctors = [
    { id: 'doc-001', name: 'Dr. Carlos', specialty: 'cardiology', created_at: '2025-01-01' },
    { id: 'doc-002', name: 'Dr. Maria', specialty: 'dermatology', created_at: '2025-01-02' },
  ];

  const mockRanges = [
    { id: 'range-001', day_of_week: 1, start_time: '08:00:00', end_time: '12:00:00' },
    { id: 'range-002', day_of_week: 3, start_time: '14:00:00', end_time: '18:00:00' },
  ];

  const mockStates = Array.from({ length: 27 }, (_, i) => ({
    code: `${String.fromCharCode(65 + Math.floor(i / 26))}${String.fromCharCode(65 + (i % 26))}`,
    name: `Estado ${i + 1}`,
  }));

  function createFetchMock(ranges = mockRanges) {
    const routes = [
      { method: 'GET', url: '/api/doctors/all', status: 200, body: { doctors: mockDoctors } },
      { method: 'GET', url: '/api/patients', status: 200, body: { patients: [] } },
      { method: 'GET', url: '/api/states', status: 200, body: { states: mockStates } },
      { method: 'GET', url: /\/api\/availability\//, status: 200, body: { doctorId: 'doc-001', ranges } },
      { method: 'PUT', url: /\/api\/doctors\/.*\/availability/, status: 200, body: { schedule: { doctorId: 'doc-001', ranges: [{ dayOfWeek: 1, startTime: '08:00', endTime: '12:00' }] } } },
      { method: 'PUT', url: /\/api\/availability\//, status: 200, body: { id: 'range-001', day_of_week: 2, start_time: '09:00:00', end_time: '13:00:00' } },
      { method: 'DELETE', url: /\/api\/availability\//, status: 200, body: { message: 'Range removido', id: 'range-001' } },
      { method: 'GET', url: /\/api\/doctors\?/, status: 200, body: { doctors: [] } },
      { method: 'GET', url: /\/api\/holidays/, status: 200, body: { isHoliday: false } },
    ];
    return routes;
  }

  function createMockFetchFn(routes: Array<{ method?: string; url: string | RegExp; status: number; body: unknown }>) {
    return async (input: any, init?: any): Promise<any> => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = (init?.method || 'GET').toUpperCase();

      const matchedRoute = routes.find((route) => {
        const methodMatches = !route.method || route.method.toUpperCase() === method;
        const urlMatches = route.url instanceof RegExp
          ? route.url.test(url)
          : url.includes(route.url as string);
        return methodMatches && urlMatches;
      });

      if (!matchedRoute) {
        return {
          ok: false,
          status: 404,
          json: async () => ({ error: `No mock: ${method} ${url}` }),
          text: async () => `No mock: ${method} ${url}`,
        };
      }

      return {
        ok: matchedRoute.status >= 200 && matchedRoute.status < 300,
        status: matchedRoute.status,
        json: async () => matchedRoute.body,
        text: async () => JSON.stringify(matchedRoute.body),
      };
    };
  }

  function setupDOM(routes?: Array<{ method?: string; url: string | RegExp; status: number; body: unknown }>) {
    const htmlPath = path.resolve(__dirname, '..', '..', 'public', 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf-8');

    // Inject fetch mock before the script runs
    const mockRoutes = routes || createFetchMock();
    const fetchFn = createMockFetchFn(mockRoutes);

    dom = new JSDOM(html, {
      url: 'http://localhost:3000',
      runScripts: 'dangerously',
      resources: 'usable',
      pretendToBeVisual: true,
      beforeParse(win: any) {
        // Inject fetch into the JSDOM window before scripts execute
        win.fetch = fetchFn;
        win.confirm = jest.fn(() => true);
        win.alert = jest.fn();
      },
    });

    window = dom.window;
    document = window.document;
    (global as any).document = document;
    (global as any).window = window;
  }

  async function waitForCondition(condition: () => boolean, timeout = 3000): Promise<void> {
    const pollInterval = 50;
    const startTime = Date.now();
    return new Promise<void>((resolve, reject) => {
      const check = () => {
        if (condition()) { resolve(); return; }
        if (Date.now() - startTime >= timeout) {
          reject(new Error(`Condition not met within ${timeout}ms`));
          return;
        }
        setTimeout(check, pollInterval);
      };
      check();
    });
  }

  afterEach(() => {
    if (dom) {
      dom.window.close();
    }
    delete (global as any).document;
    delete (global as any).window;
  });

  async function waitForInit() {
    await waitForCondition(() => {
      const availDoctor = document.getElementById('availDoctor') as HTMLSelectElement;
      return availDoctor !== null && availDoctor.options.length > 0;
    });
  }

  function navigateToDisponibilidadeTab() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const disponibilidadeBtn = Array.from(tabButtons).find(
      btn => btn.textContent?.includes('Disponibilidade')
    );
    if (disponibilidadeBtn) {
      const clickEvent = new window.MouseEvent('click', { bubbles: true, cancelable: true });
      disponibilidadeBtn.dispatchEvent(clickEvent);
    }
  }

  describe('Adding a valid availability range', () => {
    it('should show success message and update the availability list', async () => {
      setupDOM();
      await waitForInit();
      navigateToDisponibilidadeTab();

      // Select a doctor
      const availDoctor = document.getElementById('availDoctor') as HTMLSelectElement;
      availDoctor.value = 'doc-001';
      availDoctor.dispatchEvent(new window.Event('change', { bubbles: true }));

      // Select day (Segunda-feira = 1)
      const availDay = document.getElementById('availDay') as HTMLSelectElement;
      availDay.value = '1';
      availDay.dispatchEvent(new window.Event('change', { bubbles: true }));

      // Select start time
      const availStart = document.getElementById('availStart') as HTMLSelectElement;
      availStart.value = '08:00';
      availStart.dispatchEvent(new window.Event('change', { bubbles: true }));

      // Select end time
      const availEnd = document.getElementById('availEnd') as HTMLSelectElement;
      availEnd.value = '12:00';
      availEnd.dispatchEvent(new window.Event('change', { bubbles: true }));

      // Click "Adicionar Horário" button
      const addButton = Array.from(document.querySelectorAll('button')).find(
        btn => btn.textContent?.includes('Adicionar Horário')
      ) as HTMLButtonElement;
      expect(addButton).toBeDefined();
      addButton.click();

      // Wait for the success result to appear
      await waitForCondition(() => {
        const result = document.getElementById('availResult');
        return result !== null && result.innerHTML.includes('success');
      });

      // Verify success message
      const resultContent = document.getElementById('availResult')!.innerHTML;
      expect(resultContent).toContain('success');
      expect(resultContent).toContain('Disponibilidade salva');

      // Verify availability list was updated
      await waitForCondition(() => {
        const availList = document.getElementById('availabilityList');
        return availList !== null && availList.innerHTML.includes('avail-range');
      });

      const listContent = document.getElementById('availabilityList')!.innerHTML;
      expect(listContent).toContain('avail-range');
    });
  });

  describe('Editing a range via modal', () => {
    it('should open modal, update values and close on save', async () => {
      setupDOM();
      await waitForInit();
      navigateToDisponibilidadeTab();

      // Select a doctor and trigger loading availability
      const availDoctor = document.getElementById('availDoctor') as HTMLSelectElement;
      availDoctor.value = 'doc-001';
      availDoctor.dispatchEvent(new window.Event('change', { bubbles: true }));

      // Wait for availability list to render
      await waitForCondition(() => {
        const availList = document.getElementById('availabilityList');
        return availList !== null && availList.innerHTML.includes('avail-range');
      });

      // Open the edit modal via the global function
      window.openEditAvail('range-001', 1, '08:00', '12:00');

      // Verify modal is visible
      const modal = document.getElementById('editAvailModal');
      expect(modal?.classList.contains('visible')).toBe(true);

      // Verify modal is pre-populated with current values
      const editRangeId = document.getElementById('editAvailRangeId') as HTMLInputElement;
      const editDay = document.getElementById('editAvailDay') as HTMLSelectElement;
      const editStart = document.getElementById('editAvailStart') as HTMLInputElement;
      const editEnd = document.getElementById('editAvailEnd') as HTMLInputElement;

      expect(editRangeId.value).toBe('range-001');
      expect(editDay.value).toBe('1');
      expect(editStart.value).toBe('08:00');
      expect(editEnd.value).toBe('12:00');

      // Change values in the modal
      editDay.value = '2';
      editDay.dispatchEvent(new window.Event('change', { bubbles: true }));
      editStart.value = '09:00';
      editStart.dispatchEvent(new window.Event('input', { bubbles: true }));
      editEnd.value = '13:00';
      editEnd.dispatchEvent(new window.Event('input', { bubbles: true }));

      // Call saveEditAvailability
      window.saveEditAvailability();

      // Wait for modal to close (PUT successful -> modal closes)
      await waitForCondition(() => {
        const modalEl = document.getElementById('editAvailModal');
        return modalEl !== null && !modalEl.classList.contains('visible');
      });

      // Verify modal is closed
      expect(document.getElementById('editAvailModal')?.classList.contains('visible')).toBe(false);
    });
  });

  describe('Deleting a range with confirmation', () => {
    it('should remove the range from the list when confirmed', async () => {
      // First load shows ranges, after delete the GET returns empty
      let deletePerformed = false;
      const routes = [
        { method: 'GET', url: '/api/doctors/all', status: 200, body: { doctors: mockDoctors } },
        { method: 'GET', url: '/api/patients', status: 200, body: { patients: [] } },
        { method: 'GET', url: '/api/states', status: 200, body: { states: mockStates } },
        { method: 'DELETE', url: /\/api\/availability\//, status: 200, body: { message: 'Range removido', id: 'range-001' } },
        { method: 'GET', url: /\/api\/doctors\?/, status: 200, body: { doctors: [] } },
        { method: 'GET', url: /\/api\/holidays/, status: 200, body: { isHoliday: false } },
      ];

      // Dynamic route: availability returns ranges first, then empty after delete
      const dynamicFetch = async (input: any, init?: any): Promise<any> => {
        const url = typeof input === 'string' ? input : input.toString();
        const method = (init?.method || 'GET').toUpperCase();

        // Handle DELETE first
        if (method === 'DELETE' && /\/api\/availability\//.test(url)) {
          deletePerformed = true;
          return {
            ok: true, status: 200,
            json: async () => ({ message: 'Range removido', id: 'range-001' }),
            text: async () => JSON.stringify({ message: 'Range removido', id: 'range-001' }),
          };
        }

        // GET availability - return empty after delete
        if (method === 'GET' && /\/api\/availability\//.test(url)) {
          const ranges = deletePerformed ? [] : mockRanges;
          return {
            ok: true, status: 200,
            json: async () => ({ doctorId: 'doc-001', ranges }),
            text: async () => JSON.stringify({ doctorId: 'doc-001', ranges }),
          };
        }

        // Match remaining routes
        const matchedRoute = routes.find((route) => {
          const methodMatches = !route.method || route.method.toUpperCase() === method;
          const urlMatches = route.url instanceof RegExp ? route.url.test(url) : url.includes(route.url as string);
          return methodMatches && urlMatches;
        });

        if (!matchedRoute) {
          return { ok: false, status: 404, json: async () => ({ error: `No mock: ${method} ${url}` }), text: async () => '' };
        }

        return {
          ok: matchedRoute.status >= 200 && matchedRoute.status < 300,
          status: matchedRoute.status,
          json: async () => matchedRoute.body,
          text: async () => JSON.stringify(matchedRoute.body),
        };
      };

      const htmlPath = path.resolve(__dirname, '..', '..', 'public', 'index.html');
      const html = fs.readFileSync(htmlPath, 'utf-8');

      dom = new JSDOM(html, {
        url: 'http://localhost:3000',
        runScripts: 'dangerously',
        resources: 'usable',
        pretendToBeVisual: true,
        beforeParse(win: any) {
          win.fetch = dynamicFetch;
          win.confirm = jest.fn(() => true);
          win.alert = jest.fn();
        },
      });

      window = dom.window;
      document = window.document;
      (global as any).document = document;
      (global as any).window = window;

      await waitForInit();
      navigateToDisponibilidadeTab();

      // Select a doctor and trigger loading availability
      const availDoctor = document.getElementById('availDoctor') as HTMLSelectElement;
      availDoctor.value = 'doc-001';
      availDoctor.dispatchEvent(new window.Event('change', { bubbles: true }));

      // Wait for availability list to render with ranges
      await waitForCondition(() => {
        const availList = document.getElementById('availabilityList');
        return availList !== null && availList.innerHTML.includes('avail-range');
      });

      // Call deleteAvailability
      window.deleteAvailability('range-001');

      // Verify confirm dialog was shown
      expect(window.confirm).toHaveBeenCalled();

      // Wait for the list to update showing no ranges
      await waitForCondition(() => {
        const availList = document.getElementById('availabilityList');
        return availList !== null && availList.innerHTML.includes('Nenhum horário configurado');
      });

      // Verify range was removed from list
      const listContent = document.getElementById('availabilityList')!.innerHTML;
      expect(listContent).toContain('Nenhum horário configurado');
    });
  });

  describe('Cancelling delete dialog keeps range intact', () => {
    it('should keep the range when user cancels the confirmation dialog', async () => {
      setupDOM();
      // Override confirm to return false
      window.confirm = jest.fn(() => false);

      await waitForInit();
      navigateToDisponibilidadeTab();

      // Select a doctor and trigger loading availability
      const availDoctor = document.getElementById('availDoctor') as HTMLSelectElement;
      availDoctor.value = 'doc-001';
      availDoctor.dispatchEvent(new window.Event('change', { bubbles: true }));

      // Wait for availability list to render
      await waitForCondition(() => {
        const availList = document.getElementById('availabilityList');
        return availList !== null && availList.innerHTML.includes('avail-range');
      });

      // Store current list content before delete attempt
      const listContentBefore = document.getElementById('availabilityList')!.innerHTML;

      // Call deleteAvailability - confirm returns false so nothing happens
      window.deleteAvailability('range-001');

      // Verify confirm was called
      expect(window.confirm).toHaveBeenCalled();

      // Small delay to ensure no async side effects
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify the range is still there (list hasn't changed)
      const listContentAfter = document.getElementById('availabilityList')!.innerHTML;
      expect(listContentAfter).toContain('avail-range');
      expect(listContentAfter).toBe(listContentBefore);
    });
  });
});
