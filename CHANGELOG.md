# Changelog

All notable changes to RepoRewind are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses semantic versioning once releases are published.

## [Unreleased] — 0.2.0 release candidate

### Added

- Added an automatic non-WebGL evidence mode over the same archive engine, with search, Insights, timeline comparison, Story Director navigation, keyboard-readable file evidence, a compact mobile layout, and a public-safe 1200×630 PNG poster plus privacy report.
- Added a manual read-only evidence-poster Action that checks deterministic pixels, emits checksums and a non-publication manifest, and retains only a private short-lived Actions artifact.
- Added seven maintained contributor issues, contribution lanes, a 48-hour response target, and first-time contributor release-note routing.
- Added a permissioned documentary gallery for RepoRewind, LightClaw, and PDF Editor Offline with immutable source heads, exact replay commands, interpretation limits, public privacy reports, and checksum-verified posters.

### Changed

- Added a fast 640×360 Preview film resolution and corrected export DPR selection so the live renderer no longer draws more pixels than the selected proof output requires.
- Made benchmark export selection explicit, cleanup failure-safe, and the forced-no-WebGL record verify real search, comparison, story, responsive, poster-dimension, and page-error outcomes.

### Earlier candidate additions

- Published the real interactive application at `https://othmaneblial.github.io/RepoRewind/play/` and linked it from the showcase, documentation, and README.
- Added a reproducible Pages bundle that combines the static showcase with the production app, verifies subpath-safe assets, blocks source maps, and participates in the full verification gate.
- Added the one-command `reporewind [repository]` workflow: it analyzes Git, starts a tokenized read-only loopback viewer, loads the validated history automatically, and opens the browser without a temporary archive.
- Added public npm metadata, a narrow package allowlist, clean-tarball inspection, and an exact-package smoke test for version output, portable analysis, viewer loading, and shutdown across the CI operating-system matrix.
- Added a real 12-second moving product proof plus a reproducible 1280×640 social preview built from the actual RepoRewind interface.
- Added a field-level Share Safety review with public/private projections, explicit sensitive-data gates, deterministic film redaction, and a versioned machine-readable privacy report.
- Added a one-click history story pack with four fixed-size PNG variants, the selected trailer, GitHub-ready Markdown, a privacy report, and a SHA-256 manifest in one stable ZIP.
- Added a deterministic Story Director with seven scored narrative modes, Git evidence jumps, chapter inclusion/order/title controls, privacy review for public custom titles, and directed trailer pacing.
- Added an evidence-backed archaeology desk with eight deterministic, documented metrics, visible interpretation limits, text-only operation, and direct navigation to supporting commits and paths.
- Added deterministic small/medium/large Git and browser benchmarks, a versioned Apple M2 baseline, advisory budgets, scheduled artifact publication, and path-count-based renderer quality tiers.

### Changed

- Rebuilt the README around the first real-repository success, one canonical command, explicit expected output, the local-first contract, and repeatable onboarding, investigation, and presentation jobs.
- Made the public film preset generic by default while preserving the canonical archive and allowing reviewed per-field disclosure overrides.

### Security

- Added an HTML Content Security Policy for static hosts and clarified which response-header protections GitHub Pages does not apply from the checked-in `_headers` file.
- Made the import dialog explicit that selected archives stay in the current tab and are never uploaded.
- Bound the one-command viewer exclusively to a random `127.0.0.1` port behind a cryptographically random session path; it accepts only `GET`/`HEAD`, prevents path traversal, exposes no mutation endpoint, and sends restrictive response headers.

## [0.1.0] - 2026-08-21

### Added

- Keyboard-first archive search, temporal comparison, file inspection, deterministic fictional demo reset, and browser-native MP4/WebM film export.
- Worker-based archive indexing with progress and cancellation.
- Error-boundary recovery, WebGL fallback messaging, reduced-motion behavior, and accessible timeline landmarks.
- Native modal dialogs with inert backgrounds, cancellation, focus trapping, and focus restoration.
- Compact mobile actions that keep search, archive import, and film export reachable on narrow screens.
- Strict CLI parsing, `--stdout`, `--quiet`, `--version`, branch selection, bounded history analysis, and privacy-preserving email defaults.
- Safe archive writes that refuse to replace an existing file unless `--force` is explicit; forced replacement is atomic and keeps private file permissions.
- Formatting, linting, documentation validation, integration tests, dependency auditing, and pinned multi-platform CI.

### Changed

- Reimagined the interface as a warm archival-daylight city with brighter WebGL lighting, legible paper-glass controls, and clearer responsive overlays.
- Git metadata parsing now uses NUL-delimited records and portable empty-tree diffs so unusual paths and non-Unix systems are handled safely.
- The development and preview servers bind to localhost by default.
- The 3D renderer is lazy-loaded and no longer depends on `@react-three/drei`.
- Commit lookups are indexed and dense timelines cap rendered landmark controls through deterministic even sampling.
- Three.js is pinned to the latest release line compatible with React Three Fiber's non-deprecated clock API, preventing known console warnings until Fiber migrates to `THREE.Timer`.

### Security

- Imported archives enforce size, count, string, date, relationship, and integer bounds before indexing.
- Public repository links require HTTPS (with loopback HTTP for development), generated film names are sanitized, and export/import resources are cleaned up on cancellation.
- Analyzer remotes strip URL credentials, queries, and fragments before serialization; unsupported local remotes are omitted.
- Analyzer output passes the same closed-world runtime contract as browser imports before it can be written or piped.
- Contributor grouping uses archive-local sequential identifiers instead of an email-derived hash, preventing cross-archive correlation through contributor IDs.
- Production-host examples include restrictive security headers and no telemetry.

[Unreleased]: https://github.com/OthmaneBlial/RepoRewind/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/OthmaneBlial/RepoRewind/releases/tag/v0.1.0
