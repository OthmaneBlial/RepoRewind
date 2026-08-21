# Performance notes

RepoRewind optimizes for smooth interactive exploration on an ordinary modern laptop while keeping archive work bounded.

## Current bounds and strategies

- Archive imports are capped at 256 MB, 250,000 commits, and 2,000,000 file-change entries.
- Index construction runs in a Web Worker when available.
- The replay engine creates roughly 64 checkpoints and retains at most 24 materialized snapshots.
- Commit hashes resolve through a prepared map instead of repeated history scans.
- Timeline releases, merges, and branch tips are deterministically sampled to at most 96 controls per kind while search retains the complete archive.
- City coordinates are computed once from the path index.
- Repeated scene objects use instanced geometry.
- The Three.js city is lazy-loaded separately from the application shell.
- Film frames use explicit backpressure and never intentionally drop input frames.

## Measured production bundle

`npm run build:web` on 2026-08-21 produced the following minified artifacts:

| Artifact                   |      Raw |         Gzip |
| -------------------------- | -------: | -----------: |
| Application entry          | 257.3 kB |      80.8 kB |
| Shared React/runtime chunk | 173.6 kB |      45.2 kB |
| Lazy Three.js city chunk   | 896.6 kB |     238.6 kB |
| Styles                     |  33.1 kB |       8.2 kB |
| History worker             |  11.0 kB | not reported |

The city chunk remains intentionally large and is the main performance limitation. Lazy loading prevents it from blocking the static shell bundle, but runtime frame rate and memory still require real-device browser measurement before publishing hardware claims.
