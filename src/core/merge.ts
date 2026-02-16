import type { ClaudeCodeSettings } from './schema';

/**
 * Keys where arrays should be unioned (concatenated + deduplicated).
 * This preserves existing rules while adding new ones.
 */
const ARRAY_UNION_PATHS = new Set([
  'permissions.deny',
  'permissions.allow',
  'permissions.ask',
  'sandbox.excludedCommands',
]);

/**
 * Keys where arrays should be replaced entirely.
 * These are whitelists where the generated value is the intended state.
 */
const ARRAY_REPLACE_PATHS = new Set([
  'sandbox.network.allowedDomains',
  'sandbox.network.allowUnixSockets',
  'strictKnownMarketplaces',
  'allowedMcpServers',
  'deniedMcpServers',
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function deepMergeInternal(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  path: string,
): Record<string, unknown> {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    const fullPath = path ? `${path}.${key}` : key;
    const sourceVal = source[key];
    const targetVal = result[key];

    if (sourceVal === undefined) continue;

    if (Array.isArray(sourceVal)) {
      if (ARRAY_REPLACE_PATHS.has(fullPath)) {
        result[key] = [...sourceVal];
      } else if (ARRAY_UNION_PATHS.has(fullPath)) {
        const existing = Array.isArray(targetVal) ? targetVal : [];
        result[key] = [...new Set([...existing, ...sourceVal])];
      } else {
        // Default for unknown arrays: union via Set.
        // NOTE: Set uses reference equality, so this only deduplicates primitives
        // (strings, numbers). Arrays of objects must use ARRAY_REPLACE_PATHS.
        const existing = Array.isArray(targetVal) ? targetVal : [];
        result[key] = [...new Set([...existing, ...sourceVal])];
      }
    } else if (isPlainObject(sourceVal)) {
      result[key] = deepMergeInternal(
        isPlainObject(targetVal) ? (targetVal as Record<string, unknown>) : {},
        sourceVal as Record<string, unknown>,
        fullPath,
      );
    } else {
      // Scalar: source wins
      result[key] = sourceVal;
    }
  }

  return result;
}

/**
 * Deep merges generated security settings into an existing settings object.
 *
 * - Permission arrays (deny/allow/ask): union + deduplicate
 * - Whitelist arrays (allowedDomains, MCP servers): replace entirely
 * - Nested objects: recursive merge
 * - Scalars: source (generated) wins
 * - Non-security keys in existing: preserved untouched
 */
export function mergeSettings(
  existing: ClaudeCodeSettings,
  generated: ClaudeCodeSettings,
): ClaudeCodeSettings {
  return deepMergeInternal(
    existing as Record<string, unknown>,
    generated as Record<string, unknown>,
    '',
  ) as ClaudeCodeSettings;
}
