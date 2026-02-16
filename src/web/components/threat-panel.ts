import { getState, toggleThreat } from '../app';
import { THREATS } from '../../core/threats';
import type { ThreatId } from '../../core/threats';
import { escapeHtml } from '../utils';

export function renderThreatPanel(): void {
  const container = document.getElementById('threat-panel');
  if (!container) return;

  const state = getState();
  container.innerHTML = '';

  for (const threat of THREATS) {
    const isEnabled = state.enabledThreats.has(threat.id);
    const hasManagedOnly = threat.mitigations.some(
      (m) => m.validTargets.length === 1 && m.validTargets[0] === 'managed',
    );
    const allManagedOnly = threat.mitigations.every(
      (m) => m.validTargets.length === 1 && m.validTargets[0] === 'managed',
    );
    const isManagedDisabled = allManagedOnly && state.target !== 'managed';

    const card = document.createElement('div');
    card.className = `threat-card${isEnabled ? ' active' : ''}${isManagedDisabled ? ' managed-only-disabled' : ''}`;

    const severityClass = threat.severity === 'high' ? 'badge-high' : 'badge-medium';
    const managedBadge = hasManagedOnly
      ? `<span class="badge badge-managed">${allManagedOnly ? 'Managed only' : 'Has managed-only rules'}</span>`
      : '';

    const mitigationCount = threat.mitigations.filter((m) =>
      m.validTargets.includes(state.target),
    ).length;
    const totalMitigations = threat.mitigations.length;

    card.innerHTML = `
      <div class="threat-card-header">
        <div class="threat-card-title">
          ${escapeHtml(threat.name)}
          <span class="badge ${severityClass}">${threat.severity}</span>
          ${managedBadge}
        </div>
        <label class="toggle-switch" onclick="event.stopPropagation()">
          <input type="checkbox" ${isEnabled ? 'checked' : ''} ${isManagedDisabled ? 'disabled' : ''} data-threat-id="${escapeHtml(threat.id)}" />
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div class="threat-card-desc">${escapeHtml(threat.description)}</div>
      <div class="threat-card-meta">
        ${mitigationCount}/${totalMitigations} mitigations for ${state.target} target
        ${threat.references.length ? ' &middot; ' + threat.references.map((r) => escapeHtml(r)).join(', ') : ''}
      </div>
    `;

    const checkbox = card.querySelector('input[type="checkbox"]') as HTMLInputElement;
    checkbox.addEventListener('change', () => {
      if (!isManagedDisabled) {
        toggleThreat(threat.id as ThreatId);
      }
    });

    // Also toggle when clicking the card itself
    card.addEventListener('click', (e) => {
      if (
        !isManagedDisabled &&
        !(e.target as HTMLElement).closest('.toggle-switch')
      ) {
        toggleThreat(threat.id as ThreatId);
      }
    });

    container.appendChild(card);
  }
}
