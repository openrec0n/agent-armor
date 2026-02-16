import { describe, it, expect } from 'vitest';
import { getTargetPath, getTargetInfo } from '../src/core/engine';
import { getThreat, THREATS } from '../src/core/threats';
import { getProfile, PROFILES } from '../src/core/profiles';
import { escapeHtml } from '../src/web/utils';

describe('getTargetPath', () => {
  it('returns user settings path', () => {
    expect(getTargetPath('user')).toBe('~/.claude/settings.json');
  });

  it('returns project settings path', () => {
    expect(getTargetPath('project')).toBe('.claude/settings.json');
  });

  it('returns local settings path', () => {
    expect(getTargetPath('local')).toBe('.claude/settings.local.json');
  });

  it('returns managed path based on current platform', () => {
    const g = globalThis as Record<string, unknown>;
    const proc = g['process'] as { platform?: string } | undefined;
    const expected = proc?.platform === 'darwin'
      ? '/Library/Application Support/ClaudeCode/managed-settings.json'
      : '/etc/claude-code/managed-settings.json';
    expect(getTargetPath('managed')).toBe(expected);
  });
});

describe('getTargetInfo', () => {
  it('returns label and description for each target', () => {
    for (const target of ['user', 'project', 'local', 'managed'] as const) {
      const info = getTargetInfo(target);
      expect(info.label).toBeTruthy();
      expect(info.description).toBeTruthy();
    }
  });
});

describe('getThreat', () => {
  it('returns threat by valid ID', () => {
    const threat = getThreat('data-exfiltration');
    expect(threat).toBeDefined();
    expect(threat!.id).toBe('data-exfiltration');
  });

  it('returns undefined for invalid ID', () => {
    expect(getThreat('nonexistent' as any)).toBeUndefined();
  });

  it('all threat IDs in THREATS are retrievable', () => {
    for (const t of THREATS) {
      expect(getThreat(t.id)).toBe(t);
    }
  });
});

describe('getProfile', () => {
  it('returns profile by valid ID', () => {
    const profile = getProfile('moderate');
    expect(profile).toBeDefined();
    expect(profile!.id).toBe('moderate');
  });

  it('returns undefined for custom', () => {
    expect(getProfile('custom')).toBeUndefined();
  });

  it('returns undefined for invalid ID', () => {
    expect(getProfile('nonexistent' as any)).toBeUndefined();
  });

  it('all profile IDs in PROFILES are retrievable', () => {
    for (const p of PROFILES) {
      expect(getProfile(p.id)).toBe(p);
    }
  });
});

describe('escapeHtml', () => {
  it('escapes angle brackets', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
    );
  });

  it('escapes ampersands', () => {
    expect(escapeHtml('a&b')).toBe('a&amp;b');
  });

  it('escapes double quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
  });

  it('returns safe strings unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
    expect(escapeHtml('Bash(curl *)')).toBe('Bash(curl *)');
  });

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('');
  });
});
