import { describe, it, expect } from 'vitest';
import { generate } from '../src/core/engine';
import { PROFILES } from '../src/core/profiles';
import { THREATS } from '../src/core/threats';

describe('generate', () => {
  describe('moderate profile for user target', () => {
    const result = generate({
      enabledThreats: PROFILES.find((p) => p.id === 'moderate')!.enabledThreats,
      target: 'user',
    });

    it('includes data exfiltration deny rules', () => {
      expect(result.settings.permissions?.deny).toContain('Bash(curl *)');
      expect(result.settings.permissions?.deny).toContain('Bash(wget *)');
      expect(result.settings.permissions?.deny).toContain('WebFetch');
    });

    it('includes secrets theft deny rules', () => {
      expect(result.settings.permissions?.deny).toContain('Read(./.env)');
      expect(result.settings.permissions?.deny).toContain('Read(~/.ssh/**)');
      expect(result.settings.permissions?.deny).toContain('Read(~/.aws/**)');
    });

    it('includes privilege escalation deny rules', () => {
      expect(result.settings.permissions?.deny).toContain('Bash(sudo *)');
      expect(result.settings.permissions?.deny).toContain('Bash(su *)');
      expect(result.settings.permissions?.deny).toContain('Bash(chmod *)');
    });

    it('does not include disableBypassPermissionsMode (managed-only)', () => {
      expect(result.settings.permissions?.disableBypassPermissionsMode).toBeUndefined();
    });

    it('includes destructive ops deny rules', () => {
      expect(result.settings.permissions?.deny).toContain('Bash(rm -rf *)');
      expect(result.settings.permissions?.deny).toContain('Bash(git push --force *)');
      expect(result.settings.permissions?.deny).toContain('Bash(git reset --hard *)');
    });

    it('skips permission-bypass mitigation (managed-only)', () => {
      const skipped = result.skippedMitigations.map((s) => s.label);
      expect(skipped).toContain('Disable bypass permissions mode');
    });

    it('does not include managed-only settings', () => {
      expect(result.settings.allowManagedPermissionRulesOnly).toBeUndefined();
      expect(result.settings.allowManagedHooksOnly).toBeUndefined();
    });

    it('includes $schema by default', () => {
      expect(result.settings.$schema).toBe(
        'https://json.schemastore.org/claude-code-settings.json',
      );
    });
  });

  describe('lax profile', () => {
    const result = generate({
      enabledThreats: PROFILES.find((p) => p.id === 'lax')!.enabledThreats,
      target: 'user',
    });

    it('does not include disableBypassPermissionsMode for user target (managed-only)', () => {
      expect(result.settings.permissions?.disableBypassPermissionsMode).toBeUndefined();
    });

    it('blocks privilege escalation', () => {
      expect(result.settings.permissions?.deny).toContain('Bash(sudo *)');
    });

    it('does NOT block curl', () => {
      expect(result.settings.permissions?.deny).not.toContain('Bash(curl *)');
    });

    it('does NOT block .env reads', () => {
      expect(result.settings.permissions?.deny).not.toContain('Read(./.env)');
    });

    it('skips permission-bypass mitigation (managed-only)', () => {
      const skipped = result.skippedMitigations.map((s) => s.label);
      expect(skipped).toContain('Disable bypass permissions mode');
    });
  });

  describe('strict profile for managed target', () => {
    const result = generate({
      enabledThreats: PROFILES.find((p) => p.id === 'strict')!.enabledThreats,
      target: 'managed',
    });

    it('includes all managed-only settings', () => {
      expect(result.settings.allowManagedPermissionRulesOnly).toBe(true);
      expect(result.settings.allowManagedHooksOnly).toBe(true);
    });

    it('includes sandbox enforcement', () => {
      expect(result.settings.sandbox?.enabled).toBe(true);
      expect(result.settings.sandbox?.allowUnsandboxedCommands).toBe(false);
    });

    it('disables project MCP servers', () => {
      expect(result.settings.enableAllProjectMcpServers).toBe(false);
    });

    it('locks down marketplaces', () => {
      expect(result.settings.strictKnownMarketplaces).toEqual([]);
    });

    it('has zero skipped mitigations', () => {
      expect(result.skippedMitigations).toHaveLength(0);
    });
  });

  describe('strict profile for user target (non-managed)', () => {
    const result = generate({
      enabledThreats: PROFILES.find((p) => p.id === 'strict')!.enabledThreats,
      target: 'user',
    });

    it('skips managed-only mitigations with warnings', () => {
      expect(result.skippedMitigations.length).toBeGreaterThan(0);
      const reasons = result.skippedMitigations.map((s) => s.reason);
      expect(reasons.every((r) => r.includes('managed'))).toBe(true);
    });

    it('does NOT include managed-only settings', () => {
      expect(result.settings.allowManagedPermissionRulesOnly).toBeUndefined();
      expect(result.settings.allowManagedHooksOnly).toBeUndefined();
      expect(result.settings.strictKnownMarketplaces).toBeUndefined();
    });

    it('still includes all non-managed mitigations', () => {
      expect(result.settings.permissions?.deny).toContain('Bash(curl *)');
      expect(result.settings.permissions?.deny).toContain('Read(./.env)');
      expect(result.settings.sandbox?.enabled).toBe(true);
    });
  });

  describe('config-override threat for user target', () => {
    const result = generate({
      enabledThreats: ['config-override'],
      target: 'user',
    });

    it('skips all mitigations (all are managed-only)', () => {
      expect(result.appliedMitigations).toHaveLength(0);
      expect(result.skippedMitigations).toHaveLength(2);
    });
  });

  describe('customizations', () => {
    it('applies allowed domains', () => {
      const result = generate({
        enabledThreats: ['sandbox-enforcement'],
        target: 'user',
        allowedDomains: ['github.com', 'npmjs.org'],
      });

      expect(result.settings.sandbox?.network?.allowedDomains).toEqual([
        'github.com',
        'npmjs.org',
      ]);
    });

    it('applies sandbox excluded commands', () => {
      const result = generate({
        enabledThreats: ['sandbox-enforcement'],
        target: 'user',
        sandboxExcludedCommands: ['git', 'docker'],
      });

      expect(result.settings.sandbox?.excludedCommands).toContain('git');
      expect(result.settings.sandbox?.excludedCommands).toContain('docker');
    });

    it('applies MCP server names only for managed target', () => {
      const managed = generate({
        enabledThreats: ['malicious-mcp'],
        target: 'managed',
        allowedMcpServerNames: ['github', 'memory'],
        deniedMcpServerNames: ['filesystem'],
      });

      expect(managed.settings.allowedMcpServers).toEqual([
        { serverName: 'github' },
        { serverName: 'memory' },
      ]);
      expect(managed.settings.deniedMcpServers).toEqual([
        { serverName: 'filesystem' },
      ]);

      const user = generate({
        enabledThreats: ['malicious-mcp'],
        target: 'user',
        allowedMcpServerNames: ['github'],
      });

      expect(user.settings.allowedMcpServers).toBeUndefined();
    });

    it('can exclude $schema', () => {
      const result = generate({
        enabledThreats: ['privilege-escalation'],
        target: 'user',
        includeSchema: false,
      });

      expect(result.settings.$schema).toBeUndefined();
    });
  });

  describe('deduplication', () => {
    it('does not produce duplicate deny rules', () => {
      // data-exfiltration and sandbox-enforcement both set sandbox.enabled
      const result = generate({
        enabledThreats: ['data-exfiltration', 'sandbox-enforcement'],
        target: 'user',
      });

      const deny = result.settings.permissions?.deny ?? [];
      const uniqueDeny = [...new Set(deny)];
      expect(deny).toEqual(uniqueDeny);
    });
  });

  describe('edge cases', () => {
    it('handles empty enabledThreats array', () => {
      const result = generate({ enabledThreats: [], target: 'user' });
      expect(result.appliedMitigations).toHaveLength(0);
      expect(result.skippedMitigations).toHaveLength(0);
      expect(Object.keys(result.settings)).toEqual(['$schema']);
    });

    it('handles unknown threat ID gracefully', () => {
      const result = generate({
        enabledThreats: ['nonexistent-threat' as any],
        target: 'user',
      });
      expect(result.appliedMitigations).toHaveLength(0);
    });

    it('applies allowedDomains when data-exfiltration creates sandbox.network', () => {
      const result = generate({
        enabledThreats: ['data-exfiltration'],
        target: 'user',
        allowedDomains: ['github.com'],
      });
      expect(result.settings.sandbox?.network?.allowedDomains).toEqual(['github.com']);
    });

    it('ignores allowedDomains when no sandbox threat is enabled', () => {
      const result = generate({
        enabledThreats: ['privilege-escalation'],
        target: 'user',
        allowedDomains: ['github.com'],
      });
      expect(result.settings.sandbox).toBeUndefined();
    });
  });

  describe('all threats covered', () => {
    it('every THREAT has at least one mitigation', () => {
      for (const threat of THREATS) {
        expect(threat.mitigations.length).toBeGreaterThan(0);
      }
    });

    it('every profile references valid threat IDs', () => {
      const validIds = new Set(THREATS.map((t) => t.id));
      for (const profile of PROFILES) {
        for (const id of profile.enabledThreats) {
          expect(validIds.has(id)).toBe(true);
        }
      }
    });

    it('no two profiles have identical threat sets', () => {
      const serialized = PROFILES.map((p) =>
        [...p.enabledThreats].sort().join(','),
      );
      const unique = new Set(serialized);
      expect(unique.size).toBe(serialized.length);
    });
  });
});
