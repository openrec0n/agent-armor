import { getState, setProfile } from '../app';
import { PROFILES } from '../../core/profiles';
import type { ProfileId } from '../../core/profiles';

interface ProfileOption {
  id: ProfileId;
  label: string;
  description: string;
  badge?: string;
}

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
    description: 'Pick individual threats.',
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
    card.innerHTML = `
      <div class="card-label">${p.label}${badgeHtml}</div>
      <div class="card-desc">${p.description}</div>
    `;
    card.addEventListener('click', () => setProfile(p.id));
    container.appendChild(card);
  }
}
