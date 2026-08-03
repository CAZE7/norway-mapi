import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { reportLovableError } from '../lovable-error-reporting';

describe('reportLovableError', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    // Stub global window with expected properties for tests unless specifically disabled
    const location = { pathname: '/test-route' };
    vi.stubGlobal('window', {
      location,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should return immediately if window is undefined', () => {
    vi.stubGlobal('window', undefined);

    // Should not throw
    expect(() => reportLovableError(new Error('test'))).not.toThrow();
  });

  it('should handle missing __lovableEvents and __lovableReportRuntimeError safely', () => {
    // window is stubbed but missing those properties
    expect(() => reportLovableError(new Error('test'))).not.toThrow();
  });

  it('should call __lovableEvents.captureException when available', () => {
    const captureException = vi.fn();
    vi.stubGlobal('window', {
      location: { pathname: '/test-route' },
      __lovableEvents: { captureException }
    });

    const error = new Error('test error');
    const context = { extraContext: 'data' };

    reportLovableError(error, context);

    expect(captureException).toHaveBeenCalledTimes(1);
    expect(captureException).toHaveBeenCalledWith(
      error,
      {
        source: 'react_error_boundary',
        route: '/test-route',
        ...context,
      },
      {
        mechanism: 'react_error_boundary',
        handled: false,
        severity: 'error',
      }
    );
  });

  it('should call __lovableReportRuntimeError with standard Error', () => {
    const __lovableReportRuntimeError = vi.fn();
    vi.stubGlobal('window', {
      location: { pathname: '/test-route' },
      __lovableReportRuntimeError
    });

    const error = new Error('standard error');
    error.stack = 'Error: standard error\n  at something';

    reportLovableError(error);

    expect(__lovableReportRuntimeError).toHaveBeenCalledTimes(1);
    expect(__lovableReportRuntimeError).toHaveBeenCalledWith({
      message: 'standard error',
      stack: 'Error: standard error\n  at something',
      filename: '/test-route',
    });
  });

  it('should call __lovableReportRuntimeError with Response object including url', () => {
    const __lovableReportRuntimeError = vi.fn();
    vi.stubGlobal('window', {
      location: { pathname: '/test-route' },
      __lovableReportRuntimeError
    });

    const response = new Response(null, { status: 404 });
    // Mock the url property
    Object.defineProperty(response, 'url', { value: 'https://example.com/api/data' });

    reportLovableError(response);

    expect(__lovableReportRuntimeError).toHaveBeenCalledTimes(1);
    expect(__lovableReportRuntimeError).toHaveBeenCalledWith({
      message: 'Response 404 at https://example.com/api/data',
      stack: undefined,
      filename: '/test-route',
    });
  });

  it('should call __lovableReportRuntimeError with Response object without url', () => {
    const __lovableReportRuntimeError = vi.fn();
    vi.stubGlobal('window', {
      location: { pathname: '/test-route' },
      __lovableReportRuntimeError
    });

    const response = new Response(null, { status: 500 });

    reportLovableError(response);

    expect(__lovableReportRuntimeError).toHaveBeenCalledTimes(1);
    expect(__lovableReportRuntimeError).toHaveBeenCalledWith({
      message: 'Response 500',
      stack: undefined,
      filename: '/test-route',
    });
  });

  it('should call __lovableReportRuntimeError with raw string error', () => {
    const __lovableReportRuntimeError = vi.fn();
    vi.stubGlobal('window', {
      location: { pathname: '/test-route' },
      __lovableReportRuntimeError
    });

    reportLovableError('just a string error');

    expect(__lovableReportRuntimeError).toHaveBeenCalledTimes(1);
    expect(__lovableReportRuntimeError).toHaveBeenCalledWith({
      message: 'just a string error',
      stack: undefined,
      filename: '/test-route',
    });
  });

  it('should call __lovableReportRuntimeError with primitive error', () => {
    const __lovableReportRuntimeError = vi.fn();
    vi.stubGlobal('window', {
      location: { pathname: '/test-route' },
      __lovableReportRuntimeError
    });

    reportLovableError(404);

    expect(__lovableReportRuntimeError).toHaveBeenCalledTimes(1);
    expect(__lovableReportRuntimeError).toHaveBeenCalledWith({
      message: '404',
      stack: undefined,
      filename: '/test-route',
    });
  });
});
