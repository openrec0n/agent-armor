// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { trackEvent } from '../src/web/analytics';

describe('trackEvent', () => {
  afterEach(() => {
    delete (window as any).goatcounter;
  });

  it('does not throw when goatcounter is undefined', () => {
    delete (window as any).goatcounter;
    expect(() => trackEvent('test-event')).not.toThrow();
  });

  it('calls goatcounter.count with correct args', () => {
    const mockCount = vi.fn();
    (window as any).goatcounter = { count: mockCount };

    trackEvent('config-copy', 'Config copied');

    expect(mockCount).toHaveBeenCalledWith({
      path: 'config-copy',
      title: 'Config copied',
      event: true,
    });
  });

  it('passes undefined title when not provided', () => {
    const mockCount = vi.fn();
    (window as any).goatcounter = { count: mockCount };

    trackEvent('config-download');

    expect(mockCount).toHaveBeenCalledWith({
      path: 'config-download',
      title: undefined,
      event: true,
    });
  });

  it('does not throw when count() throws', () => {
    (window as any).goatcounter = {
      count: () => {
        throw new Error('network failure');
      },
    };
    expect(() => trackEvent('test-event')).not.toThrow();
  });
});
