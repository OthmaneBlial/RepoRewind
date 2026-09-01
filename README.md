# RepoRewind

**Turn a local Git history into a private, evidence-backed documentary.**

[![MIT License](https://img.shields.io/badge/license-MIT-f1a35f.svg)](./LICENSE)
[![Node.js 22.13 or 24](https://img.shields.io/badge/node-22.13%20%7C%2024-79d6bc.svg)](./package.json)
[![No telemetry](https://img.shields.io/badge/telemetry-none-82aaff.svg)](./docs/privacy.md)
[![Latest release](https://img.shields.io/github/v/release/OthmaneBlial/RepoRewind?sort=semver)](https://github.com/OthmaneBlial/RepoRewind/releases/latest)

**[Explore a fictional rebuild →](https://othmaneblial.github.io/RepoRewind/play/?case=rebuild)** · **[Run it on your repository](#run-it-on-your-repository)** · [Inspect the privacy boundary](./docs/privacy.md)

RepoRewind reconstructs how a repository became what it is. Files become buildings, folders become districts, releases become landmarks, contributors become travelers, refactors rebuild neighborhoods, and deleted paths remain visible as ruins. Search any trace, compare two real eras, inspect bounded archaeology findings, then export a privacy-reviewed story.

> **Public release:** `reporewind@0.2.0` is distributed through npm with a provenance statement linked to this repository. The first `npx` run downloads RepoRewind from npm; repository analysis and viewing then stay on your machine.

## See the difference in 60 seconds

The live demo opens a guided case over a fictional 25-commit history:

1. pin the `v2.0.0` city;
2. find the commit that moved the timeline engine into a streaming core;
3. jump to `v3.0.0` and compare the eras;
4. inspect the rename, deleted import layer, and supporting Git evidence.

No setup, account, upload, or analytics is involved. The hosted demo cannot read a local repository.

## Run it on your repository

Requirements: [Git](https://git-scm.com/) and [Node.js](https://nodejs.org/) 24 (recommended) or Node.js 22.13+.

```bash
cd /path/to/your/repository
npx reporewind .
```

Expected result:

```text
1,248 commits · 18 travelers · 9 releases
Local viewer: http://127.0.0.1:<random-port>/<private-session>/
Repository data stays on this machine. Press Ctrl+C to stop the viewer.
```

The command analyzes the checked-out first-parent history, starts a read-only server on a random `127.0.0.1` port, and opens a tokenized local session. It reads Git metadata, paths, refs, and numeric diffs—not source contents. It does not fetch refs, LFS data, or submodules, and it sends no repository data.

Use `--no-open` to print the local URL without launching a browser:

```bash
npx reporewind . --no-open
```

## Three reasons to come back

| Historical onboarding                                                                                            | Repository archaeology                                                                                                        | Retrospectives and releases                                                                                        |
| ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Walk a teammate through the eras, releases, migrations, handoffs, and deleted paths behind the current codebase. | Search a path or commit, inspect bounded evidence views, pin an earlier era, and follow rename-aware change into the present. | Direct a 12–24 second history film and package reviewed posters, copy, privacy details, and checksums for sharing. |

## A 3D city is the hook. The evidence trail is the product.

RepoRewind is not a Git client, a source-code explainer, or a quality score. It keeps one read-only history connected across four jobs:

- **Replay:** reconstruct real states on a selected first-parent line with stable path-based geography.
- **Investigate:** search commits, paths, people, releases, and reachable branch tips; inspect eight deterministic archaeology views with visible limits.
- **Compare:** pin any two eras and follow construction, demolition, line deltas, and rename chains.
- **Present:** choose evidence-backed chapters, review every disclosed field, and export a public-safe story pack.

Every finding links back to commit or path evidence. RepoRewind never labels code as good, bad, risky, or low quality.

## What you can do

| Job         | Result                                                                               |
| ----------- | ------------------------------------------------------------------------------------ |
| Replay      | Travel through repository states that actually existed.                              |
| Investigate | Search commits, paths, contributors, releases, and reachable branch tips.            |
| Compare     | Pin two eras and follow construction, deletion, line deltas, and rename chains.      |
| Present     | Export a privacy-reviewed film or story pack with a disclosure report and checksums. |

## Git evidence becomes a city grammar

| Git evidence       | RepoRewind representation                       |
| ------------------ | ----------------------------------------------- |
| File               | Building; height follows its current line count |
| Top-level folder   | Stable district separated by avenues            |
| Contributor        | Traveler at the latest work site                |
| Commit             | Construction, demolition, or rebuilding signal  |
| Tag or release     | Landmark in the city and timeline               |
| Rename or refactor | Neighborhood rebuilding event                   |
| Deleted file       | Permanent selectable ruin                       |

The checked-out branch is canonical by default. Side branches remain reachable refs and merge events instead of being flattened into invented repository states. Use an explicit ref or a bounded history when needed:

```bash
npx reporewind /path/to/repository --branch release/3.x
npx reporewind /path/to/repository --max-commits 5000
```

## Portable archives

The automatic loopback viewer is the fastest local path. Generate JSON only when you need a portable archive for the hosted viewer or another tool:

```bash
npx reporewind analyze /path/to/repository \
  --output ./reporewind-history.json
```

Then choose **Open archive** in the [hosted viewer](https://othmaneblial.github.io/RepoRewind/play/). The file is processed in that tab, never uploaded, and cleared on refresh.

Useful variants:

```bash
# Pipe clean JSON
npx reporewind analyze /path/to/repository --stdout > reporewind-history.json

# Explicitly replace an existing archive
npx reporewind analyze /path/to/repository \
  --output ./reporewind-history.json --force
```

## Privacy is enforced at each boundary

- The CLI reads Git structure and numeric diffs, not file contents.
- Contributor email addresses are omitted unless `--include-emails` is explicit.
- Automatic sessions stay in process memory behind a tokenized loopback URL and write no temporary archive.
- Hosted imports remain in the current browser tab; refresh clears them.
- Public export defaults hide repository names, people, messages, hashes, paths, refs, remotes, emails, and exact dates.
- Story packs include a machine-readable privacy report and SHA-256 manifest, never the raw history archive.

Archives can still contain sensitive names, paths, messages, dates, refs, and remotes. Review before sharing. Read the complete [privacy inventory](./docs/privacy.md), [security policy](./SECURITY.md), [story-pack contract](./docs/story-pack.md), and [Story Director scoring](./docs/story-director.md).

## Architecture

```text
Local Git repository
        ↓
Streaming analyzer
        ↓
Tokenized local viewer  or  portable JSON archive
        ↓
Validation + indexed checkpoints
        ↓
Search · replay · compare
        ↓
3D city  ·  text evidence  ·  reviewed story pack
```

See [architecture](./docs/architecture.md), [performance methodology](./docs/performance.md), [non-WebGL behavior](./docs/non-webgl.md), and [troubleshooting](./docs/troubleshooting.md).

## Develop and verify

```bash
npm ci
npm run dev
npm run verify
```

`npm run verify` checks formatting, lint, documentation, community and gallery contracts, licenses, benchmark baselines, 82 application/CLI tests, TypeScript, browser and CLI builds, the Pages bundle, package contents, and high-severity dependency advisories. Repository Actions remain disabled for ordinary pushes; the same full gate stays available locally and is re-enabled only for an explicit release run.

The browser build is emitted to `dist/`, the CLI to `dist-cli/`, and the combined Pages artifact to `.pages-site/`. Development and preview servers bind to localhost by default.

## Release status

- [`v0.2.0`](https://github.com/OthmaneBlial/RepoRewind/releases/tag/v0.2.0) is the current source release and [`reporewind@0.2.0`](https://www.npmjs.com/package/reporewind/v/0.2.0) is the matching public package.
- The release includes automatic local sessions, the guided case, Share Safety, story packs, Story Director, archaeology views, performance tiers, and the non-WebGL evidence workspace.
- The tag, package, provenance statement, public install path, live playground, and displayed version are verified as one release gate.

See the [roadmap](./ROADMAP.md), [changelog](./CHANGELOG.md), and [release checklist](./docs/release-checklist.md).

## Contribute a useful trace

Start with a maintained [`good first issue`](https://github.com/OthmaneBlial/RepoRewind/labels/good%20first%20issue) or [`help wanted`](https://github.com/OthmaneBlial/RepoRewind/labels/help%20wanted) task. Valuable non-code contributions include permissioned gallery histories, keyboard/reduced-motion QA, browser export checks, bounded benchmark captures, and documentation corrections.

Read [CONTRIBUTING.md](./CONTRIBUTING.md) and the [community contract](./docs/community.md) before a broad change.

## License

[MIT](./LICENSE) © Othmane Blial. Browser runtime notices are listed in [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
