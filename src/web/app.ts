import { generate, mergeSettings } from '../core/engine';
import { PROFILES } from '../core/profiles';
import type { ThreatId } from '../core/threats';
import type { ProfileId } from '../core/profiles';
import type { SettingsTarget, ClaudeCodeSettings } from '../core/schema';
import { renderTargetSelector } from './components/target-selector';
import { renderProfileSelector } from './components/profile-selector';
import { renderThreatPanel } from './components/threat-panel';
import { renderCustomizationPanel } from './components/customization-panel';
import { renderSettingsPreview } from './components/settings-preview';
import { renderExportPanel } from './components/export-panel';

// ---- App State ----

export interface AppState {
  target: SettingsTarget;
  profile: ProfileId;
  enabledThreats: Set<ThreatId>;
  allowedDomains: string[];
  sandboxExcludedCommands: string[];
  allowedMcpServerNames: string[];
  deniedMcpServerNames: string[];
  mergeEnabled: boolean;
  existingConfig: string;
}

export type ReadonlyAppState = Readonly<Omit<AppState, 'enabledThreats'>> & {
  readonly enabledThreats: ReadonlySet<ThreatId>;
};

const state: AppState = {
  target: 'user',
  profile: 'moderate',
  enabledThreats: new Set(PROFILES.find((p) => p.id === 'moderate')!.enabledThreats),
  allowedDomains: [],
  sandboxExcludedCommands: [],
  allowedMcpServerNames: [],
  deniedMcpServerNames: [],
  mergeEnabled: false,
  existingConfig: '',
};

// ---- State accessors ----

export function getState(): ReadonlyAppState {
  return state;
}

export function setTarget(target: SettingsTarget): void {
  state.target = target;
  update();
}

export function setProfile(profile: ProfileId): void {
  state.profile = profile;
  if (profile !== 'custom') {
    const def = PROFILES.find((p) => p.id === profile);
    if (def) {
      state.enabledThreats = new Set(def.enabledThreats);
    }
  }
  update();
}

export function toggleThreat(id: ThreatId): void {
  if (state.enabledThreats.has(id)) {
    state.enabledThreats.delete(id);
  } else {
    state.enabledThreats.add(id);
  }
  // Switching to custom when user manually toggles
  state.profile = detectProfile();
  update();
}

export function setAllowedDomains(domains: string[]): void {
  state.allowedDomains = domains;
  update();
}

export function setSandboxExcludedCommands(cmds: string[]): void {
  state.sandboxExcludedCommands = cmds;
  update();
}

export function setAllowedMcpServers(names: string[]): void {
  state.allowedMcpServerNames = names;
  update();
}

export function setDeniedMcpServers(names: string[]): void {
  state.deniedMcpServerNames = names;
  update();
}

export function setMergeEnabled(enabled: boolean): void {
  state.mergeEnabled = enabled;
  update();
}

export function setExistingConfig(json: string): void {
  state.existingConfig = json;
  if (state.mergeEnabled) update();
}

// ---- Helpers ----

function detectProfile(): ProfileId {
  const enabled = state.enabledThreats;
  for (const profile of PROFILES) {
    const profileSet = new Set(profile.enabledThreats);
    if (
      profileSet.size === enabled.size &&
      [...profileSet].every((id) => enabled.has(id))
    ) {
      return profile.id;
    }
  }
  return 'custom';
}

export function generateCurrentSettings(): ReturnType<typeof generate> & { finalSettings: ClaudeCodeSettings } {
  const result = generate({
    enabledThreats: [...state.enabledThreats],
    target: state.target,
    allowedDomains: state.allowedDomains.length ? state.allowedDomains : undefined,
    sandboxExcludedCommands: state.sandboxExcludedCommands.length
      ? state.sandboxExcludedCommands
      : undefined,
    allowedMcpServerNames: state.allowedMcpServerNames.length
      ? state.allowedMcpServerNames
      : undefined,
    deniedMcpServerNames: state.deniedMcpServerNames.length
      ? state.deniedMcpServerNames
      : undefined,
  });

  let finalSettings = result.settings;

  if (state.mergeEnabled && state.existingConfig.trim()) {
    try {
      const existing = JSON.parse(state.existingConfig) as ClaudeCodeSettings;
      finalSettings = mergeSettings(existing, result.settings);
    } catch {
      // Invalid JSON - just use generated settings
    }
  }

  return { ...result, finalSettings };
}

// ---- Render ----

function update(): void {
  renderTargetSelector();
  renderProfileSelector();
  renderThreatPanel();
  renderCustomizationPanel();
  renderSettingsPreview();
  renderExportPanel();
}

// ---- Init ----

function init(): void {
  // Setup collapsible toggles
  setupCollapsible('customization-toggle', 'customization-section');
  setupCollapsible('merge-toggle', 'merge-section');

  // Setup merge textarea
  const textarea = document.getElementById('existing-config') as HTMLTextAreaElement | null;
  textarea?.addEventListener('input', () => {
    setExistingConfig(textarea.value);
  });

  const mergeCheckbox = document.getElementById('merge-enabled') as HTMLInputElement | null;
  mergeCheckbox?.addEventListener('change', () => {
    setMergeEnabled(mergeCheckbox.checked);
  });

  // Initial render
  update();
}

function setupCollapsible(toggleId: string, sectionId: string): void {
  const toggle = document.getElementById(toggleId);
  const section = document.getElementById(sectionId);
  if (!toggle || !section) return;

  toggle.addEventListener('click', () => {
    section.classList.toggle('open');
  });
}

document.addEventListener('DOMContentLoaded', init);
