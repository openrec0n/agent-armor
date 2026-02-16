import {
  getState,
  setAllowedDomains,
  setSandboxExcludedCommands,
  setAllowedMcpServers,
  setDeniedMcpServers,
} from '../app';
import { escapeHtml } from '../utils';
import { xIcon } from '../icons';

const DOMAIN_SUGGESTIONS = ['github.com', 'npmjs.org', 'pypi.org', 'registry.npmjs.org'];
const COMMAND_SUGGESTIONS = ['git', 'docker', 'npm', 'node'];
const MCP_ALLOW_SUGGESTIONS = ['github', 'memory', 'filesystem'];
const MCP_DENY_SUGGESTIONS = ['filesystem', 'shell'];

export function renderCustomizationPanel(): void {
  const container = document.getElementById('customization-panel');
  if (!container) return;

  const state = getState();
  const showSandbox =
    state.enabledThreats.has('sandbox-enforcement') ||
    state.enabledThreats.has('data-exfiltration');
  const showMcp =
    state.enabledThreats.has('malicious-mcp') && state.target === 'managed';

  if (!showSandbox && !showMcp) {
    container.innerHTML =
      '<p class="section-desc">Enable sandbox or MCP protections to see customization options.</p>';
    return;
  }

  let html = '';

  if (showSandbox) {
    html += renderTagField(
      'allowed-domains',
      'Allowed Domains',
      'Domains that sandbox will allow network access to',
      state.allowedDomains,
      'e.g. github.com',
      DOMAIN_SUGGESTIONS,
    );

    html += renderTagField(
      'excluded-commands',
      'Sandbox Excluded Commands',
      'Commands that run outside the sandbox',
      state.sandboxExcludedCommands,
      'e.g. git, docker',
      COMMAND_SUGGESTIONS,
    );
  }

  if (showMcp) {
    html += renderTagField(
      'allowed-mcp',
      'Allowed MCP Servers',
      'MCP server names to explicitly allow (managed only)',
      state.allowedMcpServerNames,
      'e.g. github',
      MCP_ALLOW_SUGGESTIONS,
    );
    html += renderTagField(
      'denied-mcp',
      'Denied MCP Servers',
      'MCP server names to explicitly deny (managed only)',
      state.deniedMcpServerNames,
      'e.g. filesystem',
      MCP_DENY_SUGGESTIONS,
    );
  }

  container.innerHTML = html;

  // Bind event handlers
  if (showSandbox) {
    bindTagInput('allowed-domains', state.allowedDomains, setAllowedDomains);
    bindTagInput('excluded-commands', state.sandboxExcludedCommands, setSandboxExcludedCommands);
  }
  if (showMcp) {
    bindTagInput('allowed-mcp', state.allowedMcpServerNames, setAllowedMcpServers);
    bindTagInput('denied-mcp', state.deniedMcpServerNames, setDeniedMcpServers);
  }
}

function renderTagField(
  id: string,
  label: string,
  hint: string,
  values: string[],
  placeholder: string,
  suggestions: string[],
): string {
  const tagsHtml = values
    .map(
      (v) =>
        `<span class="tag">${escapeHtml(v)}<span class="tag-remove" data-field="${id}" data-value="${escapeHtml(v)}">${xIcon(12)}</span></span>`,
    )
    .join('');

  // Filter out suggestions that are already added
  const lowerValues = values.map((v) => v.toLowerCase());
  const availableSuggestions = suggestions.filter((s) => !lowerValues.includes(s.toLowerCase()));
  const suggestionsHtml = availableSuggestions.length > 0
    ? `<div class="suggestions">Try: ${availableSuggestions.map(
        (s) => `<button type="button" class="suggestion-chip" data-field="${id}" data-suggestion="${escapeHtml(s)}">${escapeHtml(s)}</button>`,
      ).join('')}</div>`
    : '';

  return `
    <div class="custom-field">
      <label for="input-${id}">${label}</label>
      <input type="text" id="input-${id}" placeholder="${placeholder}" />
      <div class="enter-hint">Press Enter or comma to add &#8629;</div>
      <div class="hint">${hint}</div>
      ${suggestionsHtml}
      <div class="tags-container" id="tags-${id}">${tagsHtml}</div>
    </div>
  `;
}

function bindTagInput(
  id: string,
  currentValues: string[],
  setter: (values: string[]) => void,
): void {
  const input = document.getElementById(`input-${id}`) as HTMLInputElement | null;
  const tagsContainer = document.getElementById(`tags-${id}`);
  if (!input || !tagsContainer) return;

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const raw = input.value.trim().replace(/,$/, '');
      if (!raw) return;

      // Split by comma for batch entry
      const newValues = raw
        .split(',')
        .map((v) => v.trim())
        .filter((v) => {
          const lower = v.toLowerCase();
          return v && !currentValues.some((c) => c.toLowerCase() === lower);
        });

      if (newValues.length) {
        setter([...currentValues, ...newValues]);
      } else {
        // Invalid/duplicate - shake the input
        input.classList.add('invalid');
        setTimeout(() => input.classList.remove('invalid'), 300);
      }
      input.value = '';
    }
  });

  // Remove tag handlers
  tagsContainer.querySelectorAll('.tag-remove').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('.tag-remove') as HTMLElement;
      const value = target?.dataset.value;
      if (value) {
        setter(currentValues.filter((v) => v !== value));
      }
    });
  });

  // Suggestion chip handlers
  const container = input.closest('.custom-field');
  if (container) {
    container.querySelectorAll('.suggestion-chip').forEach((chip) => {
      chip.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const suggestion = target.dataset.suggestion;
        if (suggestion && !currentValues.includes(suggestion)) {
          setter([...currentValues, suggestion]);
        }
      });
    });
  }
}
