import { getState, toggleThreat } from '../app';
import { THREATS } from '../../core/threats';
import type { ThreatId } from '../../core/threats';
import { escapeHtml } from '../utils';
import { checkIcon, xIcon, lockIcon } from '../icons';

// Local UI state: track which cards are expanded (not in AppState)
const expandedCards = new Set<ThreatId>();

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
    const isExpanded = expandedCards.has(threat.id);

    const card = document.createElement('div');
    const classes = [
      'threat-card',
      isEnabled ? 'active' : '',
      isManagedDisabled ? 'managed-only-disabled' : '',
      `severity-${threat.severity}`,
      isExpanded ? 'expanded' : '',
    ].filter(Boolean).join(' ');
    card.className = classes;

    const severityClass = threat.severity === 'high' ? 'badge-high' : 'badge-medium';
    const managedBadge = hasManagedOnly
      ? `<span class="badge badge-managed">${lockIcon(12)}${allManagedOnly ? 'Managed only' : 'Has managed-only rules'}</span>`
      : '';

    const mitigationCount = threat.mitigations.filter((m) =>
      m.validTargets.includes(state.target),
    ).length;
    const totalMitigations = threat.mitigations.length;

    // Build expandable details
    const mitigationListHtml = threat.mitigations.map((m) => {
      const applies = m.validTargets.includes(state.target);
      const cls = applies ? 'mitigation-applied' : 'mitigation-skipped';
      const icon = applies ? checkIcon(14) : xIcon(14);
      return `<li class="${cls}">${icon} ${escapeHtml(m.label)}</li>`;
    }).join('');

    const detailsHtml = isExpanded
      ? `<div class="threat-details">
          <ul class="threat-details-list">${mitigationListHtml}</ul>
        </div>`
      : '';

    const toggleLabel = isExpanded ? 'Hide rules' : 'Show rules';

    card.innerHTML = `
      <div class="threat-card-header">
        <div class="threat-card-title">
          ${escapeHtml(threat.name)}
          <span class="badge ${severityClass}">${threat.severity}</span>
          ${managedBadge}
        </div>
        <label class="toggle-switch">
          <input type="checkbox" ${isEnabled ? 'checked' : ''} ${isManagedDisabled ? 'disabled' : ''} data-threat-id="${escapeHtml(threat.id)}" />
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div class="threat-card-desc">${escapeHtml(threat.description)}</div>
      <div class="threat-card-meta">
        ${mitigationCount} of ${totalMitigations} protections for ${state.target}
        ${threat.references.length ? ' &middot; ' + threat.references.map((r) => escapeHtml(r)).join(', ') : ''}
      </div>
      <button type="button" class="threat-details-toggle" data-threat-details="${escapeHtml(threat.id)}">
        ${toggleLabel} &rarr;
      </button>
      ${detailsHtml}
    `;

    // Prevent toggle switch and details button clicks from bubbling to card
    const toggleSwitch = card.querySelector('.toggle-switch') as HTMLElement | null;
    toggleSwitch?.addEventListener('click', (e) => e.stopPropagation());

    const checkbox = card.querySelector('input[type="checkbox"]') as HTMLInputElement;
    checkbox.addEventListener('change', () => {
      if (!isManagedDisabled) {
        toggleThreat(threat.id as ThreatId);
        // Add pulse animation
        card.classList.add('just-toggled');
        setTimeout(() => card.classList.remove('just-toggled'), 400);
      }
    });

    // Toggle card on click
    card.addEventListener('click', (e) => {
      if (
        !isManagedDisabled &&
        !(e.target as HTMLElement).closest('.toggle-switch') &&
        !(e.target as HTMLElement).closest('.threat-details-toggle')
      ) {
        toggleThreat(threat.id as ThreatId);
        card.classList.add('just-toggled');
        setTimeout(() => card.classList.remove('just-toggled'), 400);
      }
    });

    // Expand details toggle
    const detailsBtn = card.querySelector('[data-threat-details]') as HTMLButtonElement | null;
    if (detailsBtn) {
      detailsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (expandedCards.has(threat.id)) {
          expandedCards.delete(threat.id);
        } else {
          expandedCards.add(threat.id);
        }
        // Re-render just this component
        renderThreatPanel();
      });
    }

    container.appendChild(card);
  }
}
