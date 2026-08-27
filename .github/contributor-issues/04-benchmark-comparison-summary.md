<!-- labels: help wanted,performance -->

# Add an advisory benchmark comparison summary

## Outcome

Maintainers can compare two compatible result JSON files and see percentage deltas without manually inspecting nested records or treating advisory budgets as CI failures.

## Scope

Create a read-only script that accepts exactly two result paths, refuses incompatible fixture versions or environments, and prints a compact Markdown table for analyzer, first-interactive, playback, and export measurements. It must never modify baseline files or fail merely because a compatible result is slower.

## Relevant files

- `scripts/check-benchmark-results.mjs` for contract patterns
- `benchmarks/fixtures/v1.json`
- `benchmarks/results/2026-08-27-macos-m2.json`
- `benchmarks/README.md`
- `package.json`

## Acceptance criteria

- [ ] Missing, malformed, or contract-incompatible inputs fail with one actionable error.
- [ ] Compatible inputs produce deterministic Markdown with absolute values and signed percentage deltas.
- [ ] Zero baselines render as `n/a` rather than `Infinity` or `NaN`.
- [ ] Slower compatible results exit successfully and remain explicitly advisory.
- [ ] Unit fixtures cover faster, slower, zero, and incompatible cases.

## Test commands

```bash
npm run benchmark:check
npm test -- --run scripts/benchmarks
npm run lint
npm run typecheck
```
