# RepoRewind

**Your codebase has a past. Watch it become a city.**

RepoRewind is an open-source cinematic Git history explorer. It turns files into buildings, folders into districts, contributors into travelers, releases into historic events, refactors into rebuilt neighborhoods, and deleted code into ruins that remain visible in the archive.

The current foundation includes a streaming local Git analyzer, truthful first-parent branch replay, bounded temporal checkpoints, worker-based imports, an interactive WebGL city, merge/release/refactor events, contributor tracking, accessible playback controls, portable history archives, and browser-native 1080p/4K MP4 and WebM time-lapse export.

## Start the observatory

Requirements: Node.js 20.19+ and Git.

```bash
npm install
npm run dev
```

The built-in ten-year sample opens immediately.

## Explore a real repository

Analyze locally. RepoRewind reads Git metadata and numeric diffs; it does not upload or embed source code.

```bash
npm run analyze -- /path/to/repository --output ./reporewind-history.json
```

Open RepoRewind, choose **Import**, and select the generated JSON file. Contributor email addresses are omitted unless `--include-emails` is explicitly supplied.

The checked-out branch is the default source of truth. RepoRewind follows its first-parent history so every city frame represents a state that genuinely existed; merge commits bring the merged neighborhood into view as a confluence event. Use `--branch <ref>` to explore another local or remote branch without flattening incompatible histories together.

```bash
npm run analyze -- /path/to/repository --branch release/3.x
```

Large histories can be sampled during early exploration:

```bash
npm run analyze -- /path/to/repository --max-commits 5000
```

When a limit omits older commits, RepoRewind reconstructs the earliest retained commit against Git’s empty tree. The first frame is therefore a truthful complete baseline, not a city assembled from an incomplete diff.

## City grammar

| Git history | RepoRewind city |
| --- | --- |
| File | A building whose height follows its current line count |
| Top-level folder | A stable district separated by avenues |
| Contributor | A colored traveler located at their latest work site |
| Commit | A pulse of construction, demolition, or rebuilding |
| Tag / release | A city-wide historical ring and timeline marker |
| Rename / refactor | A neighborhood rebuilding event |
| Deleted file | A permanent, selectable ruin |

Layout is derived from stable path hashes across the full history. Scrubbing backward never randomly rearranges the city, and demolished sites remain geographically meaningful.

## Investigate the archive

Press <kbd>⌘K</kbd> / <kbd>Ctrl K</kbd> or <kbd>/</kbd> to find files, commit messages and hashes, travelers, releases, or reachable branch tips. Queries can be narrowed with `file:`, `commit:`, `author:`, `release:`, and `branch:`.

Choose **Pin this era**, travel elsewhere on the timeline, then open the temporal diff. RepoRewind compares the two real city states, reports line and building deltas, follows rename chains, lists consequential sites, and recolors the city as a live diff lens: mint for construction, amber for rebuilding, blue for renames, and red for demolition.

## Film export

Choose **Export film**, select 1080p or 4K, a duration, and either activity-based or calendar-accurate pacing. RepoRewind choreographs the camera and records a clean 16:9 composition with opening and closing titles, dates, current commits, city statistics, merge/release event cards, and a cinematic grade.

On secure origins with H.264 WebCodecs support, MP4 export renders an explicit fixed-frame timeline and applies encoder backpressure without dropping frames. The visual sequence, timestamps, event pacing, and keyframe schedule are deterministic; the final encoded bytes may vary with the browser or hardware codec. When H.264 is unavailable, the export dialog keeps the MediaRecorder WebM path available, preferring VP9 and then VP8.

## Commands

```bash
npm run dev          # local Vite development server
npm run test         # temporal engine and Git parser tests
npm run build        # production web app and distributable CLI
npm run check        # full test + build gate
npm run analyze -- . # generate a history file for a Git repository
```

## Architecture

- `cli/` streams two Git metadata views without holding giant command outputs in memory and emits schema v1 history files.
- `src/core/` builds roughly 64 temporal checkpoints plus searchable file/contributor activity indexes, reconstructs requested frames through a bounded LRU cache, and computes rename-aware historical diffs.
- `src/workers/` parses and indexes imported archives off the browser’s main thread.
- `src/components/CityScene.tsx` renders buildings, ruins, change signals, and travelers with instanced geometry.
- `src/export/` composites professional time-lapse video and exports fixed-timeline MP4 or compatible WebM entirely in the browser.
- `src/data/` contains the fictional ten-year sample used for the first-run experience.
- `schema/` defines the portable public archive contract as JSON Schema 2020-12.

## Privacy and scale

The analyzer exports hashes, timestamps, commit messages, contributor display names, file paths, numeric diffs, statuses, branch tips, merge parents, and tag metadata. It does not export file contents. Email addresses are excluded by default. Imported archives are indexed in a Web Worker, temporal memory is checkpoint-bounded, and rendering uses instanced geometry for buildings, ruins, travelers, and commit signals.

## Contributing

Issues and focused pull requests are welcome. Run `npm run check` before submitting changes. RepoRewind is licensed under the [MIT License](./LICENSE).
