/**
 * Fetch mocking utilities for E2E tests.
 * Replaces global.fetch with a configurable handler that matches URL patterns
 * and records all calls for later assertion.
 */

export interface MockRoute {
  method?: string;
  url: string | RegExp;
  status: number;
  body: unknown;
}

interface FetchCall {
  url: string;
  options: RequestInit | undefined;
}

const originalFetch = global.fetch;
let fetchCalls: FetchCall[] = [];
let mockRoutes: MockRoute[] = [];

/**
 * Replaces `global.fetch` with a handler that matches requests against
 * the provided routes. Each route defines a method (optional, defaults to
 * matching any method), URL pattern (string or regex), response status,
 * and JSON response body.
 *
 * All calls are recorded for later assertion with `assertFetchCalledWith`.
 */
export function mockFetch(routes: MockRoute[]): void {
  fetchCalls = [];
  mockRoutes = routes;

  global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = (init?.method || 'GET').toUpperCase();

    fetchCalls.push({ url, options: init });

    const matchedRoute = mockRoutes.find((route) => {
      const methodMatches = !route.method || route.method.toUpperCase() === method;
      const urlMatches =
        route.url instanceof RegExp
          ? route.url.test(url)
          : url.includes(route.url);
      return methodMatches && urlMatches;
    });

    if (!matchedRoute) {
      return {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: `No mock route matched: ${method} ${url}` }),
        text: async () => `No mock route matched: ${method} ${url}`,
        headers: new Headers(),
      } as unknown as Response;
    }

    const { status, body } = matchedRoute;

    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: status >= 200 && status < 300 ? 'OK' : 'Error',
      json: async () => body,
      text: async () => JSON.stringify(body),
      headers: new Headers({ 'content-type': 'application/json' }),
    } as unknown as Response;
  });
}

/**
 * Restores the original `global.fetch` and clears recorded calls.
 */
export function resetFetchMock(): void {
  global.fetch = originalFetch;
  fetchCalls = [];
  mockRoutes = [];
}

/**
 * Asserts that `fetch` was called with a URL containing `url` and
 * optionally matching the provided options (method, body, headers).
 *
 * Throws a descriptive error if no matching call is found.
 */
export function assertFetchCalledWith(url: string, options?: Partial<RequestInit>): void {
  const matchingCall = fetchCalls.find((call) => {
    if (!call.url.includes(url)) {
      return false;
    }
    if (options) {
      if (options.method && call.options?.method?.toUpperCase() !== options.method.toUpperCase()) {
        return false;
      }
      if (options.body !== undefined) {
        const callBody = typeof call.options?.body === 'string'
          ? call.options.body
          : JSON.stringify(call.options?.body);
        const expectedBody = typeof options.body === 'string'
          ? options.body
          : JSON.stringify(options.body);
        if (callBody !== expectedBody) {
          return false;
        }
      }
    }
    return true;
  });

  if (!matchingCall) {
    const recordedCalls = fetchCalls
      .map((c) => `  ${c.options?.method || 'GET'} ${c.url}`)
      .join('\n');
    throw new Error(
      `Expected fetch to be called with URL containing "${url}"` +
      (options ? ` and options ${JSON.stringify(options)}` : '') +
      `.\nRecorded calls:\n${recordedCalls || '  (none)'}`
    );
  }
}

/**
 * Returns the list of all recorded fetch calls for custom assertions.
 */
export function getFetchCalls(): FetchCall[] {
  return [...fetchCalls];
}
