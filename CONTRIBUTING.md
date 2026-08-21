# Contributing to RepoRewind

RepoRewind welcomes focused fixes and improvements to the local analyze → import → explore → compare/export workflow. Please open an issue before a broad architectural change so the project stays coherent.

## Development setup

Install Git and Node.js 24 (the version in `.nvmrc`), then run:

```bash
npm ci
npm run dev
```

The development server binds to `127.0.0.1` by default and opens the deterministic fictional archive without credentials or environment variables.

## Quality gate

Before submitting a pull request:

```bash
npm run verify
```

That command checks formatting, lint rules, documentation links, unit and integration tests, TypeScript, both production builds, and high-severity dependency advisories.

Use `npm run test:watch` while developing. Changes to the archive format must update the TypeScript types, runtime validation, JSON Schema, fixtures, and compatibility documentation together.

## Product and privacy principles

- Keep repository analysis local and deterministic.
- Never add analytics, telemetry, accounts, remote uploads, or source-content collection.
- Preserve first-parent historical truth and stable city geography.
- Clearly label fictional or simulated data.
- Prefer focused modules and meaningful regression tests over speculative abstraction.
- Do not attach private history archives to issues or pull requests.

## Interface changes

Preserve the industrial night-observatory identity, practical keyboard behavior, visible focus, reduced motion, and usable narrow layouts. Include real screenshots for visual pull requests, but remove personal repository data and debugging UI first.

## Commit and pull request scope

Keep commits reviewable and pull requests focused. Describe the exact validation performed; a green type check alone is not evidence of a working visual interaction.

By participating, you agree to follow the [Code of Conduct](./CODE_OF_CONDUCT.md).
