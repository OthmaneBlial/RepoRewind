# RepoRewind benchmarks

`fixtures/v1.json` is the deterministic small/medium/large fixture and advisory-budget contract. `results/` contains complete, environment-labeled baseline records; results from unlike hardware, browser versions, fixture versions, or device scale factors must not be compared as regressions.

Run the suite from the repository root:

```bash
npm ci
npm run benchmark:install
npm run benchmark -- --output benchmark-results/local.json
```

The scheduled GitHub workflow is intentionally independent of the quality gate. Read [`docs/performance.md`](../docs/performance.md) before interpreting a result or proposing a blocking budget.

The export observation explicitly selects the 12-second 640×360 Preview path. The no-WebGL observation disables GPU/WebGL and verifies search, Insights, comparison, Story Director navigation, 390 px layout containment, a 1200×630 PNG download, and the absence of an uncaught page error.
