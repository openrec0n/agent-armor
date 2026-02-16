import type { DeepPartial, ClaudeCodeSettings, SettingsTarget } from './schema';

export type ThreatId =
  | 'data-exfiltration'
  | 'secrets-theft'
  | 'malicious-mcp'
  | 'privilege-escalation'
  | 'permission-bypass'
  | 'config-override'
  | 'destructive-ops'
  | 'sandbox-enforcement';

export type Severity = 'high' | 'medium' | 'low';

export interface Mitigation {
  label: string;
  settingsFragment: DeepPartial<ClaudeCodeSettings>;
  validTargets: SettingsTarget[];
}

export interface ThreatDefinition {
  id: ThreatId;
  name: string;
  description: string;
  severity: Severity;
  references: string[];
  mitigations: Mitigation[];
}

const ALL_TARGETS: SettingsTarget[] = ['user', 'project', 'local', 'managed'];
const MANAGED_ONLY: SettingsTarget[] = ['managed'];

export const THREATS: ThreatDefinition[] = [
  {
    id: 'data-exfiltration',
    name: 'Data Exfiltration via Network Tools',
    description:
      'Prevents the agent from using curl, wget, DNS tools, or WebFetch to send data to external servers via prompt injection.',
    severity: 'high',
    references: ['CVE-2025-55284', 'Claude Code DNS Exfil'],
    mitigations: [
      {
        label: 'Block network CLIs in Bash',
        settingsFragment: {
          permissions: {
            deny: [
              'Bash(curl *)',
              'Bash(wget *)',
              'Bash(nc *)',
              'Bash(ncat *)',
              'Bash(netcat *)',
              'Bash(nslookup *)',
              'Bash(dig *)',
              'Bash(host *)',
            ],
          },
        },
        validTargets: ALL_TARGETS,
      },
      {
        label: 'Block WebFetch tool',
        settingsFragment: {
          permissions: {
            deny: ['WebFetch'],
          },
        },
        validTargets: ALL_TARGETS,
      },
      {
        label: 'Sandbox network lockdown',
        settingsFragment: {
          sandbox: {
            enabled: true,
            network: {
              allowedDomains: [],
              allowAllUnixSockets: false,
            },
          },
        },
        validTargets: ALL_TARGETS,
      },
    ],
  },
  {
    id: 'secrets-theft',
    name: 'Secrets & Credential Theft',
    description:
      'Blocks the agent from reading .env files, SSH keys, AWS credentials, API tokens, and other sensitive credential stores.',
    severity: 'high',
    references: ['Claude Pirate', 'Cline Data Exfil'],
    mitigations: [
      {
        label: 'Block project credential files',
        settingsFragment: {
          permissions: {
            deny: [
              'Read(./.env)',
              'Read(./.env.*)',
              'Read(./secrets/**)',
              'Read(./**/*.pem)',
              'Read(./**/*.key)',
              'Read(./**/credentials.json)',
            ],
          },
        },
        validTargets: ALL_TARGETS,
      },
      {
        label: 'Block home-directory credential stores',
        settingsFragment: {
          permissions: {
            deny: [
              'Read(~/.ssh/**)',
              'Read(~/.aws/**)',
              'Read(~/.azure/**)',
              'Read(~/.gnupg/**)',
              'Read(~/.kube/**)',
              'Read(~/.docker/**)',
              'Read(~/.npmrc)',
              'Read(~/.pypirc)',
              'Read(~/.netrc)',
            ],
          },
        },
        validTargets: ALL_TARGETS,
      },
    ],
  },
  {
    id: 'malicious-mcp',
    name: 'Malicious / Untrusted MCP Servers',
    description:
      'Controls which MCP servers the agent can connect to, preventing rogue plugins from exfiltrating data or executing unauthorized commands.',
    severity: 'medium',
    references: ['MCP Confused Clients', 'Slack MCP Exfil', 'Anthropic FS MCP Bypass'],
    mitigations: [
      {
        label: 'Disable all project MCP servers',
        settingsFragment: {
          enableAllProjectMcpServers: false,
        },
        validTargets: ALL_TARGETS,
      },
      {
        label: 'Lock down plugin marketplaces',
        settingsFragment: {
          strictKnownMarketplaces: [],
        },
        validTargets: MANAGED_ONLY,
      },
    ],
  },
  {
    id: 'privilege-escalation',
    name: 'Privilege Escalation via sudo / su',
    description:
      'Prevents the agent from running elevated commands that could gain root access or modify file permissions.',
    severity: 'high',
    references: [],
    mitigations: [
      {
        label: 'Block sudo, su, chmod, chown',
        settingsFragment: {
          permissions: {
            deny: [
              'Bash(sudo *)',
              'Bash(su *)',
              'Bash(su)',
              'Bash(chmod *)',
              'Bash(chown *)',
            ],
          },
        },
        validTargets: ALL_TARGETS,
      },
    ],
  },
  {
    id: 'permission-bypass',
    name: 'Permission Bypass / Auto-Approve',
    description:
      'Prevents use of --dangerously-skip-permissions which would bypass all permission checks, turning the agent unrestricted.',
    severity: 'high',
    references: ['ZombAI Agents', 'AgentHopper AI Virus'],
    mitigations: [
      {
        label: 'Disable bypass permissions mode',
        settingsFragment: {
          permissions: {
            disableBypassPermissionsMode: 'disable',
          },
        },
        validTargets: MANAGED_ONLY,
      },
    ],
  },
  {
    id: 'config-override',
    name: 'Config Override / Shadow Policy',
    description:
      'Prevents user or project-level settings from overriding managed security policies. Enterprise/managed deployments only.',
    severity: 'high',
    references: ['Cross-Agent Privilege Escalation', 'Scary Agent Skills', 'Hidden Unicode Instructions'],
    mitigations: [
      {
        label: 'Enforce managed permission rules only',
        settingsFragment: {
          allowManagedPermissionRulesOnly: true,
        },
        validTargets: MANAGED_ONLY,
      },
      {
        label: 'Enforce managed hooks only',
        settingsFragment: {
          allowManagedHooksOnly: true,
        },
        validTargets: MANAGED_ONLY,
      },
    ],
  },
  {
    id: 'destructive-ops',
    name: 'Destructive Operations',
    description:
      'Blocks commands that destroy data or corrupt git history, like rm -rf, force-push, and hard reset.',
    severity: 'medium',
    references: [],
    mitigations: [
      {
        label: 'Block destructive file operations',
        settingsFragment: {
          permissions: {
            deny: [
              'Bash(rm -rf *)',
              'Bash(rm -r *)',
              'Bash(rm -fr *)',
            ],
          },
        },
        validTargets: ALL_TARGETS,
      },
      {
        label: 'Block destructive git operations',
        settingsFragment: {
          permissions: {
            deny: [
              'Bash(git push --force *)',
              'Bash(git push -f *)',
              'Bash(git reset --hard *)',
              'Bash(git clean -f *)',
            ],
          },
        },
        validTargets: ALL_TARGETS,
      },
    ],
  },
  {
    id: 'sandbox-enforcement',
    name: 'Sandbox Enforcement',
    description:
      'Enables OS-level sandboxing for Bash commands with strict filesystem and network isolation boundaries.',
    severity: 'medium',
    references: [],
    mitigations: [
      {
        label: 'Enable sandbox with strict defaults',
        settingsFragment: {
          sandbox: {
            enabled: true,
            autoAllowBashIfSandboxed: false,
            allowUnsandboxedCommands: false,
            excludedCommands: [],
            network: {
              allowedDomains: [],
              allowAllUnixSockets: false,
              allowLocalBinding: false,
            },
            enableWeakerNestedSandbox: false,
          },
        },
        validTargets: ALL_TARGETS,
      },
    ],
  },
];

export function getThreat(id: ThreatId): ThreatDefinition | undefined {
  return THREATS.find((t) => t.id === id);
}
