# RepoRewind distribution and share-loop feasibility

Retrieved: **2026-08-27**

Scope: one-command local launch, package availability, CI-generated visual artifacts, static sharing, downloadable media, Git-history privacy, and Homebrew/binary distribution. External claims below use official platform documentation; repository-state claims were verified against the current checkout and public endpoints on the retrieval date.

## Executive recommendation

The shortest credible path is:

1. ship a narrowly packed npm CLI and make `npx reporewind analyze .` real;
2. add `npx reporewind .` as a loopback-only **analyze -> open local viewer** flow;
3. add a deterministic, redacted PNG/SVG “history card” export before attempting CI video;
4. provide an opt-in, least-privilege GitHub Action that uploads private artifacts but never publishes them by default;
5. make release assets the durable public download channel, while Pages hosts only explicitly approved public showcases;
6. add a personal Homebrew tap after the npm/package contract is stable; consider standalone binaries later.

This creates a useful loop — try locally, generate something striking, review it, share it — without turning private repository metadata into an automatic growth channel.

## Current state verified on 2026-08-27

### Confirmed facts

- `package.json` is named `reporewind`, has a `reporewind` `bin` entry pointing at `dist-cli/index.js`, and the source CLI already begins with `#!/usr/bin/env node`. That is the correct basic npm executable shape.
- The package also has `"private": true`. npm officially states that this makes npm refuse publication. The public npm registry returned `E404` for `reporewind`, so no public package was available under that name at retrieval time.
- The CLI currently implements `analyze`; it does not serve the built web app, open a browser, or feed the generated archive into the viewer. Therefore a true one-command local visual launch does not exist yet.
- The v0.1.0 GitHub release exists but has no uploaded assets. GitHub supplies only the automatic source ZIP and tarball. There is no installable standalone CLI archive or OS binary today.
- The app already downloads MP4 or WebM films locally. There is no PNG/SVG/JPEG history-card export in the current code.
- The existing CI runs tests/builds but does not generate or upload visual history artifacts.
- The analyzer already excludes source contents and contributor emails by default, strips credentials/query/fragment data from supported remotes, invokes Git without a shell, writes archives with owner-only permissions where supported, and requires an explicit `--include-emails` to serialize emails.
- Its default archive still contains potentially sensitive contributor names, commit messages, file paths, hashes, timestamps, tags/branches, numeric diffs, and a sanitized remote. “No source code” does not mean “safe to publish.”
- A live header check of `https://othmaneblial.github.io/RepoRewind/` returned GitHub Pages headers but no project CSP, `X-Frame-Options`, or `Cross-Origin-Resource-Policy`. The checked-in Netlify-style `_headers` file therefore must not be treated as an enforced control on the current Pages deployment.

### Practical implication

RepoRewind has most of the analyzer and browser-export foundations. Its distribution gap is packaging and orchestration; its share-loop gap is a small, reviewable visual artifact plus safe publication defaults.

## 1. npm / npx one-command local launch

### Confirmed platform capability

- npm maps a package's `bin` field into an executable and requires a Node shebang for that executable. `npm exec`/`npx` can download a package into npm's cache and run its single declared binary. RepoRewind's current `bin`/shebang structure is compatible with this model after publication.
- npm's `files` field is the allowlist for tarball contents; without it the default is broad. `npm pack --dry-run` can show what would be included without publishing.
- `"private": true` currently blocks publication by design.

Official sources:

- npm `package.json` fields (`private`, `files`, `bin`): https://docs.npmjs.com/cli/v11/configuring-npm/package-json/
- `npm exec` / `npx` resolution behavior: https://docs.npmjs.com/cli/npm-exec/
- `npm pack --dry-run`: https://docs.npmjs.com/cli/v11/commands/npm-pack/

### Recommended package contract

First release two explicit workflows:

```text
npx reporewind analyze . --output reporewind-history.json
npx reporewind .
```

The second should:

1. analyze the selected repository locally into a temporary archive;
2. start a read-only HTTP server bound to `127.0.0.1` on an available random port;
3. serve bundled `dist/` assets and make the archive available only through an unguessable, single-session URL;
4. open the default browser;
5. delete temporary material on clean shutdown and print the exact cleanup path after an interrupted run.

Before publishing:

- remove `private: true` only when release automation is ready;
- add a narrow `files` allowlist for `dist-cli/`, `dist/`, schema/license/notices, and required package metadata;
- add `prepack`/release checks that build, run `npm pack --dry-run`, inspect the tarball, install that exact tarball in a clean directory, analyze a fixture, and launch the viewer;
- declare `repository`, `homepage`, `bugs`, keywords, and `publishConfig.access: public`;
- publish through npm trusted publishing/OIDC if available to the repository, and keep the workflow permissions minimal;
- document that the first `npx` run contacts npm to download the tool even though repository analysis and viewing make no repo-data network requests.

### Constraints and inference

- **Inference:** a loopback server is the least disruptive bridge between the current CLI and static app; trying to make a hosted Pages app read arbitrary local Git directly is not a browser capability and would break the current trust boundary.
- Bind only to loopback, never `0.0.0.0` by default. A local web server with unauthenticated mutation endpoints could be reached by other local pages; keep the server read-only, use an unpredictable session token, reject non-GET/HEAD methods, set strict headers, and avoid reflecting filesystem paths.
- A one-shot command needs lifecycle UX: URL/port output, Ctrl-C behavior, browser-open failure fallback, Windows/macOS/Linux tests, stale-temp cleanup, and a `--no-open` option for remote shells.
- The current Node requirement (`^22.13 || ^24`) limits the eligible audience. Keep it if technically necessary, but report a friendly engine error and measure whether supporting the active LTS floor materially increases adoption.

## 2. GitHub Actions-generated history artifacts

### Confirmed platform capability

- GitHub Actions artifacts can contain screenshots, binary/compressed files, test output, and other workflow-generated files. `actions/upload-artifact` and `actions/download-artifact` are the official persistence mechanism.
- Artifacts are not permanent public hosting: the default retention is 90 days, and public-repository retention can be configured only within the repository/organization limit (official documentation currently describes 1–90 days for public repositories).
- `actions/checkout` fetches one commit by default. A meaningful RepoRewind analysis must set `fetch-depth: 0` to obtain full branch/tag history.

Official sources:

- Workflow artifacts: https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts
- Artifact retention and `retention-days`: https://docs.github.com/actions/configuring-and-managing-workflows/persisting-workflow-data-using-artifacts
- Full-history checkout: https://github.com/actions/checkout
- Secure Actions use: https://docs.github.com/en/actions/reference/security/secure-use

### Recommended action, in safe stages

**Stage A — private build artifact:** add a reusable/action workflow that runs on `workflow_dispatch` and optionally default-branch releases. It checks out full history, runs a pinned RepoRewind version, produces `reporewind-history.json` plus a manifest/checksum, and uploads them with a short explicit retention. This proves automation without publishing metadata.

**Stage B — deterministic share card:** add a non-WebGL renderer for a 1200x630 PNG or SVG containing only user-approved aggregate facts, for example repository name, time span, commit count, contributor count, releases, and a stylized skyline. Upload the card as an artifact and show a local preview/redaction report before any publication.

**Stage C — optional film:** make headless video a separate, allowed-to-fail experiment until it is reproducible. The current export relies on Canvas/WebGL plus runtime browser/hardware codec probes. Hosted-runner GPU/codec availability and byte-for-byte output are not guaranteed. A deterministic software-render/encode path would be needed before treating CI video as a release gate.

### Security constraints

- Use `permissions: contents: read` for generation. Do not grant `contents: write`, `pages: write`, or release permissions to the analysis job unless a separate reviewed publish job needs them.
- Pin every third-party Action to a full commit SHA; GitHub identifies this as the immutable option.
- Do not combine `pull_request_target`/`workflow_run`, base-repository secrets, and execution of fork-controlled code. The official checkout action explicitly calls out this “pwn request” class of risk.
- Do not interpolate branch names, commit messages, paths, or PR titles directly into shell commands. Pass untrusted values through environment variables or fixed argument arrays.
- A workflow running inside a private repository may legitimately read that repository, but uploading its history creates another stored copy. Default to short retention and never deploy it to Pages automatically.

## 3. Pages, static embeds, and durable public artifacts

### Confirmed platform capability

- GitHub Pages custom workflows can build and deploy static output with `configure-pages`, `upload-pages-artifact`, and `deploy-pages`. The deploy job needs `pages: write` and `id-token: write` and should use the protected `github-pages` environment.
- Pages deployment artifacts are for deploying a site; ordinary Actions artifacts remain ephemeral downloads. GitHub Releases are the correct durable versioned channel for downloadable software/media assets, and `gh release upload` can attach files to a release.
- GitHub Pages publishes static files. RepoRewind's built viewer is therefore hostable, but a public archive placed in that output is public data.

Official sources:

- Custom Pages workflows and permissions: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- GitHub releases and binary assets: https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases
- Uploading release assets: https://cli.github.com/manual/gh_release_upload

### Recommended share surfaces

- **README-safe card:** a small PNG/SVG with a Markdown snippet and alt text. This is the lowest-friction, most portable share object.
- **Linkable film:** an MP4/WebM downloaded locally, then explicitly attached by the user to a release or their own post. Add a branded final frame and a short URL, but never upload automatically.
- **Public interactive showcase:** a self-contained static folder containing the app plus one reviewed public archive. Generate a data-inventory/redaction report next to the publish button and require `--public` or an equivalent explicit confirmation.
- **Embed kit:** generate `poster.png`, `history.webm`, a link to the interactive showcase, and copyable Markdown/HTML. Prefer a poster linked to the full viewer over an iframe as the universal path.

### Constraints and inference

- **Inference:** an iframe embed can be offered only on hosting where RepoRewind deliberately controls and tests `Content-Security-Policy: frame-ancestors`. The current live Pages response does not enforce the checked-in `_headers`, so it cannot simultaneously promise clickjacking protection and arbitrary embedding based on that file.
- For an embeddable viewer, create a separate read-only route/build with no filesystem controls, imports, or navigation privileges, a minimal `postMessage` API, explicit allowed origins when hosted behind configurable headers, and a prominent public-data label.
- Do not deploy private repository artifacts to a public Pages site. Keep “generate” and “publish” as separate jobs with separate permissions and an environment approval gate.
- Ordinary Actions artifact URLs expire and often require GitHub access; they are evidence/downloads, not a durable social embed. Copy approved public assets to a release or Pages only after review.

## 4. Downloadable video and image artifacts

### Confirmed current capability

RepoRewind already creates downloadable MP4 and WebM blobs entirely in the browser. MP4 is conditional on the runtime H.264/WebCodecs probe; WebM uses browser MediaRecorder support. Output is local and operator-controlled.

### Recommended additions

- Add **Export history card** with 1200x630, square, and 16:9 presets. PNG should be the default; SVG is useful only if all imported text is escaped and bounded.
- Add **Export current frame** in addition to a full film. A compelling still is far faster to create, inspect, redact, and attach to a README or social post.
- Add a **privacy preview** that enumerates exactly which names, paths, messages, remote, dates, and counts will appear. Default cards should use aggregates and omit contributor names, paths, messages, and remotes.
- Add a compact manifest beside exports: RepoRewind version, archive schema, selected ref, commit range, included fields, and SHA-256. The manifest supports reproducibility without making the visual noisy.
- Provide short film presets (for example 12–20 seconds) and stable filenames, but preserve the current longer high-quality export for users who want it.

### Constraints and inference

- **Inference:** a still-card export should precede GIF support. GIFs are large and visually poor for this 3D product; PNG plus linked MP4/WebM gives better quality and easier redaction.
- Deterministic frame selection does not imply identical encoded video bytes across browsers/hardware. Checksums are still useful for a specific produced file, but should not be presented as cross-machine reproducibility.
- Do not put raw archives inside media metadata. Strip local paths, author emails, and unreviewed commit/path text from filenames, end cards, captions, and manifests.

## 5. Privacy-safe Git-history analysis

### Confirmed Git behavior

- Git log can emit author names and emails and can apply `.mailmap` canonical identities. A shallow clone deliberately truncates history; full visual history requires a non-shallow checkout.
- Therefore any Action or packaged tool must state when it analyzed incomplete history and must treat identity/commit/path data as sensitive even if source blobs are never read.

Official sources:

- Git log fields and `--mailmap`: https://git-scm.com/docs/git-log
- Shallow repository behavior: https://git-scm.com/docs/shallow
- Mailmap format: https://git-scm.com/docs/gitmailmap

### Recommended trust contract

- Preserve checked-out branch / first-parent as the default. Make broader ref analysis explicit.
- Add a machine-readable privacy report: included fields, omitted fields, email inclusion state, ref scope, history completeness, archive size, and warnings for suspicious paths/messages/remotes.
- Add redaction controls for contributor display names, commit messages, paths (full / basename / extension / category / hidden), remote, branch/tag names, and exact dates.
- Refuse public/share presets when emails are included unless the user passes a second explicit override.
- Detect shallow repositories (`git rev-parse --is-shallow-repository`) and mark the archive/card “partial history”; offer a command, not an automatic fetch, to deepen it.
- Never auto-fetch extra refs, submodules, or LFS data merely to create a visual. Fetching changes network and credential behavior and can expand the data scope beyond user intent.
- Keep Git invocation as fixed argument arrays without a shell, keep archive writes private by default, and retain runtime validation for imported archives.

## 6. Homebrew and standalone binaries

### Confirmed platform capability

- Anyone can create a third-party Homebrew tap. Homebrew recommends a `homebrew-...` repository name, supports direct one-command install from a tap, and its generated workflows can build bottles.
- Formulae should use immutable versioned sources with SHA-256 and tests. Homebrew's formula guidance provides npm-specific helpers (`std_npm_args`).
- Node's official Single Executable Application feature can bundle a JavaScript entry point and assets into an executable that runs without Node installed. The current documentation labels the feature “Active development”; module loading and platform/signing constraints apply.

Official sources:

- Creating/maintaining a tap: https://docs.brew.sh/How-to-Create-and-Maintain-a-Tap
- Formula cookbook and npm helper: https://docs.brew.sh/Formula-Cookbook
- `homebrew/core` acceptance requirements: https://docs.brew.sh/Acceptable-Formulae
- Homebrew bottles: https://docs.brew.sh/Bottles
- Node single-executable applications: https://nodejs.org/api/single-executable-applications.html

### Recommended distribution order

1. **npm/npx first:** it matches the existing Node CLI, works across supported OSes, and provides the fastest validated install path.
2. **Personal Homebrew tap second:** publish `OthmaneBlial/homebrew-tap` (or reuse an existing personal tap) with an immutable release URL/SHA, declared Node dependency, install test, and `reporewind --version` plus fixture-analysis test. This yields a credible one-command macOS/Linux install without waiting for `homebrew/core` acceptance.
3. **Standalone release binaries third:** build Node SEA artifacts separately for macOS arm64/x64, Linux x64/arm64, and Windows x64, bundle the static viewer assets, sign/notarize where appropriate, publish SHA-256 checksums and provenance, and install them from the tap only after clean-machine verification.
4. **`homebrew/core` later:** pursue it only after stable releases, real users, reproducible source builds, cross-platform tests, and an ongoing maintenance commitment. A personal tap is available immediately and is the practical early channel.

### Constraints and inference

- **Inference:** a Homebrew formula that merely wraps the npm package is lower risk than SEA binaries initially, but it still needs a reproducible dependency/install strategy and tests; do not make Homebrew the first release pipeline.
- Standalone binaries multiply the release matrix, signing work, vulnerability response surface, and clean-install verification burden. They are worthwhile when “no Node required” is proven to be an adoption blocker.
- macOS binaries should be signed/notarized for a low-friction user experience; Windows signing is also desirable. Never label a source archive as a ready-to-run binary.
- The current v0.1.0 release has no binary assets, so any Homebrew formula must not pretend those assets exist.

## Suggested roadmap acceptance criteria

### P0 — npm activation

- `npm view reporewind version` returns the released version.
- `npx reporewind --version`, `npx reporewind analyze <fixture>`, and `npx reporewind <fixture> --no-open` pass from the exact packed tarball on Linux, macOS, and Windows.
- Packed contents are allowlisted and reviewed; no source maps, test fixtures with sensitive data, `.env`, logs, or unrelated research files ship.
- The viewer binds to loopback, uses an unpredictable session URL, exposes no mutating endpoint, and cleans its temporary archive.

### P1 — safe share artifact

- A PNG history card exports in under a defined budget on an ordinary fixture and has 1200x630, square, and 16:9 presets.
- Default card output contains no emails, paths, messages, remote, or individual contributor names.
- The UI shows a field-level privacy preview and requires explicit confirmation for any public-data export.
- A copied Markdown snippet links the card to a viewer/demo with useful alt text.

### P1 — opt-in Action

- The workflow uses full history intentionally, `contents: read`, pinned Action SHAs, no secrets, and a short explicit retention.
- Default output is a private Actions artifact. Pages/release publication is a separate protected job and is off by default.
- Shallow/partial history and email inclusion are visible in the manifest and visual label.
- CI poster generation is deterministic; CI video remains non-blocking until reproducibility is proven.

### P2 — durable distribution

- Versioned release contains tested npm tarball metadata or standalone archives, SHA-256 checksums, and install instructions.
- Personal Homebrew tap installs and tests the exact released artifact on macOS and Linux.
- Standalone binaries, if shipped, are built per target, signed where appropriate, and verified from clean machines before release.

## Bottom line

All requested distribution paths are technically feasible, but they are not equally ready. npm/npx analysis is one packaging release away; the one-command viewer needs a small secure local-server orchestration layer; static cards and local film downloads are immediately compatible with a privacy-respecting share loop; Actions automation is feasible if artifact generation and publication remain separate; Homebrew is best introduced through a personal tap after npm stabilization; standalone binaries are a later convenience layer, not a prerequisite for adoption.
