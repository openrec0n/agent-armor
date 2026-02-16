# Contributing to AgentArmor

## Development Setup

```bash
git clone https://github.com/openrec0n/agent-armor.git
cd agent-armor
npm install
npm run dev
```

## Testing

```bash
npm test              # Run all tests
npm run typecheck     # Type-check (web + core)
npm run typecheck:lib # Type-check core only (no DOM — ensures core stays browser-independent)
```

All PRs must pass tests and both typechecks.

## Architecture Rules

- **`src/core/` must remain DOM-free.** No `document`, `window`, or `navigator` references. This is enforced by `typecheck:lib` which compiles without DOM types.
- **`src/web/` is the browser UI layer.** DOM access is only allowed here.
- **Threats are data, not code.** Each threat is a `ThreatDefinition` with `settingsFragment` objects. The engine merges them — it doesn't execute them.

## Pull Request Process

1. Fork the repo and create a feature branch from `main`
2. Make your changes
3. Run `npm test && npm run typecheck && npm run typecheck:lib`
4. Submit a PR against `main`
