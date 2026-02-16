import {
  getState,
  setAllowedDomains,
  setSandboxExcludedCommands,
  setAllowedMcpServers,
  setDeniedMcpServers,
} from '../app';
import { escapeHtml } from '../utils';

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
      '<p class="section-desc">Enable sandbox enforcement or MCP threats to see customization options.</p>';
    return;
  }

  let html = '';

  if (showSandbox) {
    html += renderTagField(
      'allowed-domains',
      'Allowed Domains',
      'Domains that sandbox will allow network access to (comma-separated, press Enter to add)',
      state.allowedDomains,
      'e.g. github.com, npmjs.org',
    );

    html += renderTagField(
      'excluded-commands',
      'Sandbox Excluded Commands',
      'Commands that run outside the sandbox (comma-separated, press Enter to add)',
      state.sandboxExcludedCommands,
      'e.g. git, docker',
    );
  }

  if (showMcp) {
    html += renderTagField(
      'allowed-mcp',
      'Allowed MCP Servers',
      'MCP server names to explicitly allow (managed only)',
      state.allowedMcpServerNames,
      'e.g. github, memory',
    );
    html += renderTagField(
      'denied-mcp',
      'Denied MCP Servers',
      'MCP server names to explicitly deny (managed only)',
      state.deniedMcpServerNames,
      'e.g. filesystem',
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
): string {
  const tagsHtml = values
    .map(
      (v) =>
        `<span class="tag">${escapeHtml(v)}<span class="tag-remove" data-field="${id}" data-value="${escapeHtml(v)}">&times;</span></span>`,
    )
    .join('');

  return `
    <div class="custom-field">
      <label for="input-${id}">${label}</label>
      <input type="text" id="input-${id}" placeholder="${placeholder}" />
      <div class="hint">${hint}</div>
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
        .filter((v) => v && !currentValues.includes(v));

      if (newValues.length) {
        setter([...currentValues, ...newValues]);
      }
      input.value = '';
    }
  });

  // Remove tag handlers
  tagsContainer.querySelectorAll('.tag-remove').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const value = (e.target as HTMLElement).dataset.value;
      if (value) {
        setter(currentValues.filter((v) => v !== value));
      }
    });
  });
}

