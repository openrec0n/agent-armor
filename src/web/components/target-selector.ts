import { getState, setTarget } from '../app';
import type { SettingsTarget } from '../../core/schema';

interface TargetOption {
  id: SettingsTarget;
  label: string;
  description: string;
}

const TARGETS: TargetOption[] = [
  { id: 'user', label: 'User', description: '~/.claude/settings.json' },
  { id: 'project', label: 'Project', description: '.claude/settings.json' },
  { id: 'local', label: 'Local', description: '.claude/settings.local.json' },
  { id: 'managed', label: 'Managed', description: 'System-level (admin)' },
];

export function renderTargetSelector(): void {
  const container = document.getElementById('target-selector');
  if (!container) return;

  const state = getState();
  container.innerHTML = '';

  for (const t of TARGETS) {
    const card = document.createElement('div');
    card.className = `select-card${t.id === state.target ? ' active' : ''}`;
    card.innerHTML = `
      <div class="card-label">${t.label}</div>
      <div class="card-desc">${t.description}</div>
    `;
    card.addEventListener('click', () => setTarget(t.id));
    container.appendChild(card);
  }
}
