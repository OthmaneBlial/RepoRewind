# Changelog

All notable changes to RepoRewind are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses semantic versioning once releases are published.

## [Unreleased]

### Added

- Published the real interactive application at `https://othmaneblial.github.io/RepoRewind/play/` and linked it from the showcase, documentation, and README.
- Added a reproducible Pages bundle that combines the static showcase with the production app, verifies subpath-safe assets, blocks source maps, and participates in the full verification gate.
- Added the one-command `reporewind [repository]` workflow: it analyzes Git, starts a tokenized read-only loopback viewer, loads the validated history automatically, and opens the browser without a temporary archive.
- Added public npm metadata, a narrow package allowlist, clean-tarball inspection, and an exact-package smoke test for version output, portable analysis, viewer loading, and shutdown across the CI operating-system matrix.

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
