import type { ThreatId } from './threats';

export type ProfileId = 'lax' | 'moderate' | 'strict' | 'custom';

export interface ProfileDefinition {
  id: ProfileId;
  name: string;
  description: string;
  enabledThreats: ThreatId[];
}

export const PROFILES: ProfileDefinition[] = [
  {
    id: 'lax',
    name: 'Lax',
    description: 'Minimal restrictions. Blocks only permission bypass and privilege escalation.',
    enabledThreats: ['permission-bypass', 'privilege-escalation'],
  },
  {
    id: 'moderate',
    name: 'Moderate',
    description:
      'Balanced security. Blocks data exfiltration, secrets access, privilege escalation, permission bypass, and destructive operations.',
    enabledThreats: [
      'data-exfiltration',
      'secrets-theft',
      'privilege-escalation',
      'permission-bypass',
      'destructive-ops',
    ],
  },
  {
    id: 'strict',
    name: 'Strict',
    description:
      'Maximum security. Enables all threat mitigations including sandbox enforcement and MCP lockdown.',
    enabledThreats: [
      'data-exfiltration',
      'secrets-theft',
      'malicious-mcp',
      'privilege-escalation',
      'permission-bypass',
      'config-override',
      'destructive-ops',
      'sandbox-enforcement',
    ],
  },
];

export function getProfile(id: ProfileId): ProfileDefinition | undefined {
  if (id === 'custom') return undefined;
  return PROFILES.find((p) => p.id === id);
}
