import { TextEncoder, TextDecoder } from 'util';
if (typeof global.TextEncoder === 'undefined') {
  (global as any).TextEncoder = TextEncoder;
  (global as any).TextDecoder = TextDecoder;
}
if (typeof global.ReadableStream === 'undefined') {
  const { ReadableStream, WritableStream, TransformStream } = require('stream/web');
  (global as any).ReadableStream = ReadableStream;
  (global as any).WritableStream = WritableStream;
  (global as any).TransformStream = TransformStream;
}

import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';

let dom: JSDOM | null = null;

/**
 * Reads public/index.html and sets up a JSDOM document.
 * Sets global.document and global.window for tests to use.
 * Injects global.fetch into the JSDOM window before scripts run,
 * so that mocked fetch is available to inline scripts.
 */
export function loadHTML(): JSDOM {
  const htmlPath = path.resolve(__dirname, '..', '..', '..', 'public', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf-8');

  dom = new JSDOM(html, {
    url: 'http://localhost:3000',
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    beforeParse(window: any) {
      // Inject the mocked fetch (set by mockFetch) into the JSDOM window
      // so inline scripts can use it
      window.fetch = global.fetch;
      window.confirm = () => true;
    },
  });

  (global as any).document = dom.window.document;
  (global as any).window = dom.window;
  (global as any).HTMLElement = dom.window.HTMLElement;

  // navigator is read-only in newer Node.js; use defineProperty to override
  Object.defineProperty(global, 'navigator', {
    value: dom.window.navigator,
    writable: true,
    configurable: true,
  });

  return dom;
}

/**
 * Fills an input element identified by CSS selector with the given value.
 * Dispatches 'input' and 'change' events to simulate user typing.
 */
export function fillInput(selector: string, value: string): void {
  const el = document.querySelector(selector) as HTMLInputElement | null;
  if (!el) {
    throw new Error(`fillInput: element not found for selector "${selector}"`);
  }

  el.value = value;

  const inputEvent = new (global as any).window.Event('input', { bubbles: true });
  el.dispatchEvent(inputEvent);

  const changeEvent = new (global as any).window.Event('change', { bubbles: true });
  el.dispatchEvent(changeEvent);
}

/**
 * Clicks a button element identified by CSS selector.
 * Dispatches a 'click' event to simulate user interaction.
 */
export function clickButton(selector: string): void {
  const el = document.querySelector(selector) as HTMLButtonElement | null;
  if (!el) {
    throw new Error(`clickButton: element not found for selector "${selector}"`);
  }

  const clickEvent = new (global as any).window.MouseEvent('click', {
    bubbles: true,
    cancelable: true,
  });
  el.dispatchEvent(clickEvent);
}

/**
 * Selects an option in a <select> element identified by CSS selector.
 * Sets the value and dispatches a 'change' event.
 */
export function selectOption(selector: string, value: string): void {
  const el = document.querySelector(selector) as HTMLSelectElement | null;
  if (!el) {
    throw new Error(`selectOption: element not found for selector "${selector}"`);
  }

  el.value = value;

  const changeEvent = new (global as any).window.Event('change', { bubbles: true });
  el.dispatchEvent(changeEvent);
}

/**
 * Waits for a condition to become true, polling at short intervals.
 * Useful for async DOM updates triggered by fetch responses.
 * @param condition - Function that returns true when the expected state is reached
 * @param timeout - Maximum time to wait in milliseconds (default: 3000)
 * @returns Promise that resolves when condition is met or rejects on timeout
 */
export async function waitFor(
  condition: () => boolean,
  timeout: number = 3000
): Promise<void> {
  const pollInterval = 50;
  const startTime = Date.now();

  return new Promise<void>((resolve, reject) => {
    const check = () => {
      if (condition()) {
        resolve();
        return;
      }

      if (Date.now() - startTime >= timeout) {
        reject(new Error(`waitFor: condition not met within ${timeout}ms`));
        return;
      }

      setTimeout(check, pollInterval);
    };

    check();
  });
}

/**
 * Returns the text content of an element identified by CSS selector.
 * Useful for assertions on DOM content.
 */
export function getTextContent(selector: string): string | null {
  const el = document.querySelector(selector);
  if (!el) {
    throw new Error(`getTextContent: element not found for selector "${selector}"`);
  }

  return el.textContent;
}

/**
 * Cleans up the JSDOM instance and global references.
 * Call in afterEach/afterAll to prevent memory leaks.
 */
export function cleanupDOM(): void {
  if (dom) {
    dom.window.close();
    dom = null;
  }

  delete (global as any).document;
  delete (global as any).window;
  delete (global as any).HTMLElement;

  // Restore navigator to its original state
  Object.defineProperty(global, 'navigator', {
    value: undefined,
    writable: true,
    configurable: true,
  });
}
