import { getState, setProfile } from '../app';
import { PROFILES } from '../../core/profiles';
import { THREATS } from '../../core/threats';
import type { ProfileId } from '../../core/profiles';

interface ProfileOption {
  id: ProfileId;
  label: string;
  description: string;
  badge?: string;
}

const THREAT_SHORT_NAMES: Record<string, string> = {
  'data-exfiltration': 'Exfil',
  'secrets-theft': 'Secrets',
  'malicious-mcp': 'MCP',
  'privilege-escalation': 'Priv Esc',
  'permission-bypass': 'Bypass',
  'config-override': 'Config',
  'destructive-ops': 'Destruct',
  'sandbox-enforcement': 'Sandbox',
};

const PROFILE_OPTIONS: ProfileOption[] = [
  ...PROFILES.map((p) => ({
    id: p.id,
    label: p.name,
    description: p.description,
    badge: p.id === 'moderate' ? 'Recommended' : undefined,
  })),
  {
    id: 'custom' as ProfileId,
    label: 'Custom',
    description: 'Pick individual protections.',
  },
];

export function renderProfileSelector(): void {
  const container = document.getElementById('profile-selector');
  if (!container) return;

  const state = getState();
  container.innerHTML = '';

  for (const p of PROFILE_OPTIONS) {
    const card = document.createElement('div');
    card.className = `select-card${p.id === state.profile ? ' active' : ''}`;
    const badgeHtml = p.badge
      ? `<span class="card-badge badge-recommended">${p.badge}</span>`
      : '';

    // Build threat pills for non-custom profiles
    let threatPillsHtml = '';
    let countHtml = '';

    if (p.id !== 'custom') {
      const profileDef = PROFILES.find((pr) => pr.id === p.id);
      if (profileDef) {
        const enabledSet = new Set(profileDef.enabledThreats);
        const pills = THREATS.map((t) => {
          const shortName = THREAT_SHORT_NAMES[t.id] || t.id;
          const isActive = enabledSet.has(t.id);
          const cls = isActive ? 'threat-pill threat-pill-active' : 'threat-pill threat-pill-inactive';
          return `<span class="${cls}">${shortName}</span>`;
        }).join('');
        threatPillsHtml = `<div class="profile-threats">${pills}</div>`;
        countHtml = `<div class="profile-count">${enabledSet.size} of ${THREATS.length} protections</div>`;
      }
    } else {
      // Custom: show current count
      const currentCount = state.enabledThreats.size;
      countHtml = `<div class="profile-count">${currentCount} of ${THREATS.length} protections selected</div>`;
    }

    card.innerHTML = `
      <div class="card-label">${p.label}${badgeHtml}</div>
      <div class="card-desc">${p.description}</div>
      ${threatPillsHtml}
      ${countHtml}
    `;
    card.addEventListener('click', () => setProfile(p.id));
    container.appendChild(card);
  }
}
