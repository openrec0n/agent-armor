# AgentArmor

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/agent-armor.svg)](https://www.npmjs.com/package/agent-armor)
[![CI](https://github.com/openrec0n/agent-armor/actions/workflows/ci.yml/badge.svg)](https://github.com/openrec0n/agent-armor/actions/workflows/ci.yml)
[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://openrec0n.github.io/agent-armor/)

Security configuration generator for Claude Code sessions.

Generate hardened `settings.json` configurations to protect Claude Code from data exfiltration, credential theft, privilege escalation, destructive operations, and other agent-targeted threats.

**[Try the live demo &rarr;](https://openrec0n.github.io/agent-armor/)**

## How It Works

1. **Choose a target** &mdash; where the settings will be deployed (user, project, local, or managed/enterprise)
2. **Pick a profile** &mdash; Lax, Moderate (recommended), Strict, or Custom
3. **Toggle individual threats** &mdash; enable/disable specific protections
4. **Customize** &mdash; add allowed domains, sandbox excluded commands, MCP server lists
5. **Export** &mdash; copy to clipboard or download the generated `settings.json`

Everything runs in your browser. No data leaves your machine.

## Programmatic Usage

The core engine is available as an npm package for use in scripts, CI pipelines, or custom tooling.

```bash
npm install agent-armor
```

```typescript
import { generate, PROFILES } from 'agent-armor';

const moderate = PROFILES.find(p => p.id === 'moderate')!;
const result = generate({
  enabledThreats: moderate.enabledThreats,
  target: 'user',
});

console.log(JSON.stringify(result.settings, null, 2));
// result.appliedMitigations — what was applied
// result.skippedMitigations — what was skipped (and why)
```

## Threat Categories

| Threat | Severity | Description |
|--------|----------|-------------|
| **Data Exfiltration** | HIGH | Blocks curl, wget, DNS tools, WebFetch from sending data to external servers |
| **Secrets Theft** | HIGH | Prevents reading .env, SSH keys, AWS credentials, API tokens |
| **Malicious MCP** | MEDIUM | Controls which MCP servers can connect, locks down plugin marketplaces |
| **Privilege Escalation** | HIGH | Blocks sudo, su, chmod, chown commands |
| **Permission Bypass** | HIGH | Disables --dangerously-skip-permissions flag |
| **Config Override** | HIGH | Prevents user/project settings from overriding managed policies (enterprise only) |
| **Destructive Ops** | MEDIUM | Blocks rm -rf, git force-push, git reset --hard |
| **Sandbox Enforcement** | MEDIUM | Enables OS-level sandboxing with strict network/filesystem isolation |

## Security Profiles

| Profile | Threats Enabled | Best For |
|---------|----------------|----------|
| **Lax** | Permission bypass, Privilege escalation | Personal use, low-risk projects |
| **Moderate** | Data exfil, Secrets, Priv esc, Permission bypass, Destructive ops | Most teams |
| **Strict** | All 8 threats | Enterprise managed deployments |
| **Custom** | Pick individually | Fine-grained control |

## Settings Targets

| Target | File Path | Use Case |
|--------|-----------|----------|
| User | `~/.claude/settings.json` | Personal settings across all projects |
| Project | `.claude/settings.json` | Shared with team via git |
| Local | `.claude/settings.local.json` | Personal project overrides (gitignored) |
| Managed | System-level path | Enterprise admin deployment (highest priority) |

## Merge Support

Paste your existing `settings.json` and toggle "Merge with existing" to add security rules without losing your other configuration (model, env, hooks, etc.).

## Development

```bash
npm install
npm run dev           # Start dev server
npm test              # Run unit tests (585 tests)
npm run build         # Build web UI for production
npm run build:lib     # Build npm library package
npm run build:all     # Build both
npm run typecheck     # Type-check (includes DOM)
npm run typecheck:lib # Type-check core only (no DOM)
```

## Architecture

```
src/core/     Pure TypeScript engine (no DOM dependencies)
  schema.ts   Types mirroring settings.json
  threats.ts  8 threat definitions with mitigation fragments
  profiles.ts Lax/Moderate/Strict presets
  engine.ts   Generation: threats -> settings.json
  merge.ts    Deep merge for existing configs

src/web/      Browser UI (vanilla TS/HTML/CSS)
  app.ts      State management
  components/ UI components
```

The core engine is framework-agnostic and runs in both Node.js and the browser. Zero runtime dependencies.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, testing, and PR guidelines.

## Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting and disclosure policy.

## License

MIT
