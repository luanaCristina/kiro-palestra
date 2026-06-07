import { mockFetch, resetFetchMock, assertFetchCalledWith, getFetchCalls } from './fetch-mock';

describe('fetch-mock utilities', () => {
  afterEach(() => {
    resetFetchMock();
  });

  describe('mockFetch', () => {
    it('should match routes by URL string', async () => {
      mockFetch([
        { method: 'GET', url: '/api/doctors/all', status: 200, body: { doctors: [] } },
      ]);

      const response = await fetch('/api/doctors/all');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(response.ok).toBe(true);
      expect(data).toEqual({ doctors: [] });
    });

    it('should match routes by regex URL pattern', async () => {
      mockFetch([
        { method: 'GET', url: /\/api\/doctors\/\w+/, status: 200, body: { doctor: { id: '1' } } },
      ]);

      const response = await fetch('/api/doctors/abc123');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ doctor: { id: '1' } });
    });

    it('should match POST routes by method and URL', async () => {
      mockFetch([
        { method: 'POST', url: '/api/doctors', status: 201, body: { doctor: { id: '1', name: 'Dr. Test', specialty: 'cardiology' } } },
        { method: 'GET', url: '/api/doctors/all', status: 200, body: { doctors: [] } },
      ]);

      const response = await fetch('/api/doctors', {
        method: 'POST',
        body: JSON.stringify({ name: 'Dr. Test', specialty: 'cardiology' }),
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.doctor.name).toBe('Dr. Test');
    });

    it('should return 404 for unmatched routes', async () => {
      mockFetch([
        { method: 'GET', url: '/api/doctors', status: 200, body: { doctors: [] } },
      ]);

      const response = await fetch('/api/unknown');

      expect(response.status).toBe(404);
      expect(response.ok).toBe(false);
    });

    it('should match any method when route method is not specified', async () => {
      mockFetch([
        { url: '/api/data', status: 200, body: { ok: true } },
      ]);

      const getResponse = await fetch('/api/data');
      expect(getResponse.status).toBe(200);

      const postResponse = await fetch('/api/data', { method: 'POST' });
      expect(postResponse.status).toBe(200);
    });

    it('should support error status codes', async () => {
      mockFetch([
        { method: 'POST', url: '/api/doctors', status: 400, body: { error: { code: 'VALIDATION_ERROR' } } },
      ]);

      const response = await fetch('/api/doctors', { method: 'POST' });

      expect(response.status).toBe(400);
      expect(response.ok).toBe(false);
    });
  });

  describe('resetFetchMock', () => {
    it('should clear recorded calls', async () => {
      mockFetch([{ url: '/api/test', status: 200, body: {} }]);
      await fetch('/api/test');

      expect(getFetchCalls()).toHaveLength(1);

      resetFetchMock();

      expect(getFetchCalls()).toHaveLength(0);
    });
  });

  describe('assertFetchCalledWith', () => {
    it('should pass when fetch was called with matching URL', async () => {
      mockFetch([{ url: '/api/doctors', status: 200, body: {} }]);
      await fetch('/api/doctors');

      expect(() => assertFetchCalledWith('/api/doctors')).not.toThrow();
    });

    it('should pass when fetch was called with matching URL and method', async () => {
      mockFetch([{ method: 'POST', url: '/api/doctors', status: 201, body: {} }]);
      await fetch('/api/doctors', { method: 'POST', body: JSON.stringify({ name: 'Dr.' }) });

      expect(() => assertFetchCalledWith('/api/doctors', { method: 'POST' })).not.toThrow();
    });

    it('should pass when fetch was called with matching URL, method, and body', async () => {
      mockFetch([{ method: 'POST', url: '/api/doctors', status: 201, body: {} }]);
      const payload = JSON.stringify({ name: 'Dr. Test' });
      await fetch('/api/doctors', { method: 'POST', body: payload });

      expect(() => assertFetchCalledWith('/api/doctors', { method: 'POST', body: payload })).not.toThrow();
    });

    it('should throw when fetch was not called with expected URL', async () => {
      mockFetch([{ url: '/api/doctors', status: 200, body: {} }]);
      await fetch('/api/doctors');

      expect(() => assertFetchCalledWith('/api/patients')).toThrow(
        /Expected fetch to be called with URL containing "\/api\/patients"/
      );
    });

    it('should throw when method does not match', async () => {
      mockFetch([{ url: '/api/doctors', status: 200, body: {} }]);
      await fetch('/api/doctors');

      expect(() => assertFetchCalledWith('/api/doctors', { method: 'POST' })).toThrow();
    });
  });

  describe('getFetchCalls', () => {
    it('should record all fetch calls', async () => {
      mockFetch([
        { url: '/api/doctors', status: 200, body: {} },
        { method: 'POST', url: '/api/patients', status: 201, body: {} },
      ]);

      await fetch('/api/doctors');
      await fetch('/api/patients', { method: 'POST' });

      const calls = getFetchCalls();
      expect(calls).toHaveLength(2);
      expect(calls[0].url).toBe('/api/doctors');
      expect(calls[1].url).toBe('/api/patients');
      expect(calls[1].options?.method).toBe('POST');
    });
  });
});
