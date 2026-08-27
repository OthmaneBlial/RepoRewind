# Non-WebGL evidence mode

RepoRewind treats 3D as one view of the archive, not as the archive itself. If the real Three.js renderer cannot create a WebGL context, the application automatically opens a text-first evidence workspace over the same validated history, index, snapshots, and timeline state.

## What remains available

- complete keyboard-searchable file, commit, contributor, release, and ref evidence;
- the eight deterministic Insights views and their direct commit/path links;
- current-commit file changes with additions, deletions, status, and inspector navigation;
- timeline playback controls and deterministic Story Director chapter jumps;
- era pinning and structural comparison;
- a public-safe 1200×630 PNG evidence poster and a machine-readable privacy report.

The evidence actions are ordinary labeled buttons and regions. Search, story navigation, comparison, and file inspection never require selecting an object inside a canvas. On narrow screens the evidence workspace replaces side overlays while keeping the timeline and primary actions reachable without horizontal overflow.

## Capability boundary

The 3D city, orbit/building selection, and MP4/WebM film rendering require WebGL. Their absence does not label the repository or archive unsupported. The workspace explains the unavailable capability and disables the 3D return action; importing another archive does not retry or upload anything.

RepoRewind does not create a second WebGL context just to probe support. The production renderer is the capability check. If its construction fails, it schedules the evidence-mode transition and leaves no rejected renderer promise or uncaught page error.

## Poster privacy contract

`repo-rewind-evidence-poster.png` uses the fixed Public share projection. It includes generic repository labeling, aggregate commit/path/contributor/release counts, month-level activity, and generic deterministic chapter titles. It omits repository names and remotes, contributor names and emails, commit hashes and messages, paths, branches, and tags.

`reporewind-evidence-privacy-report.json` is downloaded beside the poster. The canonical in-memory archive is not mutated, and neither artifact is uploaded by RepoRewind. See [Privacy and trust boundaries](./privacy.md) for the full field contract.

## Reproducible verification

The versioned benchmark launches Chrome with `--disable-webgl --disable-gpu`, opens a real loopback archive, and records whether the fallback, search, Insights, comparison, Story Director, compact layout, poster download, dimensions, and page-error boundary succeeded. The Apple M2 baseline records all six workflows as usable, no page error, and a 564,833-byte 1200×630 PNG.

Run the complete check with:

```bash
npm run benchmark -- --output benchmark-results/local.json
npm run benchmark:check
```
