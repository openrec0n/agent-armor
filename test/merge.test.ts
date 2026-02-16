import { describe, it, expect } from 'vitest';
import { mergeSettings } from '../src/core/merge';
import type { ClaudeCodeSettings } from '../src/core/schema';

describe('mergeSettings', () => {
  it('merges into an empty object', () => {
    const generated: ClaudeCodeSettings = {
      permissions: { deny: ['Bash(curl *)'] },
    };

    const result = mergeSettings({}, generated);
    expect(result.permissions?.deny).toEqual(['Bash(curl *)']);
  });

  it('preserves non-security keys from existing config', () => {
    const existing: ClaudeCodeSettings = {
      model: 'claude-sonnet-4-5-20250929',
      env: { FOO: 'bar' },
    };
    const generated: ClaudeCodeSettings = {
      permissions: { deny: ['Bash(curl *)'] },
    };

    const result = mergeSettings(existing, generated);
    expect(result.model).toBe('claude-sonnet-4-5-20250929');
    expect(result.env).toEqual({ FOO: 'bar' });
    expect(result.permissions?.deny).toEqual(['Bash(curl *)']);
  });

  it('unions deny arrays without duplicates', () => {
    const existing: ClaudeCodeSettings = {
      permissions: { deny: ['Bash(rm -rf *)', 'Bash(curl *)'] },
    };
    const generated: ClaudeCodeSettings = {
      permissions: { deny: ['Bash(curl *)', 'Bash(wget *)'] },
    };

    const result = mergeSettings(existing, generated);
    expect(result.permissions?.deny).toEqual([
      'Bash(rm -rf *)',
      'Bash(curl *)',
      'Bash(wget *)',
    ]);
  });

  it('unions allow arrays', () => {
    const existing: ClaudeCodeSettings = {
      permissions: { allow: ['Bash(npm run *)'] },
    };
    const generated: ClaudeCodeSettings = {
      permissions: { allow: ['Bash(git commit *)'] },
    };

    const result = mergeSettings(existing, generated);
    expect(result.permissions?.allow).toEqual([
      'Bash(npm run *)',
      'Bash(git commit *)',
    ]);
  });

  it('replaces sandbox.network.allowedDomains (whitelist semantics)', () => {
    const existing: ClaudeCodeSettings = {
      sandbox: {
        network: { allowedDomains: ['example.com', 'old.com'] },
      },
    };
    const generated: ClaudeCodeSettings = {
      sandbox: {
        network: { allowedDomains: ['github.com'] },
      },
    };

    const result = mergeSettings(existing, generated);
    expect(result.sandbox?.network?.allowedDomains).toEqual(['github.com']);
  });

  it('replaces strictKnownMarketplaces (empty = lockdown)', () => {
    const existing: ClaudeCodeSettings = {
      strictKnownMarketplaces: [{ source: 'github', repo: 'old/plugins' }],
    };
    const generated: ClaudeCodeSettings = {
      strictKnownMarketplaces: [],
    };

    const result = mergeSettings(existing, generated);
    expect(result.strictKnownMarketplaces).toEqual([]);
  });

  it('overwrites scalar values (source wins)', () => {
    const existing: ClaudeCodeSettings = {
      permissions: { disableBypassPermissionsMode: undefined },
    };
    const generated: ClaudeCodeSettings = {
      permissions: { disableBypassPermissionsMode: 'disable' },
    };

    const result = mergeSettings(existing, generated);
    expect(result.permissions?.disableBypassPermissionsMode).toBe('disable');
  });

  it('recursively merges nested objects', () => {
    const existing: ClaudeCodeSettings = {
      sandbox: {
        enabled: true,
        network: { allowLocalBinding: true },
      },
    };
    const generated: ClaudeCodeSettings = {
      sandbox: {
        network: {
          allowAllUnixSockets: false,
          allowedDomains: [],
        },
      },
    };

    const result = mergeSettings(existing, generated);
    expect(result.sandbox?.enabled).toBe(true); // preserved
    expect(result.sandbox?.network?.allowLocalBinding).toBe(true); // preserved
    expect(result.sandbox?.network?.allowAllUnixSockets).toBe(false); // added
    expect(result.sandbox?.network?.allowedDomains).toEqual([]); // replaced
  });

  it('preserves null values from generated settings', () => {
    const existing: ClaudeCodeSettings = {
      sandbox: {
        network: { httpProxyPort: 8080 },
      },
    };
    const generated: ClaudeCodeSettings = {
      sandbox: {
        network: { httpProxyPort: null },
      },
    };

    const result = mergeSettings(existing, generated);
    expect(result.sandbox?.network?.httpProxyPort).toBeNull();
  });

  it('handles merging when existing has no permissions', () => {
    const existing: ClaudeCodeSettings = {
      model: 'claude-sonnet-4-5-20250929',
    };
    const generated: ClaudeCodeSettings = {
      permissions: {
        deny: ['Bash(sudo *)', 'Read(./.env)'],
        disableBypassPermissionsMode: 'disable',
      },
    };

    const result = mergeSettings(existing, generated);
    expect(result.model).toBe('claude-sonnet-4-5-20250929');
    expect(result.permissions?.deny).toEqual(['Bash(sudo *)', 'Read(./.env)']);
    expect(result.permissions?.disableBypassPermissionsMode).toBe('disable');
  });
});
