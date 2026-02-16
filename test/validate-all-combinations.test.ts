import { describe, it, expect } from 'vitest';
import { generate } from '../src/core/engine';
import { PROFILES } from '../src/core/profiles';
import { THREATS, type ThreatId } from '../src/core/threats';
import type { SettingsTarget } from '../src/core/schema';

// ──────────────────────────────────────────────────────────
// Ground-truth deny rules per threat (from threats.ts)
// ──────────────────────────────────────────────────────────
const DENY_RULES: Record<string, string[]> = {
  'data-exfiltration': [
    'Bash(curl *)',
    'Bash(wget *)',
    'Bash(nc *)',
    'Bash(ncat *)',
    'Bash(netcat *)',
    'Bash(nslookup *)',
    'Bash(dig *)',
    'Bash(host *)',
    'WebFetch',
  ],
  'secrets-theft': [
    'Read(./.env)',
    'Read(./.env.*)',
    'Read(./secrets/**)',
    'Read(./**/*.pem)',
    'Read(./**/*.key)',
    'Read(./**/credentials.json)',
    'Read(~/.ssh/**)',
    'Read(~/.aws/**)',
    'Read(~/.azure/**)',
    'Read(~/.gnupg/**)',
    'Read(~/.kube/**)',
    'Read(~/.docker/**)',
    'Read(~/.npmrc)',
    'Read(~/.pypirc)',
    'Read(~/.netrc)',
  ],
  'malicious-mcp': [],
  'privilege-escalation': [
    'Bash(sudo *)',
    'Bash(su *)',
    'Bash(su)',
    'Bash(chmod *)',
    'Bash(chown *)',
  ],
  'permission-bypass': [],
  'config-override': [],
  'destructive-ops': [
    'Bash(rm -rf *)',
    'Bash(rm -r *)',
    'Bash(rm -fr *)',
    'Bash(git push --force *)',
    'Bash(git push -f *)',
    'Bash(git reset --hard *)',
    'Bash(git clean -f *)',
  ],
  'sandbox-enforcement': [],
};

// ──────────────────────────────────────────────────────────
// Managed-only mitigations (4 total)
// ──────────────────────────────────────────────────────────
const MANAGED_ONLY_MITIGATIONS: { threatId: ThreatId; label: string }[] = [
  { threatId: 'permission-bypass', label: 'Disable bypass permissions mode' },
  { threatId: 'malicious-mcp', label: 'Lock down plugin marketplaces' },
  { threatId: 'config-override', label: 'Enforce managed permission rules only' },
  { threatId: 'config-override', label: 'Enforce managed hooks only' },
];

// ──────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────
const ALL_TARGETS: SettingsTarget[] = ['user', 'project', 'local', 'managed'];
const NON_MANAGED_TARGETS: SettingsTarget[] = ['user', 'project', 'local'];
const SCHEMA_URL = 'https://json.schemastore.org/claude-code-settings.json';

const VALID_TOP_LEVEL_KEYS = new Set([
  '$schema',
  'permissions',
  'sandbox',
  'allowManagedPermissionRulesOnly',
  'allowManagedHooksOnly',
  'strictKnownMarketplaces',
  'allowedMcpServers',
  'deniedMcpServers',
  'enableAllProjectMcpServers',
  'enabledMcpjsonServers',
  'disabledMcpjsonServers',
  'disableAllHooks',
]);

// ──────────────────────────────────────────────────────────
// Helper functions
// ──────────────────────────────────────────────────────────

/** Compute expected deny rules for a set of enabled threats (preserving order). */
function expectedDenyRules(threatIds: ThreatId[]): string[] {
  const rules: string[] = [];
  for (const id of threatIds) {
    rules.push(...(DENY_RULES[id] ?? []));
  }
  return [...new Set(rules)];
}

/** Count applicable vs skipped mitigations for a threat set + target. */
function countMitigations(
  threatIds: ThreatId[],
  target: SettingsTarget,
): { applied: number; skipped: number } {
  let applied = 0;
  let skipped = 0;
  for (const id of threatIds) {
    const threat = THREATS.find((t) => t.id === id);
    if (!threat) continue;
    for (const m of threat.mitigations) {
      if (m.validTargets.includes(target)) applied++;
      else skipped++;
    }
  }
  return { applied, skipped };
}

/** Get expected skipped labels for a threat set on a non-managed target. */
function expectedSkippedLabels(threatIds: ThreatId[]): string[] {
  return MANAGED_ONLY_MITIGATIONS.filter((m) => threatIds.includes(m.threatId)).map(
    (m) => m.label,
  );
}

// ══════════════════════════════════════════════════════════
// SECTION 1: Profile × Target Matrix (12 combinations)
// ══════════════════════════════════════════════════════════

describe('Profile × Target matrix (12 combinations)', () => {
  for (const profile of PROFILES) {
    for (const target of ALL_TARGETS) {
      describe(`${profile.id} + ${target}`, () => {
        const result = generate({
          enabledThreats: profile.enabledThreats,
          target,
        });
        const { settings } = result;
        const isManaged = target === 'managed';

        // ── Structural ──────────────────────────────────
        describe('structural', () => {
          it('output is JSON-serializable with no undefined values', () => {
            const json = JSON.stringify(settings);
            expect(json).toBeDefined();
            expect(json).not.toContain('undefined');
            const parsed = JSON.parse(json);
            expect(parsed).toEqual(settings);
          });

          it('$schema is present and correct', () => {
            expect(settings.$schema).toBe(SCHEMA_URL);
          });

          it('only contains valid top-level keys', () => {
            for (const key of Object.keys(settings)) {
              expect(VALID_TOP_LEVEL_KEYS.has(key)).toBe(true);
            }
          });

          it('all arrays contain no duplicates', () => {
            const deny = settings.permissions?.deny ?? [];
            expect(deny).toEqual([...new Set(deny)]);
            const allow = settings.permissions?.allow ?? [];
            expect(allow).toEqual([...new Set(allow)]);
            const ask = settings.permissions?.ask ?? [];
            expect(ask).toEqual([...new Set(ask)]);
            const excluded = settings.sandbox?.excludedCommands ?? [];
            expect(excluded).toEqual([...new Set(excluded)]);
          });
        });

        // ── Permission Rules ────────────────────────────
        describe('permission rules', () => {
          const expectedDeny = expectedDenyRules(profile.enabledThreats);

          it('deny array contains exactly the expected rules', () => {
            const actualDeny = settings.permissions?.deny ?? [];
            for (const rule of expectedDeny) {
              expect(actualDeny).toContain(rule);
            }
            expect(actualDeny).toHaveLength(expectedDeny.length);
          });

          it('deny rules from non-enabled threats are absent', () => {
            const allThreatIds = THREATS.map((t) => t.id);
            const disabledThreats = allThreatIds.filter(
              (id) => !profile.enabledThreats.includes(id),
            );
            const actualDeny = settings.permissions?.deny ?? [];
            for (const id of disabledThreats) {
              for (const rule of DENY_RULES[id] ?? []) {
                if (!expectedDeny.includes(rule)) {
                  expect(actualDeny).not.toContain(rule);
                }
              }
            }
          });

          it('no permissions.allow or permissions.ask arrays', () => {
            expect(settings.permissions?.allow).toBeUndefined();
            expect(settings.permissions?.ask).toBeUndefined();
          });

          it('deny rules are in threat-processing order', () => {
            const actualDeny = settings.permissions?.deny ?? [];
            expect(actualDeny).toEqual(expectedDeny);
          });
        });

        // ── Managed-Only Keys ───────────────────────────
        describe('managed-only keys', () => {
          if (!isManaged) {
            it('excludes all managed-only settings', () => {
              expect(settings.allowManagedPermissionRulesOnly).toBeUndefined();
              expect(settings.allowManagedHooksOnly).toBeUndefined();
              expect(settings.permissions?.disableBypassPermissionsMode).toBeUndefined();
              expect(settings.strictKnownMarketplaces).toBeUndefined();
            });
          } else {
            it('includes managed-only settings from enabled threats', () => {
              if (profile.enabledThreats.includes('permission-bypass')) {
                expect(settings.permissions?.disableBypassPermissionsMode).toBe('disable');
              }
              if (profile.enabledThreats.includes('config-override')) {
                expect(settings.allowManagedPermissionRulesOnly).toBe(true);
                expect(settings.allowManagedHooksOnly).toBe(true);
              }
              if (profile.enabledThreats.includes('malicious-mcp')) {
                expect(settings.strictKnownMarketplaces).toEqual([]);
              }
            });
          }
        });

        // ── Applied / Skipped ───────────────────────────
        describe('applied and skipped mitigations', () => {
          const counts = countMitigations(profile.enabledThreats, target);

          it(`has ${counts.applied} applied mitigations`, () => {
            expect(result.appliedMitigations).toHaveLength(counts.applied);
          });

          it(`has ${counts.skipped} skipped mitigations`, () => {
            expect(result.skippedMitigations).toHaveLength(counts.skipped);
          });

          it('every skipped mitigation has a non-empty reason', () => {
            for (const s of result.skippedMitigations) {
              expect(s.reason).toBeTruthy();
              expect(typeof s.reason).toBe('string');
              expect(s.reason.length).toBeGreaterThan(0);
            }
          });

          it('every skipped mitigation has a valid threatId from the enabled set', () => {
            const enabledSet = new Set(profile.enabledThreats);
            for (const s of result.skippedMitigations) {
              expect(enabledSet.has(s.threatId)).toBe(true);
            }
          });

          if (!isManaged) {
            it('skipped labels match expected managed-only labels', () => {
              const expected = expectedSkippedLabels(profile.enabledThreats);
              const actual = result.skippedMitigations.map((s) => s.label);
              expect(actual.sort()).toEqual(expected.sort());
            });
          } else {
            it('has zero skipped mitigations for managed target', () => {
              expect(result.skippedMitigations).toHaveLength(0);
            });
          }
        });

        // ── Sandbox ─────────────────────────────────────
        describe('sandbox settings', () => {
          const hasDataExfil = profile.enabledThreats.includes('data-exfiltration');
          const hasSandboxEnf = profile.enabledThreats.includes('sandbox-enforcement');
          const expectSandbox = hasDataExfil || hasSandboxEnf;

          if (!expectSandbox) {
            it('sandbox block is absent', () => {
              expect(settings.sandbox).toBeUndefined();
            });
          } else {
            it('sandbox is present and enabled', () => {
              expect(settings.sandbox).toBeDefined();
              expect(settings.sandbox!.enabled).toBe(true);
            });

            it('network lockdown fields are correct', () => {
              expect(settings.sandbox!.network?.allowedDomains).toEqual([]);
              expect(settings.sandbox!.network?.allowAllUnixSockets).toBe(false);
            });

            if (hasSandboxEnf) {
              it('includes full sandbox-enforcement config (superset)', () => {
                expect(settings.sandbox!.autoAllowBashIfSandboxed).toBe(false);
                expect(settings.sandbox!.allowUnsandboxedCommands).toBe(false);
                expect(settings.sandbox!.excludedCommands).toEqual([]);
                expect(settings.sandbox!.network?.allowLocalBinding).toBe(false);
                expect(settings.sandbox!.enableWeakerNestedSandbox).toBe(false);
              });
            }

            if (hasDataExfil && !hasSandboxEnf) {
              it('includes only partial sandbox config (data-exfiltration only)', () => {
                expect(settings.sandbox!.autoAllowBashIfSandboxed).toBeUndefined();
                expect(settings.sandbox!.allowUnsandboxedCommands).toBeUndefined();
                expect(settings.sandbox!.excludedCommands).toBeUndefined();
                expect(settings.sandbox!.enableWeakerNestedSandbox).toBeUndefined();
              });
            }
          }
        });

        // ── MCP ─────────────────────────────────────────
        describe('MCP settings', () => {
          const hasMaliciousMcp = profile.enabledThreats.includes('malicious-mcp');

          if (hasMaliciousMcp) {
            it('enableAllProjectMcpServers is false', () => {
              expect(settings.enableAllProjectMcpServers).toBe(false);
            });

            if (isManaged) {
              it('strictKnownMarketplaces is empty array (lockdown)', () => {
                expect(settings.strictKnownMarketplaces).toEqual([]);
              });
            } else {
              it('strictKnownMarketplaces is absent (non-managed)', () => {
                expect(settings.strictKnownMarketplaces).toBeUndefined();
              });
            }
          } else {
            it('enableAllProjectMcpServers is absent', () => {
              expect(settings.enableAllProjectMcpServers).toBeUndefined();
            });
          }

          it('no allowedMcpServers or deniedMcpServers (no custom names)', () => {
            expect(settings.allowedMcpServers).toBeUndefined();
            expect(settings.deniedMcpServers).toBeUndefined();
          });
        });
      });
    }
  }
});

// ══════════════════════════════════════════════════════════
// SECTION 2: Cross-Combination Consistency
// ══════════════════════════════════════════════════════════

describe('Cross-combination consistency', () => {
  for (const profile of PROFILES) {
    describe(`${profile.id} profile`, () => {
      const userResult = generate({ enabledThreats: profile.enabledThreats, target: 'user' });
      const projectResult = generate({
        enabledThreats: profile.enabledThreats,
        target: 'project',
      });
      const localResult = generate({ enabledThreats: profile.enabledThreats, target: 'local' });
      const managedResult = generate({
        enabledThreats: profile.enabledThreats,
        target: 'managed',
      });

      it('user, project, and local targets produce identical settings', () => {
        expect(userResult.settings).toEqual(projectResult.settings);
        expect(userResult.settings).toEqual(localResult.settings);
      });

      it('user, project, and local produce identical applied mitigations', () => {
        expect(userResult.appliedMitigations).toEqual(projectResult.appliedMitigations);
        expect(userResult.appliedMitigations).toEqual(localResult.appliedMitigations);
      });

      it('user, project, and local produce identical skipped mitigations', () => {
        expect(userResult.skippedMitigations).toEqual(projectResult.skippedMitigations);
        expect(userResult.skippedMitigations).toEqual(localResult.skippedMitigations);
      });

      it('managed target deny rules are a superset of non-managed', () => {
        const userDeny = userResult.settings.permissions?.deny ?? [];
        const managedDeny = managedResult.settings.permissions?.deny ?? [];
        for (const rule of userDeny) {
          expect(managedDeny).toContain(rule);
        }
        expect(managedDeny.length).toBeGreaterThanOrEqual(userDeny.length);
      });

      it('managed applied count >= non-managed applied count', () => {
        expect(managedResult.appliedMitigations.length).toBeGreaterThanOrEqual(
          userResult.appliedMitigations.length,
        );
      });

      it('managed skipped count <= non-managed skipped count', () => {
        expect(managedResult.skippedMitigations.length).toBeLessThanOrEqual(
          userResult.skippedMitigations.length,
        );
      });
    });
  }
});

// ══════════════════════════════════════════════════════════
// SECTION 3: Individual Threat × Target (32 combinations)
// ══════════════════════════════════════════════════════════

describe('Individual threat × target matrix (32 combinations)', () => {
  const allThreatIds = THREATS.map((t) => t.id);

  for (const threatId of allThreatIds) {
    for (const target of ALL_TARGETS) {
      describe(`${threatId} + ${target}`, () => {
        const result = generate({ enabledThreats: [threatId], target });
        const { settings } = result;
        const isManaged = target === 'managed';
        const threat = THREATS.find((t) => t.id === threatId)!;

        it('produces valid JSON-serializable output', () => {
          const json = JSON.stringify(settings);
          expect(json).not.toContain('undefined');
          expect(JSON.parse(json)).toEqual(settings);
        });

        it('has correct $schema', () => {
          expect(settings.$schema).toBe(SCHEMA_URL);
        });

        it('deny rules match exactly this threat only', () => {
          const expected = DENY_RULES[threatId] ?? [];
          const actual = settings.permissions?.deny ?? [];
          expect(actual).toEqual(expected);
        });

        it('no allow or ask arrays', () => {
          expect(settings.permissions?.allow).toBeUndefined();
          expect(settings.permissions?.ask).toBeUndefined();
        });

        it('applied + skipped equals total mitigations for this threat', () => {
          expect(result.appliedMitigations.length + result.skippedMitigations.length).toBe(
            threat.mitigations.length,
          );
        });

        it('applied mitigations are the ones valid for this target', () => {
          const expectedApplied = threat.mitigations
            .filter((m) => m.validTargets.includes(target))
            .map((m) => m.label);
          expect(result.appliedMitigations).toEqual(expectedApplied);
        });

        it('skipped mitigations are the ones NOT valid for this target', () => {
          const expectedSkipped = threat.mitigations
            .filter((m) => !m.validTargets.includes(target))
            .map((m) => m.label);
          const actualSkipped = result.skippedMitigations.map((s) => s.label);
          expect(actualSkipped).toEqual(expectedSkipped);
        });

        if (!isManaged) {
          it('no managed-only keys present', () => {
            expect(settings.allowManagedPermissionRulesOnly).toBeUndefined();
            expect(settings.allowManagedHooksOnly).toBeUndefined();
            expect(settings.strictKnownMarketplaces).toBeUndefined();
            expect(settings.permissions?.disableBypassPermissionsMode).toBeUndefined();
          });
        }
      });
    }
  }
});

// ══════════════════════════════════════════════════════════
// SECTION 4: Sandbox Merge Behavior
// ══════════════════════════════════════════════════════════

describe('Sandbox merge behavior', () => {
  it('data-exfiltration alone produces partial sandbox config', () => {
    const result = generate({ enabledThreats: ['data-exfiltration'], target: 'user' });
    const sandbox = result.settings.sandbox!;
    expect(sandbox.enabled).toBe(true);
    expect(sandbox.network?.allowedDomains).toEqual([]);
    expect(sandbox.network?.allowAllUnixSockets).toBe(false);
    // These should NOT exist (they come from sandbox-enforcement only)
    expect(sandbox.autoAllowBashIfSandboxed).toBeUndefined();
    expect(sandbox.allowUnsandboxedCommands).toBeUndefined();
    expect(sandbox.excludedCommands).toBeUndefined();
    expect(sandbox.network?.allowLocalBinding).toBeUndefined();
    expect(sandbox.enableWeakerNestedSandbox).toBeUndefined();
  });

  it('sandbox-enforcement alone produces full sandbox config', () => {
    const result = generate({ enabledThreats: ['sandbox-enforcement'], target: 'user' });
    const sandbox = result.settings.sandbox!;
    expect(sandbox.enabled).toBe(true);
    expect(sandbox.autoAllowBashIfSandboxed).toBe(false);
    expect(sandbox.allowUnsandboxedCommands).toBe(false);
    expect(sandbox.excludedCommands).toEqual([]);
    expect(sandbox.network?.allowedDomains).toEqual([]);
    expect(sandbox.network?.allowAllUnixSockets).toBe(false);
    expect(sandbox.network?.allowLocalBinding).toBe(false);
    expect(sandbox.enableWeakerNestedSandbox).toBe(false);
  });

  it('both threats merged produce sandbox-enforcement superset', () => {
    const result = generate({
      enabledThreats: ['data-exfiltration', 'sandbox-enforcement'],
      target: 'user',
    });
    const sandbox = result.settings.sandbox!;
    expect(sandbox.enabled).toBe(true);
    expect(sandbox.autoAllowBashIfSandboxed).toBe(false);
    expect(sandbox.allowUnsandboxedCommands).toBe(false);
    expect(sandbox.excludedCommands).toEqual([]);
    expect(sandbox.network?.allowedDomains).toEqual([]);
    expect(sandbox.network?.allowAllUnixSockets).toBe(false);
    expect(sandbox.network?.allowLocalBinding).toBe(false);
    expect(sandbox.enableWeakerNestedSandbox).toBe(false);
  });

  it('reversed order still produces sandbox-enforcement superset', () => {
    const result = generate({
      enabledThreats: ['sandbox-enforcement', 'data-exfiltration'],
      target: 'user',
    });
    const sandbox = result.settings.sandbox!;
    expect(sandbox.enabled).toBe(true);
    expect(sandbox.autoAllowBashIfSandboxed).toBe(false);
    expect(sandbox.allowUnsandboxedCommands).toBe(false);
    expect(sandbox.excludedCommands).toEqual([]);
    expect(sandbox.network?.allowedDomains).toEqual([]);
    expect(sandbox.network?.allowAllUnixSockets).toBe(false);
    expect(sandbox.network?.allowLocalBinding).toBe(false);
    expect(sandbox.enableWeakerNestedSandbox).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════
// SECTION 5: Edge Cases and Boundary Conditions
// ══════════════════════════════════════════════════════════

describe('Edge cases and boundary conditions', () => {
  it('empty enabledThreats produces only $schema', () => {
    const result = generate({ enabledThreats: [], target: 'user' });
    expect(result.appliedMitigations).toHaveLength(0);
    expect(result.skippedMitigations).toHaveLength(0);
    expect(Object.keys(result.settings)).toEqual(['$schema']);
  });

  it('empty enabledThreats with includeSchema=false produces empty object', () => {
    const result = generate({
      enabledThreats: [],
      target: 'user',
      includeSchema: false,
    });
    expect(Object.keys(result.settings)).toHaveLength(0);
  });

  it('unknown threat ID is silently ignored', () => {
    const result = generate({
      enabledThreats: ['nonexistent-threat' as ThreatId],
      target: 'user',
    });
    expect(result.appliedMitigations).toHaveLength(0);
    expect(result.skippedMitigations).toHaveLength(0);
  });

  it('duplicate threat IDs do not produce duplicate deny rules', () => {
    const result = generate({
      enabledThreats: ['privilege-escalation', 'privilege-escalation'],
      target: 'user',
    });
    const deny = result.settings.permissions?.deny ?? [];
    expect(deny).toEqual([...new Set(deny)]);
  });

  it('config-override on non-managed produces only $schema (all managed-only)', () => {
    const result = generate({
      enabledThreats: ['config-override'],
      target: 'user',
    });
    expect(result.appliedMitigations).toHaveLength(0);
    expect(result.skippedMitigations).toHaveLength(2);
    expect(Object.keys(result.settings)).toEqual(['$schema']);
  });

  it('config-override on managed produces managed-only keys', () => {
    const result = generate({
      enabledThreats: ['config-override'],
      target: 'managed',
    });
    expect(result.appliedMitigations).toHaveLength(2);
    expect(result.skippedMitigations).toHaveLength(0);
    expect(result.settings.allowManagedPermissionRulesOnly).toBe(true);
    expect(result.settings.allowManagedHooksOnly).toBe(true);
  });

  it('permission-bypass on non-managed produces only $schema', () => {
    const result = generate({
      enabledThreats: ['permission-bypass'],
      target: 'project',
    });
    expect(result.appliedMitigations).toHaveLength(0);
    expect(result.skippedMitigations).toHaveLength(1);
    expect(Object.keys(result.settings)).toEqual(['$schema']);
  });

  it('permission-bypass on managed produces disableBypassPermissionsMode', () => {
    const result = generate({
      enabledThreats: ['permission-bypass'],
      target: 'managed',
    });
    expect(result.appliedMitigations).toHaveLength(1);
    expect(result.settings.permissions?.disableBypassPermissionsMode).toBe('disable');
  });

  it('includeSchema=false omits $schema from output for all targets', () => {
    for (const target of ALL_TARGETS) {
      const result = generate({
        enabledThreats: ['privilege-escalation'],
        target,
        includeSchema: false,
      });
      expect(result.settings.$schema).toBeUndefined();
    }
  });

  it('MCP server names are only applied for managed target', () => {
    for (const target of NON_MANAGED_TARGETS) {
      const result = generate({
        enabledThreats: ['malicious-mcp'],
        target,
        allowedMcpServerNames: ['github'],
        deniedMcpServerNames: ['filesystem'],
      });
      expect(result.settings.allowedMcpServers).toBeUndefined();
      expect(result.settings.deniedMcpServers).toBeUndefined();
    }
  });

  it('MCP server names are applied for managed target', () => {
    const result = generate({
      enabledThreats: ['malicious-mcp'],
      target: 'managed',
      allowedMcpServerNames: ['github', 'memory'],
      deniedMcpServerNames: ['filesystem'],
    });
    expect(result.settings.allowedMcpServers).toEqual([
      { serverName: 'github' },
      { serverName: 'memory' },
    ]);
    expect(result.settings.deniedMcpServers).toEqual([{ serverName: 'filesystem' }]);
  });

  it('allowedDomains customization overrides sandbox network domains', () => {
    const result = generate({
      enabledThreats: ['data-exfiltration'],
      target: 'user',
      allowedDomains: ['github.com', 'npmjs.org'],
    });
    expect(result.settings.sandbox?.network?.allowedDomains).toEqual([
      'github.com',
      'npmjs.org',
    ]);
  });

  it('allowedDomains is ignored when no sandbox threat is enabled', () => {
    const result = generate({
      enabledThreats: ['privilege-escalation'],
      target: 'user',
      allowedDomains: ['github.com'],
    });
    expect(result.settings.sandbox).toBeUndefined();
  });

  it('sandboxExcludedCommands merges with existing empty array', () => {
    const result = generate({
      enabledThreats: ['sandbox-enforcement'],
      target: 'user',
      sandboxExcludedCommands: ['git', 'docker'],
    });
    expect(result.settings.sandbox?.excludedCommands).toContain('git');
    expect(result.settings.sandbox?.excludedCommands).toContain('docker');
  });

  it('sandboxExcludedCommands deduplicates', () => {
    const result = generate({
      enabledThreats: ['sandbox-enforcement'],
      target: 'user',
      sandboxExcludedCommands: ['git', 'git', 'docker'],
    });
    const excluded = result.settings.sandbox?.excludedCommands ?? [];
    expect(excluded).toEqual([...new Set(excluded)]);
  });
});

// ══════════════════════════════════════════════════════════
// SECTION 6: Data Integrity Checks
// ══════════════════════════════════════════════════════════

describe('Data integrity checks', () => {
  it('THREATS array has exactly 8 threats', () => {
    expect(THREATS).toHaveLength(8);
  });

  it('total mitigations across all threats is 14', () => {
    const total = THREATS.reduce((sum, t) => sum + t.mitigations.length, 0);
    expect(total).toBe(14);
  });

  it('exactly 4 mitigations are managed-only', () => {
    let managedOnlyCount = 0;
    for (const threat of THREATS) {
      for (const m of threat.mitigations) {
        if (m.validTargets.length === 1 && m.validTargets[0] === 'managed') {
          managedOnlyCount++;
        }
      }
    }
    expect(managedOnlyCount).toBe(4);
  });

  it('exactly 10 mitigations are ALL_TARGETS', () => {
    let allTargetCount = 0;
    for (const threat of THREATS) {
      for (const m of threat.mitigations) {
        if (m.validTargets.length === 4) {
          allTargetCount++;
        }
      }
    }
    expect(allTargetCount).toBe(10);
  });

  it('every mitigation has a non-empty label', () => {
    for (const threat of THREATS) {
      for (const m of threat.mitigations) {
        expect(m.label).toBeTruthy();
        expect(m.label.length).toBeGreaterThan(0);
      }
    }
  });

  it('every mitigation has a non-empty settingsFragment', () => {
    for (const threat of THREATS) {
      for (const m of threat.mitigations) {
        expect(Object.keys(m.settingsFragment).length).toBeGreaterThan(0);
      }
    }
  });

  it('every mitigation has at least one valid target', () => {
    for (const threat of THREATS) {
      for (const m of threat.mitigations) {
        expect(m.validTargets.length).toBeGreaterThan(0);
      }
    }
  });

  it('PROFILES has exactly 3 entries', () => {
    expect(PROFILES).toHaveLength(3);
  });

  it('lax profile has exactly 2 threats', () => {
    const lax = PROFILES.find((p) => p.id === 'lax')!;
    expect(lax.enabledThreats).toHaveLength(2);
  });

  it('moderate profile has exactly 5 threats', () => {
    const moderate = PROFILES.find((p) => p.id === 'moderate')!;
    expect(moderate.enabledThreats).toHaveLength(5);
  });

  it('strict profile has all 8 threats', () => {
    const strict = PROFILES.find((p) => p.id === 'strict')!;
    expect(strict.enabledThreats).toHaveLength(8);
    const allIds = new Set(THREATS.map((t) => t.id));
    for (const id of strict.enabledThreats) {
      expect(allIds.has(id)).toBe(true);
    }
  });

  it('every profile references only valid threat IDs', () => {
    const validIds = new Set(THREATS.map((t) => t.id));
    for (const profile of PROFILES) {
      for (const id of profile.enabledThreats) {
        expect(validIds.has(id)).toBe(true);
      }
    }
  });

  it('no two profiles have identical threat sets', () => {
    const serialized = PROFILES.map((p) => [...p.enabledThreats].sort().join(','));
    expect(new Set(serialized).size).toBe(serialized.length);
  });

  it('strict profile is a superset of moderate', () => {
    const strict = PROFILES.find((p) => p.id === 'strict')!;
    const moderate = PROFILES.find((p) => p.id === 'moderate')!;
    for (const id of moderate.enabledThreats) {
      expect(strict.enabledThreats).toContain(id);
    }
  });

  it('strict profile is a superset of lax', () => {
    const strict = PROFILES.find((p) => p.id === 'strict')!;
    const lax = PROFILES.find((p) => p.id === 'lax')!;
    for (const id of lax.enabledThreats) {
      expect(strict.enabledThreats).toContain(id);
    }
  });
});
