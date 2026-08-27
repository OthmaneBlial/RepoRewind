# Performance envelope

RepoRewind publishes a reproducible, advisory performance record instead of promising that every repository or device behaves the same. The fixture manifest, machine-readable baseline, budgets, and harness are versioned with the source.

- Fixture contract: [`benchmarks/fixtures/v1.json`](../benchmarks/fixtures/v1.json)
- Apple M2 baseline: [`benchmarks/results/2026-08-27-macos-m2.json`](../benchmarks/results/2026-08-27-macos-m2.json)
- Runner: `scripts/benchmarks/run.ts`
- Scheduled workflow: `.github/workflows/benchmarks.yml`

## Reproduce it

Requirements are the supported Node.js 24 line, current Git, and Chromium. The benchmark is intentionally separate from the main pass/fail CI gate.

```bash
npm ci
npm run benchmark:install
npm run benchmark -- --output benchmark-results/local.json
```

To use an installed Google Chrome instead of Playwright's locked Chromium binary:

```bash
REPOREWIND_BENCHMARK_BROWSER=chrome npm run benchmark -- --output benchmark-results/local-chrome.json
```

The runner creates temporary deterministic Git repositories through `git fast-import`, analyzes them through the production streaming analyzer, opens the production viewer through its tokenized loopback server, and removes the fixtures afterward. It performs a real 12-second WebM story-pack export for the small fixture. No benchmark repository data is uploaded.

## Versioned fixture envelope

| Fixture | Commits | File changes | Final paths | Contributors | Releases |
| ------- | ------: | -----------: | ----------: | -----------: | -------: |
| Small   |     120 |          480 |          80 |            4 |        3 |
| Medium  |   1,000 |        8,000 |       1,200 |           12 |        5 |
| Large   |   5,000 |       60,000 |       8,000 |           40 |        8 |

The fixtures model steady source changes across deterministic top-level districts. They are not intended to represent large binaries, Git LFS, merge-heavy histories, pathological rename detection, network filesystems, or every monorepository shape.

## Baseline: Apple M2, 16 GB

Recorded on 2026-08-27 with macOS 25.6, Apple M2 (8 cores), 16 GB memory, Node.js 24.20.0, Apple Git 2.50.1, Chrome 151 headless, a 1280×720 viewport, and device scale factor 2.

### Analyzer and preparation

| Fixture |     Archive | Analyzer | Peak Node heap delta | Validation |    Index |  Layout | First snapshot |
| ------- | ----------: | -------: | -------------------: | ---------: | -------: | ------: | -------------: |
| Small   |    81,410 B |   276 ms |              2.1 MiB |     2.2 ms |   2.7 ms |  1.6 ms |         0.4 ms |
| Medium  | 1,060,956 B |   701 ms |             15.8 MiB |     9.1 ms |  36.4 ms |  7.3 ms |         1.0 ms |
| Large   | 7,261,436 B | 3,011 ms |             53.9 MiB |    35.2 ms | 155.0 ms | 49.8 ms |        27.4 ms |

Peak memory is sampled from the RepoRewind Node process and excludes transient memory inside Git subprocesses and Chromium. Analyzer times are single local observations, not universal latency claims.

### First interactive frame and playback

| Fixture | Renderer tier | Canvas pixels | First interactive | Two-second playback band | Longest observed main-thread task |
| ------- | ------------- | ------------: | ----------------: | -----------------------: | --------------------------------: |
| Small   | Cinematic     |     2112×1059 |            0.80 s |                   58 FPS |                            120 ms |
| Medium  | Balanced      |      1600×802 |            1.05 s |                   60 FPS |                            124 ms |
| Large   | Dense         |      1280×642 |            2.74 s |                   60 FPS |                            763 ms |

The first-interactive timer begins before navigation and ends only after the correct repository name, expected renderer tier, visible canvas, and two animation frames. FPS counts browser animation frames while the real timeline and Three.js scene play; headless software/virtualized WebGL is not equivalent to a discrete GPU.

Renderer tiers are deterministic and depend only on indexed path count:

- **Cinematic:** up to 1,000 paths, DPR capped at 1.65, full antialiasing and 2048px shadows;
- **Balanced:** 1,001–5,000 paths, DPR capped at 1.25 and 1024px shadows;
- **Dense:** above 5,000 paths, DPR capped at 1, antialiasing and realtime shadows disabled.

Film export temporarily requests the selected output resolution independently from the interactive tier.

### Fallback and export observations

- The large no-worker fallback reached its first interactive frame in 1.09 s and played at 60 FPS in this run. It did not outperform the worker consistently during harness development, so the project makes no general worker-speed claim; the fallback exists for compatibility and is measured separately.
- With WebGL forcibly disabled, RepoRewind switched to the [evidence mode](./non-webgl.md) without an uncaught page error. Search, Insights, timeline comparison, Story Director navigation, the 390 px layout, and a 564,833-byte 1200×630 public-safe PNG export all completed successfully.
- The small fixture's 12-second 640×360 Preview WebM encoded in 13.38 s. Four PNGs, Markdown, privacy report, hashes, and the stable ZIP took another 0.94 s. Total story-pack delivery was 14.47 s and 11,537,830 bytes. Preview is the reproducible smoke path; 1080p and 4K remain available product outputs and are device-dependent.

## Advisory budgets

The v1 manifest sets deliberately broad budgets for analyzer, index, and first-interactive time. The baseline validator checks that recorded status matches those budgets, but performance regressions do not yet fail the main CI gate. A budget becomes release-blocking only after at least two comparable GitHub-hosted baselines establish normal variance and a pull request explicitly changes that policy.

The scheduled/manual benchmark workflow uploads the complete JSON result for 30 days. It uses pinned actions, Node 24, a locked Playwright dependency, and a freshly installed Chromium runtime.

## Existing bounds and strategies

- Archive imports are capped at 256 MB, 250,000 commits, and 2,000,000 file-change entries.
- Index construction runs in a Web Worker when available.
- The replay engine creates roughly 64 checkpoints and retains at most 24 materialized snapshots.
- Commit hashes resolve through a prepared map instead of repeated history scans.
- Timeline releases, merges, and branch tips are deterministically sampled to at most 96 controls per kind while search retains the complete archive.
- City coordinates are computed once from the path index.
- Repeated scene objects use instanced geometry.
- The Three.js city is lazy-loaded separately from the application shell.
- Film frames use explicit backpressure and never intentionally drop input frames.

The lazy Three.js chunk remains the largest web artifact at roughly 897 kB minified / 239 kB gzip in this baseline. It does not block the static application shell, but renderer cost and export encoding remain device-dependent.
