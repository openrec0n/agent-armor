import type { ClaudeCodeSettings, SettingsTarget } from './schema';
import type { ThreatId } from './threats';
import { getThreat } from './threats';
import { mergeSettings } from './merge';

export interface GenerationInput {
  enabledThreats: ThreatId[];
  target: SettingsTarget;
  allowedDomains?: string[];
  sandboxExcludedCommands?: string[];
  allowedMcpServerNames?: string[];
  deniedMcpServerNames?: string[];
  includeSchema?: boolean;
}

export interface SkippedMitigation {
  threatId: ThreatId;
  label: string;
  reason: string;
}

export interface GenerationResult {
  settings: ClaudeCodeSettings;
  appliedMitigations: string[];
  skippedMitigations: SkippedMitigation[];
}

/**
 * Generates a Claude Code settings.json from a set of enabled threats.
 *
 * For each enabled threat, iterates mitigations and deep-merges those
 * valid for the target level. Mitigations not valid for the target
 * (e.g., managed-only settings for a user target) are skipped with warnings.
 */
export function generate(input: GenerationInput): GenerationResult {
  let settings: ClaudeCodeSettings = {};
  const appliedMitigations: string[] = [];
  const skippedMitigations: SkippedMitigation[] = [];

  for (const threatId of input.enabledThreats) {
    const threat = getThreat(threatId);
    if (!threat) continue;

    for (const mitigation of threat.mitigations) {
      if (!mitigation.validTargets.includes(input.target)) {
        skippedMitigations.push({
          threatId,
          label: mitigation.label,
          reason: `Only valid for: ${mitigation.validTargets.join(', ')}`,
        });
        continue;
      }

      settings = mergeSettings(
        settings,
        mitigation.settingsFragment as ClaudeCodeSettings,
      );
      appliedMitigations.push(mitigation.label);
    }
  }

  // Apply user customizations
  if (input.allowedDomains?.length) {
    if (settings.sandbox?.network) {
      settings.sandbox.network.allowedDomains = input.allowedDomains;
    } else if (settings.sandbox) {
      settings.sandbox.network = { allowedDomains: input.allowedDomains };
    }
  }

  if (input.sandboxExcludedCommands?.length && settings.sandbox) {
    settings.sandbox.excludedCommands = [
      ...new Set([
        ...(settings.sandbox.excludedCommands || []),
        ...input.sandboxExcludedCommands,
      ]),
    ];
  }

  if (input.target === 'managed') {
    if (input.allowedMcpServerNames?.length) {
      settings.allowedMcpServers = input.allowedMcpServerNames.map((name) => ({
        serverName: name,
      }));
    }
    if (input.deniedMcpServerNames?.length) {
      settings.deniedMcpServers = input.deniedMcpServerNames.map((name) => ({
        serverName: name,
      }));
    }
  }

  // Safety net: deduplicate permission arrays.
  // mergeSettings() already deduplicates via Set, but this guards against
  // future changes to merge logic or manual array construction above.
  if (settings.permissions) {
    for (const key of ['allow', 'ask', 'deny'] as const) {
      const arr = settings.permissions[key];
      if (arr) {
        settings.permissions[key] = [...new Set(arr)];
      }
    }
  }

  if (input.includeSchema !== false) {
    settings.$schema = 'https://json.schemastore.org/claude-code-settings.json';
  }

  return { settings, appliedMitigations, skippedMitigations };
}

/**
 * Returns the file path where settings should be saved for the given target.
 */
export function getTargetPath(target: SettingsTarget): string {
  switch (target) {
    case 'user':
      return '~/.claude/settings.json';
    case 'project':
      return '.claude/settings.json';
    case 'local':
      return '.claude/settings.local.json';
    case 'managed': {
      const g = globalThis as Record<string, unknown>;
      const proc = g['process'] as { platform?: string } | undefined;
      const nav = g['navigator'] as { userAgent?: string } | undefined;
      const isMac = proc?.platform === 'darwin'
        ? true
        : nav !== undefined
          ? /Mac|iPhone|iPad/i.test(nav.userAgent ?? '')
          : false;
      return isMac
        ? '/Library/Application Support/ClaudeCode/managed-settings.json'
        : '/etc/claude-code/managed-settings.json';
    }
  }
}

/**
 * Provides human-readable info about each target.
 */
export function getTargetInfo(target: SettingsTarget): { label: string; description: string } {
  switch (target) {
    case 'user':
      return { label: 'User', description: 'Personal settings (~/.claude/settings.json)' };
    case 'project':
      return { label: 'Project', description: 'Shared with team via git (.claude/settings.json)' };
    case 'local':
      return { label: 'Local', description: 'Personal project overrides (.claude/settings.local.json)' };
    case 'managed':
      return { label: 'Managed', description: 'Enterprise system-level (requires admin)' };
  }
}

// Re-export for convenience
export { THREATS } from './threats';
export { PROFILES, getProfile } from './profiles';
export { mergeSettings } from './merge';
export type { ThreatId, ThreatDefinition, Severity } from './threats';
export type { ProfileId, ProfileDefinition } from './profiles';
export type { ClaudeCodeSettings, SettingsTarget } from './schema';
