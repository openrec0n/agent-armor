import { generateCurrentSettings, getState } from '../app';
import { getTargetPath } from '../../core/engine';
import { THREATS } from '../../core/threats';
import { escapeHtml } from '../utils';

export function renderSettingsPreview(): void {
  const previewEl = document.getElementById('settings-preview');
  const statsEl = document.getElementById('output-stats');
  const warningsEl = document.getElementById('warnings-panel');
  const pathEl = document.getElementById('target-path');
  const summaryEl = document.getElementById('output-summary');
  if (!previewEl || !statsEl || !warningsEl || !pathEl) return;

  const state = getState();
  const result = generateCurrentSettings();

  // JSON preview with syntax highlighting
  previewEl.innerHTML = syntaxHighlight(JSON.stringify(result.finalSettings, null, 2));

  // Stats
  const appliedCount = result.appliedMitigations.length;
  const skippedCount = result.skippedMitigations.length;
  statsEl.innerHTML = `
    <span class="stat-applied">${appliedCount} applied</span>
    ${skippedCount > 0 ? `<span class="stat-skipped">&middot; ${skippedCount} skipped</span>` : ''}
  `;

  // Human-readable summary
  if (summaryEl) {
    const enabledThreatNames = [...state.enabledThreats]
      .map((id) => THREATS.find((t) => t.id === id)?.name)
      .filter(Boolean) as string[];

    if (enabledThreatNames.length > 0) {
      let summaryText: string;
      if (enabledThreatNames.length <= 2) {
        summaryText = `Your config protects against <strong>${enabledThreatNames.map((n) => escapeHtml(n)).join('</strong> and <strong>')}</strong>.`;
      } else {
        const first = enabledThreatNames.slice(0, 2).map((n) => escapeHtml(n));
        const remaining = enabledThreatNames.length - 2;
        summaryText = `Your config protects against <strong>${first.join('</strong>, <strong>')}</strong>, and ${remaining} more threat${remaining > 1 ? 's' : ''}.`;
      }

      if (skippedCount > 0) {
        summaryText += ` ${skippedCount} protection${skippedCount > 1 ? 's were' : ' was'} skipped (not available for the ${state.target} target).`;
      }

      summaryEl.innerHTML = `<div class="output-summary">${summaryText}</div>`;
    } else {
      summaryEl.innerHTML = '';
    }
  }

  // Warnings
  if (result.skippedMitigations.length > 0) {
    warningsEl.innerHTML = result.skippedMitigations
      .map(
        (s) =>
          `<div class="warning-item"><strong>${escapeHtml(s.label)}</strong> &mdash; ${escapeHtml(s.reason)}</div>`,
      )
      .join('');
  } else {
    warningsEl.innerHTML = '';
  }

  // Target path hint
  const targetPath = getTargetPath(state.target);
  const adminNote =
    state.target === 'managed'
      ? ' (requires admin/sudo to write)'
      : '';
  pathEl.textContent = `Save to: ${targetPath}${adminNote}`;
}

function syntaxHighlight(json: string): string {
  return json.replace(
    /("(?:\\.|[^"\\])*")\s*:/g,
    (_, key: string) => `<span class="json-key">${escapeHtml(key)}</span>:`,
  ).replace(
    /:\s*("(?:\\.|[^"\\])*")/g,
    (_, val: string) => `: <span class="json-string">${escapeHtml(val)}</span>`,
  ).replace(
    /:\s*(\d+)/g,
    ': <span class="json-number">$1</span>',
  ).replace(
    /:\s*(true|false)/g,
    ': <span class="json-boolean">$1</span>',
  ).replace(
    /:\s*(null)/g,
    ': <span class="json-null">$1</span>',
  ).replace(
    /([[\]{}])/g,
    '<span class="json-bracket">$1</span>',
  ).replace(
    // Also highlight string values inside arrays
    /(?<=\[[\s\S]*?)("(?:\\.|[^"\\])*")(?=[\s\S]*?\])/g,
    (_, val: string) => `<span class="json-string">${escapeHtml(val)}</span>`,
  );
}
