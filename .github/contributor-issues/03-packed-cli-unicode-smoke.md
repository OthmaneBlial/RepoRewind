<!-- labels: good first issue,packaging -->

# Smoke-test the packed CLI from a Unicode path containing spaces

## Outcome

The exact npm tarball is proven to install and analyze correctly when its clean workspace path contains both spaces and non-ASCII characters.

## Scope

Change only the temporary directory layout used by the packed-package smoke script, then assert that archive generation and the loopback viewer still succeed. Do not change CLI path parsing or add platform-specific shell commands.

## Relevant files

- `scripts/smoke-packed-cli.mjs`
- `docs/troubleshooting.md` if a real platform limit is discovered
- `.github/workflows/ci.yml` only if an operating-system-specific assertion is necessary

## Acceptance criteria

- [ ] The install or repository path used by the smoke contains a space and at least one Unicode code point.
- [ ] The exact packed tarball still passes version, archive, viewer, and shutdown checks.
- [ ] The script remains shell-free and passes on Linux, macOS, and Windows CI.
- [ ] Temporary files are still removed in the existing `finally` path.

## Test commands

```bash
npm run package:smoke
npm run lint
npm run typecheck
```
