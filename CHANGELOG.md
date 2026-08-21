# Changelog

All notable changes to RepoRewind are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses semantic versioning once releases are published.

## [Unreleased]

### Added

- Keyboard-first archive search, temporal comparison, file inspection, deterministic fictional demo reset, and browser-native MP4/WebM film export.
- Worker-based archive indexing with progress and cancellation.
- Error-boundary recovery, WebGL fallback messaging, reduced-motion behavior, and accessible timeline landmarks.
- Native modal dialogs with inert backgrounds, cancellation, focus trapping, and focus restoration.
- Compact mobile actions that keep search, archive import, and film export reachable on narrow screens.
- Strict CLI parsing, `--stdout`, `--quiet`, `--version`, branch selection, bounded history analysis, and privacy-preserving email defaults.
- Safe archive writes that refuse to replace an existing file unless `--force` is explicit.
- Formatting, linting, documentation validation, integration tests, dependency auditing, and pinned multi-platform CI.

### Changed

- Git metadata parsing now uses NUL-delimited records and portable empty-tree diffs so unusual paths and non-Unix systems are handled safely.
- The development and preview servers bind to localhost by default.
- The 3D renderer is lazy-loaded and no longer depends on `@react-three/drei`.
- Commit lookups are indexed and dense timelines cap rendered landmark controls through deterministic even sampling.
- Three.js is pinned to the latest release line compatible with React Three Fiber's non-deprecated clock API, preventing known console warnings until Fiber migrates to `THREE.Timer`.

### Security

- Imported archives enforce size, count, string, date, relationship, and integer bounds before indexing.
- Public repository links require HTTPS (with loopback HTTP for development), generated film names are sanitized, and export/import resources are cleaned up on cancellation.
- Analyzer remotes strip URL credentials, queries, and fragments before serialization; unsupported local remotes are omitted.
- Contributor grouping uses deterministic 80-bit SHA-256-derived identifiers instead of collision-prone 32-bit hashes.
- Production-host examples include restrictive security headers and no telemetry.
