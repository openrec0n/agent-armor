import { getState, setTarget } from '../app';
import type { SettingsTarget } from '../../core/schema';
import { getTargetPath } from '../../core/engine';
import { userIcon, folderIcon, laptopIcon, buildingIcon, alertTriangleIcon } from '../icons';

interface TargetOption {
  id: SettingsTarget;
  label: string;
  description: string;
  icon: (size?: number) => string;
}

const TARGETS: TargetOption[] = [
  { id: 'user', label: 'User', description: 'Your personal settings across all projects', icon: userIcon },
  { id: 'project', label: 'Project', description: 'Shared with your team via version control', icon: folderIcon },
  { id: 'local', label: 'Local', description: 'Personal overrides for this project only', icon: laptopIcon },
  { id: 'managed', label: 'Managed', description: 'Enterprise-wide admin policies', icon: buildingIcon },
];

export function renderTargetSelector(): void {
  const container = document.getElementById('target-selector');
  const warningContainer = document.getElementById('target-warning-container');
  if (!container) return;

  const state = getState();
  container.innerHTML = '';

  for (const t of TARGETS) {
    const isActive = t.id === state.target;
    const card = document.createElement('div');
    card.className = `select-card${isActive ? ' active' : ''}`;

    const pathHtml = isActive
      ? `<div class="card-path">${getTargetPath(t.id)}</div>`
      : '';

    card.innerHTML = `
      <div class="card-label">${t.icon(16)}${t.label}</div>
      <div class="card-desc">${t.description}</div>
      ${pathHtml}
    `;
    card.addEventListener('click', () => setTarget(t.id));
    container.appendChild(card);
  }

  // Managed target warning
  if (warningContainer) {
    if (state.target === 'managed') {
      warningContainer.innerHTML = `
        <div class="target-warning">
          ${alertTriangleIcon(16)}
          <span>Managed settings require admin/root privileges and are typically deployed in enterprise environments. This enables additional managed-only protections.</span>
        </div>
      `;
    } else {
      warningContainer.innerHTML = '';
    }
  }
}
