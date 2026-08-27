# RepoRewind product and adoption roadmap

> **Positioning:** the private documentary of your codebase.

Status: active delivery plan based on a repository, product, distribution, and competitive audit completed on **2026-08-27**.

RepoRewind already has a coherent product: it turns truthful Git history into a stable city that can be replayed, searched, compared, inspected, and filmed. The next milestone is not “more 3D.” It is making that value immediate, useful, safe to share, and easy for other people to extend.

Stars are a downstream signal, not a deliverable. This roadmap optimizes the things the project can control: comprehension, time to first real replay, trust, useful repeat workflows, shareable output, release quality, and contributor success.

## North star

A developer should be able to:

1. understand RepoRewind in 15 seconds from a moving example;
2. try the real interactive demo in one click;
3. run one command inside a local repository and reach its first city in under two minutes;
4. turn a Git-backed finding into a reviewed, privacy-safe artifact in under one additional minute;
5. share that artifact with a clear path back to RepoRewind;
6. return for release retrospectives, onboarding, and repository archaeology—not only for a one-time visual effect.

The loop to build is:

```text
see a striking history → try the live demo → replay a real repository
          ↑                                      ↓
discover RepoRewind ← share a reviewed artifact ← find a useful story
```

## Audit: what is already strong

- A distinctive, internally consistent visual language: files/buildings, folders/districts, contributors/travelers, releases/landmarks, refactors/rebuilding, and deleted-code ruins.
- Truthful first-parent replay instead of an invented flattening of unrelated branch states.
- Search across files, commits, contributors, releases, and branch tips.
- Rename-aware comparison between two eras.
- Deterministic browser-native MP4/WebM film export with a branded closing frame.
- A strong local-first boundary: no accounts, backend, analytics, telemetry, source upload, or contributor email export by default.
- Runtime validation, worker-based preparation, bounded caches, accessibility behavior, responsive UI, multi-platform CI, security/privacy documentation, and a verified `v0.1.0` release.

These foundations should be preserved. Replacing them with a generic Git graph, AI summary, or cloud dashboard would erase the project's strongest differentiation.

## Audit: what blocks adoption today

Snapshot on 2026-08-27:

| Blocker                              | Current evidence                                                                                                      | Consequence                                                                             |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| No instant product trial             | The public showcase is static and `/RepoRewind/play/` returns `404`                                                   | Visitors see screenshots but cannot feel the replay                                     |
| No supported one-command install     | `package.json` is private and the public npm package is absent                                                        | A real repository requires clone, install, dev server, analysis, and manual JSON import |
| Motion is hidden                     | The README starts with four still screenshots                                                                         | The most distinctive behavior is invisible above the fold                               |
| Weak share loop                      | Film export exists, but there is no reviewed poster/card, Markdown snippet, public showcase bundle, or release Action | An output does not reliably create the next discovery                                   |
| Limited repeat utility               | Search and comparison are powerful but the app does not yet surface opinionated repository stories                    | The product risks being experienced once and forgotten                                  |
| No community surface                 | No public issues, Discussions are disabled, and there are no ready `good first issue` tasks                           | Interested visitors have no obvious low-friction next step                              |
| Default social preview               | GitHub reports no custom Open Graph image                                                                             | Shared repository links do not show RepoRewind's strongest visual proof                 |
| Unproven large-repository experience | Safety ceilings exist, but there is no versioned benchmark suite or published performance envelope                    | Maintainers cannot predict whether their repository will work well                      |

The repository had **0 stars and 0 forks** at the audit snapshot. That does not mean the product lacks substance; it means discovery and activation have not started working yet.

## The market position to own

RepoRewind should not introduce itself as “another Git visualizer.”

| Existing category                                                | What it already does well                              | RepoRewind's defensible difference                                                                    |
| ---------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| [Gource](https://github.com/acaudwell/Gource)                    | Immediate, recognizable repository-evolution spectacle | Searchable, evidence-backed history with stable geography, era comparison, and a directed documentary |
| [GitLens](https://github.com/gitkraken/vscode-gitlens)           | Daily in-editor Git inspection and operations          | Retrospective onboarding, archaeology, and presentation outside the IDE                               |
| [git-sim](https://github.com/initialcommit-com/git-sim)          | Educational simulations and direct image/video output  | The actual multi-year history of a repository, not a simulated Git command                            |
| [Repo Visualizer](https://github.com/githubocto/repo-visualizer) | A CI-generated static repository map                   | A maintained history card/trailer that leads to a rich local-first replay                             |

The short promise should remain understandable without mentioning implementation details:

> **Replay how your codebase became what it is—privately, from real Git evidence.**

## Product principles

Every roadmap item must respect these boundaries:

1. **Local is canonical.** Private repository analysis stays on the operator's machine. Public automation is explicit and opt-in.
2. **Git evidence before interpretation.** Every insight links back to commits, paths, releases, contributors, or measured change data. Do not invent intent or code quality.
3. **Private generation and public publishing are separate actions.** Nothing uploads or publishes repository metadata by default.
4. **One exceptional workflow before platform sprawl.** Strengthen analyze → explore → understand → review → export.
5. **No manipulative growth mechanics.** No star gates, pop-up begging, fake counters, automatic social posts, or generated commits by default.
6. **Proof is layered.** Implemented, tested, visually inspected, packaged, released, and publicly deployed are different states.

## P0 — The two-minute real-repository path

Goal: remove every unnecessary step between curiosity and the first truthful city.

### P0.1 — Deploy the real interactive playground

**Shipped 2026-08-27.** The production app is live at [othmaneblial.github.io/RepoRewind/play/](https://othmaneblial.github.io/RepoRewind/play/). Source commit: [`d3e2896`](https://github.com/OthmaneBlial/RepoRewind/commit/d3e2896). Pages commit: [`96454fb`](https://github.com/OthmaneBlial/OthmaneBlial.github.io/commit/96454fb).

Publish the production web app at a stable route such as `/RepoRewind/play/` and make **Try the live demo** the primary showcase and README call to action.

Scope:

- host the actual bundled fictional archive, not a video pretending to be interactive;
- preserve import, search, comparison, accessibility, reduced motion, and WebGL fallback behavior;
- add a clear **Replay your own repository** handoff to the local command;
- explain that loading the web app transfers static assets, while imported repository data remains in browser memory and is not uploaded;
- verify the security policy actually enforced by the chosen host instead of treating the current Netlify-style `_headers` file as active on GitHub Pages.

Acceptance:

- the route returns `200` over HTTPS and all versioned assets load;
- the fictional replay is usable by mouse and keyboard on current desktop browsers;
- search, pin/compare, and export open from the hosted build;
- a malformed archive is rejected without leaking its content;
- no repository-data request, analytics request, console error, broken image, or unexpected horizontal overflow occurs;
- the showcase, README, and repository homepage all link to the same canonical playground.

Effort: **S**. Dependency: none.

### P0.2 — Publish a real npm/npx CLI

**Implementation complete 2026-08-27; registry publication pending `v0.2.0`.** The exact packed tarball passes version, archive, tokenized loopback viewer, and clean-shutdown smoke tests. [CI run `33082632368`](https://github.com/OthmaneBlial/RepoRewind/actions/runs/33082632368) proves that tarball contract on Node 22/Linux and Node 24/macOS/Windows. The remaining acceptance gate is the public npm release and provenance verification.

Turn the existing executable foundation into two supported public workflows:

```bash
npx reporewind analyze . --output reporewind-history.json
npx reporewind .
```

The second command should analyze the selected repository, start a read-only loopback viewer on a random available port, load the archive automatically, and open the browser. `analyze` remains available for portable archives and scripted use.

Security and packaging contract:

- bind to `127.0.0.1`, never `0.0.0.0`, by default;
- use an unpredictable single-session URL and expose only `GET`/`HEAD` resources;
- reflect no filesystem path into the page;
- add `--no-open` for remote shells and print the exact local URL;
- clean temporary material on normal shutdown and explain recovery after interruption;
- keep checked-out branch/first-parent as the default and never auto-fetch refs, LFS data, or submodules;
- add a narrow npm `files` allowlist, repository/homepage/bugs metadata, public publish configuration, and trusted publishing with provenance;
- disclose that the first `npx` run contacts npm to download RepoRewind even though repository analysis remains local.

Acceptance:

- `npm view reporewind version` returns the released version;
- the exact packed tarball passes `--version`, fixture analysis, and `--no-open` viewer smoke tests on Linux, macOS, and Windows;
- a clean user can go from `npx reporewind .` to a loaded city without cloning RepoRewind or selecting a JSON file;
- no `.env`, logs, source maps, unrelated research, private fixtures, or local paths enter the tarball;
- lifecycle, port conflicts, browser-open failure, Ctrl-C, shallow history, invalid refs, and unsupported Node versions have actionable messages.

Effort: **M**. Dependency: P0.1 can ship independently, but both form the activation release.

### P0.3 — Rebuild the README around the first success

**Implemented, published, and verified 2026-08-27.** The README now leads with a real 12-second 640×360 product replay (4.6 MB), a reduced-motion/static fallback, the canonical command and expected result, the local-first contract, and three repeat workflows. GitHub serves the custom 1280×640 social preview from `repository-images.githubusercontent.com`; the downloaded public image is byte-for-byte identical to `docs/social-preview.png` (SHA-256 `da160f8b03a0aa7f36a795a2226fa2da5811a0c003ee9a4f129fc483b52a9bf7`). Clean-directory command proof remains part of P0.2's public npm release gate.

The README should sell one result before cataloguing the architecture.

Recommended order:

1. one-sentence promise;
2. a lightweight 12–20 second replay showing growth, a release, a rebuild, and a ruin;
3. **Try live** and **Run on my repository** actions;
4. one canonical command with the expected result beside it;
5. the local-first data contract;
6. three repeatable jobs: onboard, investigate, present;
7. deeper features, architecture, development, and limits.

Also:

- add a custom 1280×640 GitHub social-preview image with legible product name and promise;
- keep only useful badges;
- use accurate discovery topics such as `git`, `git-history`, `git-visualization`, `cli`, `developer-tools`, `local-first`, `threejs`, and `webgl`;
- link this roadmap from the README;
- show commands for both the live demo and a real repository without mixing user installation with contributor setup.

Acceptance:

- a new visitor can answer “what is it?”, “why use it?”, “is my code uploaded?”, and “what command do I run?” without scrolling past the first product proof;
- every command is tested from a clean directory against the exact public release;
- the animated asset is readable on GitHub, has a static fallback and alt text, and does not make the README unreasonably heavy;
- repository links render the custom social preview.

Effort: **S**. Dependency: use the final P0.2 command, not a placeholder.

### P0.4 — Ship `v0.2.0` as the activation release

**Release candidate prepared 2026-08-27; external publication pending.** Package/changelog versioning, release notes, migration and rollback guidance, a tag/version guard, and an OIDC release workflow are present. The package name must first be created by an authenticated npm publisher before npm can attach the trusted GitHub workflow and issue provenance for the stable release.

Release theme: **“Your repository, one command away.”**

Acceptance:

- `npm run verify` passes from a clean checkout;
- the exact npm artifact is installed and exercised in clean Linux, macOS, and Windows environments;
- npm provenance, changelog, migration notes, supported versions, and rollback instructions are present;
- the live playground, npm package, tag, GitHub Release, README command, and displayed version agree;
- the release contains a real replay artifact generated by the released version.

## P1 — Make every useful story safely shareable

Goal: turn private analysis into an explicit review → export → discovery loop.

### P1.1 — Add a share-safety review

**Implemented and verified locally 2026-08-27.** Film export now opens with a public-safe projection, a field-level disclosure ledger, explicit gates for sensitive public overrides and email-bearing archives, partial-history labeling, and a versioned JSON privacy report. The canonical archive is never mutated. Unit, UI, and exact export-copy snapshots cover the defaults and gates; browser QA confirms the scrollable modal and disabled/enabled review states without horizontal overflow.

“No source code” does not mean “safe to publish.” The current archive can contain names, paths, commit messages, hashes, refs, dates, and a remote.

Before any public preset, show a field-level preview and offer deterministic redaction for:

- repository name and remote;
- contributor display names;
- commit messages and hashes;
- full paths, basenames, extensions, or hidden paths;
- branch/tag names;
- exact dates versus month/year ranges;
- aggregate counts.

Rules:

- public presets omit emails, individual names, paths, messages, remotes, and exact hashes by default;
- an archive containing emails cannot use a public preset without a second explicit override;
- a machine-readable privacy report records included fields, omitted fields, ref scope, archive size, history completeness, and RepoRewind/schema versions;
- shallow repositories are labeled **partial history**; RepoRewind may suggest a fetch command but must not fetch automatically.

Acceptance:

- privacy defaults are covered by unit and export snapshot tests;
- every visible field in an exported artifact appears in the review;
- redaction changes only the presentation projection, never the truthful canonical archive;
- canceled exports leave no durable browser state.

Effort: **M**. Dependency: P0.2.

### P1.2 — Ship a “history story pack”

**Implemented and verified locally 2026-08-27.** One reviewed export now produces a stable eight-file ZIP with four documented PNG sizes, the selected MP4/WebM trailer, a GitHub-ready Markdown snippet, a privacy report, and a versioned SHA-256 manifest. A real 12-second public WebM pack was rendered in Chrome, visually inspected, extracted successfully, verified against every checksum, and scanned for omitted sample names, messages, remotes, and paths.

One reviewed export should produce a coherent optional bundle:

- 1200×630 social card;
- square and 16:9 poster variants;
- current-frame PNG;
- short 12–20 second MP4/WebM trailer;
- Markdown snippet with useful alt text and a link to the live demo/project;
- compact manifest with version, schema, selected ref/range, included fields, and artifact SHA-256.

Prefer PNG plus linked MP4/WebM over GIF as the default quality path. Never hide attribution removal behind payment, but make a restrained **Made with RepoRewind** link the default for public presets.

Acceptance:

- the default poster contains aggregates only and passes the share-safety policy;
- exports have stable filenames and render at documented dimensions;
- the Markdown snippet works in a real GitHub README;
- video remains cancelable and does not claim byte-identical output across hardware encoders;
- the bundle never embeds the raw history archive or local paths in media metadata.

Effort: **M**. Dependency: P1.1.

### P1.3 — Add a deterministic Story Director

**Implemented and verified locally 2026-08-27.** Export now proposes seven deterministic, scored chapter types with human-readable definitions and commit-index/hash evidence. Users can reorder, exclude, retitle, and jump to evidence; the chosen order drives film frames and the story-pack README/manifest. Public custom titles require a separate Share Safety confirmation. Tests cover ties, renames, merges, truncation, missing tags, reordered frame plans, and three versioned fixtures of different sizes; desktop browser QA confirms all seven controls, the evidence jump, review gate, and overflow-free modal.

Turn the replay engine into opinionated, evidence-backed chapters:

- **Origins:** first commit to first stable release;
- **Growth spurts:** periods with the largest measured structural expansion;
- **Rebuilds:** rename/refactor-heavy moments;
- **Release to release:** the exact delta between two tags;
- **Ownership journeys:** contributor concentration and handoffs by district;
- **Ruins:** important paths that disappeared;
- **The last year:** a bounded recent-history update.

Each selected chapter must state why it was chosen and link to its Git evidence. Users can reorder, include, exclude, and retitle chapters before export. No language model is required for the first version.

Acceptance:

- selection is deterministic for the same archive and settings;
- every chapter has a documented scoring definition and evidence links;
- tests cover ties, renames, merges, shallow/truncated archives, and repositories without tags;
- the director produces a useful story for at least three versioned public fixtures of different sizes.

Effort: **L**. Dependency: P1.1; can ship after the basic story pack.

### P1.4 — Create an opt-in GitHub Action

Start with a deterministic poster, not CI video.

**Implemented and verified 2026-08-27.** A manual read-only workflow now renders the fixed public-safe evidence poster twice, rejects pixel drift, and uploads only a private 1/3/7-day artifact containing the poster, privacy report, non-publication manifest, and SHA-256 checksums. Third-party Actions are immutable-SHA pinned, complete history is explicit, caller and GitHub values enter the generator only through environment variables, and contract tests reject automatic triggers, write permissions, or publication commands. A [real hosted run](https://github.com/OthmaneBlial/RepoRewind/actions/runs/33095678418) completed on pinned Node 24 + Chromium; its downloaded four-file artifact passed all checksums, measured 1200×630, recorded `published: false` with one-day retention, and matched the same local private-visibility dry run. Private/internal visibility changes only the manifest label and never enables publishing.

Safe rollout:

1. manual `workflow_dispatch` generation;
2. optional tag/release generation;
3. upload a short-retention private Actions artifact;
4. publish to a Release or Pages only in a separate, reviewed job.

Defaults:

- full history is intentional with `fetch-depth: 0`;
- `permissions: contents: read` for generation;
- all third-party Actions are pinned to full commit SHAs;
- no generated commit, PR comment, Pages deployment, or release upload by default;
- private repositories require an explicit publish override and protected environment approval;
- CI video remains experimental until a deterministic software-render path is proven.

Acceptance:

- a public fixture generates the same poster pixels on repeated supported runs;
- a private-repository dry run cannot publish by default;
- the artifact includes a checksum and privacy manifest with a clear retention period;
- untrusted commit messages, paths, branch names, and PR metadata never enter shell commands.

Effort: **M**. Dependency: P1.1 and the deterministic poster from P1.2.

## P1 — Turn the visual effect into repeat utility

Goal: help maintainers answer real questions and return to RepoRewind.

### P1.5 — Add an evidence-backed archaeology desk

**Implementation complete 2026-08-27; release verification pending.** The viewer now exposes eight deterministic, bounded text views with visible definitions and limits, archive-specific warnings, and direct timeline/path evidence navigation. Single-author, no-tag, truncated monorepo-like, and rename-heavy fixtures are covered. The exact [metric contract](./docs/archaeology.md) is versioned with the source.

Introduce a focused insights panel derived only from existing metadata:

- most frequently changed paths;
- recent versus historical churn;
- contributor concentration by district;
- ownership handoffs;
- dormant or deleted high-activity paths;
- release-to-release structural deltas;
- large renames and migrations;
- activity distribution over time.

Every metric needs a plain-language definition, visible limits, and a jump to the relevant commits/files. Avoid labels such as “bad code,” “risk,” or “quality” unless the evidence actually supports them.

Acceptance:

- each metric is deterministic and documented;
- each ranked item can navigate to supporting evidence;
- fixtures cover single-author, no-tag, monorepo-like, truncated, and rename-heavy histories;
- the panel remains useful without WebGL.

Effort: **L**. Dependency: the existing index is sufficient for a first slice.

### P1.6 — Publish a real performance envelope

**Implemented and verified 2026-08-27.** Fixture contract `v1` now covers 120, 1,000, and 5,000 commits; the production analyzer, validation/index, layout/snapshot, worker/no-worker browser load, WebGL playback, non-WebGL behavior, and a real story-pack export are measured into versioned JSON. An Apple M2 baseline and [methodology](./docs/performance.md) are checked in. The [hosted Node 24 + Chromium run](https://github.com/OthmaneBlial/RepoRewind/actions/runs/33095688793) completed successfully and published the complete advisory JSON: all Node and first-interactive budgets passed, forced-no-WebGL workflows and 1200×630 poster passed, and the real 12-second 640×360 export completed. Measurements justified deterministic cinematic, balanced, and dense renderer tiers; hosted software-render playback remains advisory because its low FPS is not representative of an interactive GPU session.

Create versioned public fixtures and benchmarks for small, medium, and large histories.

Measure:

- analyzer time and peak memory;
- archive size;
- validation/index time;
- time to first interactive frame;
- playback frame-rate bands;
- poster and film export time;
- behavior with and without workers/WebGL.

Use the results to add renderer quality tiers, progressive city population, or adaptive effects only where measurements justify them.

Acceptance:

- benchmarks run reproducibly outside the main pass/fail CI gate and publish versioned results;
- documented hardware and fixture sizes accompany every claim;
- regressions have agreed budgets before becoming release blockers;
- ordinary repositories get a fast first frame without waiting for the entire cinematic bundle.

Effort: **M**. Dependency: P0.2 provides the realistic entry path to measure.

### P1.7 — Provide a useful non-WebGL mode

**Implemented and verified 2026-08-27.** Renderer creation now fails closed into an [evidence workspace](./docs/non-webgl.md) over the same imported archive and timeline engine, without an extra WebGL probe or an uncaught page error. Search, eight Insights views, keyboard-readable file evidence, pin/compare, Story Director jumps, and a fixed public-safe 1200×630 PNG plus privacy report remain available. Unit/UI tests and a real Chrome run with WebGL and GPU disabled verify every workflow, 390 px no-overflow behavior, poster dimensions, and the absence of an uncaught page error.

Search, compare, timeline evidence, and story chapters should remain usable when 3D rendering is unavailable, reduced, or impractical on a small device.

This is not a second product. It is an accessible archive/table view over the same engine and evidence.

Acceptance:

- the same imported archive can be searched, compared, and exported as a poster without WebGL;
- keyboard and screen-reader workflows do not depend on canvas selection;
- the application explains capability differences without labeling the whole repository unsupported.

Effort: **M/L**. Dependency: P1.5 can supply the evidence-oriented UI.

## P2 — Build a contributor and showcase flywheel

Goal: convert interest into examples, feedback, integrations, and maintained releases.

### P2.1 — Open community surfaces with real content

**Implemented and verified 2026-08-27; ongoing response target.** Discussions is live with `Show and tell`, answerable `Q&A`, `Ideas`, and restricted `Releases`. Show and tell launched with three reviewed, reproducible histories ([RepoRewind](https://github.com/OthmaneBlial/RepoRewind/discussions/11), [LightClaw](https://github.com/OthmaneBlial/RepoRewind/discussions/12), and [PDF Editor Offline](https://github.com/OthmaneBlial/RepoRewind/discussions/13)) rather than an empty prompt. Seven public issues ([#4–#10](https://github.com/OthmaneBlial/RepoRewind/issues)) cover every defined contribution lane with scope, files, acceptance, commands, and visual references where needed; a checked-in contract keeps 5–10 tasks complete. The full gate passed from a clean clone under Node 24.20.0. The community guide records the 48-hour target, and generated release notes route labeled first contributions into a linked `First-time contributors` section.

- Enable Discussions with `Show and tell`, `Q&A`, `Ideas`, and `Releases`.
- Seed `Show and tell` with three reviewed histories made by the current release.
- Publish 5–10 genuinely ready `good first issue` or `help wanted` tasks. Each needs scope, relevant files, acceptance criteria, test commands, and visual references where applicable.
- Create contribution lanes around accessibility, public fixtures, packaging, performance, export templates, documentation, and bounded visual themes.
- Credit first-time contributors in release notes and the public gallery.

Do not open an empty community and expect it to create demand. P0/P1 outputs provide the material people can discuss and extend.

Acceptance:

- every starter issue is independently testable and maintained;
- questions receive a maintainer response target of 48 hours;
- contribution setup works from a clean clone;
- release notes distinguish first-time contributors and link their work.

Effort: **S ongoing**. Dependency: stable P0 contracts.

### P2.2 — Publish a curated documentary gallery

Invite maintainers to submit an explicitly reviewed story pack for a public repository. Each gallery entry should explain a real finding, not merely show a pretty skyline.

**Implemented, published, and verified 2026-08-27.** The [documentary gallery](https://othmaneblial.github.io/RepoRewind/gallery.html) launches with three owner-permissioned public MIT repositories and editorial findings about productization, module extraction, and a project-wide rename. Every entry records an immutable source head, complete first-parent range, release-candidate generator version/SHA, fixed public redaction choices, interpretation limit, checksum-verified 1200×630 poster and privacy report, plus an exact clone/build/analyze command tested against the pinned RepoRewind commit. The [machine-readable manifest](https://othmaneblial.github.io/RepoRewind/gallery/entries.json) is enforced by the main gate. Temporary clones and history JSON were deleted after review; only aggregate public posters and privacy reports are published. Pages deployment, live HTTP/SHA and desktop-browser checks, plus mobile layout/navigation over the byte-identical bundle, lazy images, and zero console errors were verified.

Possible editorial formats:

- “Ten years in twenty seconds”;
- “The migration that rebuilt the city”;
- “From first commit to v1.0”;
- “The district that changed maintainers”;
- “What disappeared between two releases.”

Acceptance:

- each entry records permission/provenance, source repository, RepoRewind version, selected ref/range, and redaction choices;
- entries link to the project, the source repository, and the exact command needed to make another replay;
- no private archive is retained or published;
- gallery value is evaluated by qualified demo/quickstart visits, not raw impressions.

Effort: **M editorial + S engineering**. Dependency: P1.2.

### P2.3 — Expand distribution only after npm is stable

Order:

1. npm/npx;
2. a personal Homebrew tap wrapping immutable, checksummed releases;
3. standalone signed/notarized binaries when “Node required” is a proven blocker;
4. editor or desktop integrations only after repeated user demand.

Do not pursue `homebrew/core`, a Tauri/Electron desktop shell, or a large binary release matrix before the package contract and one-command workflow are stable.

Acceptance for every channel:

- the exact released artifact is installed on a clean supported machine;
- version, checksum, provenance, update, and uninstall behavior are documented;
- the channel is removed from prominent docs if it falls behind the current release.

Effort: **M/L** depending on channel. Dependency: multiple stable npm releases.

## Launch sequence

Do not launch the current clone-and-import workflow as if it were finished. Use product milestones as credible release stories.

### Launch 1 — `v0.2.0`: Your repository, one command away

Required assets:

- live playground;
- exact `npx reporewind .` command;
- 12–20 second replay of RepoRewind's own history;
- custom social preview;
- clean-install proof for all supported operating systems;
- concise article explaining the local-first architecture and why no source leaves the machine.

### Launch 2 — `v0.3.0`: Turn Git history into a safe story pack

Required assets:

- field-level privacy review;
- poster, current-frame image, short film, and Markdown export;
- three real, permissioned examples;
- a `Show and tell` Discussion with reproducible commands.

### Launch 3 — `v0.4.0`: Ask your repository how it became this way

Required assets:

- deterministic Story Director;
- release-to-release and ownership-handoff workflows;
- evidence-backed archaeology panel;
- published performance envelope;
- opt-in poster Action.

For each launch, prepare one canonical demo, one technical explanation, one short visual artifact, and one direct quickstart. Share them where maintainers and developer-tool users already discuss real tools, follow each community's current rules, and avoid repetitive cross-post spam. A launch without a working trial and exact install path wastes attention.

## Metrics and decision gates

Preserve the no-telemetry principle. Use GitHub's aggregate traffic, package/release downloads, opt-in feedback, support reports, and controlled smoke tests.

| Stage      | Leading indicator                                         | Initial target before expanding scope                                               |
| ---------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Understand | Visitor can state the product and privacy promise         | 8/10 moderated first-impression testers succeed in 15 seconds                       |
| Try        | Time to first fictional replay                            | One click, no setup                                                                 |
| Activate   | Time to first real repository replay                      | Median under 2 minutes in release smoke tests; ≥90% supported-environment success   |
| Trust      | User can identify what an archive/share pack contains     | 100% of public presets show and enforce the field-level review                      |
| Use        | Tester finds one evidence-backed historical insight       | ≥70% in a 10-person beta before adding broad integrations                           |
| Share      | Activated tester creates a reviewed artifact              | ≥20% in the same beta or a clear qualitative reason not to                          |
| Discover   | Shared artifacts send qualified visits to demo/quickstart | Positive referral signal across at least three gallery examples                     |
| Contribute | New contributor completes a bounded change                | Five ready starter issues, <48-hour first response, and tracked first-PR completion |
| Return     | Maintainer uses RepoRewind for another range/release      | Demonstrated in beta interviews or voluntary Show-and-tell posts                    |
| Stars      | Qualified visitors choose to watch/star/fork              | Track as a lagging outcome; never optimize it in isolation                          |

Record a weekly snapshot of GitHub's rolling traffic window so discovery changes are not lost. Do not introduce product telemetry merely to produce attractive funnel numbers.

### Stop/go rules

- Do not build the GitHub Action until local share redaction and deterministic posters work.
- Do not build CI video until a reliable software-render path exists.
- Do not build standalone binaries until the npm path has real users and clean-install evidence.
- Do not add unrelated AI, collaboration, issue tracking, code review, or Git-operation features to chase adjacent audiences.
- If the live demo gets visits but `npx` activation fails, fix packaging/onboarding before adding Story Director features.
- If activation succeeds but sharing does not, interview users about safety, usefulness, and output format before adding more channels.

## Definition of done for every milestone

An item is complete only when all applicable layers are evidenced:

- **Specified:** user job, privacy boundary, failure modes, and acceptance criteria are written.
- **Implemented:** no placeholder or demo-only path is presented as the product.
- **Tested:** automated coverage protects data contracts, deterministic behavior, and failure handling.
- **Visually inspected:** desktop, narrow layout, keyboard, reduced motion, WebGL fallback, and export output are checked where relevant.
- **Packaged:** the exact artifact contents and install path are reviewed.
- **Released:** tag, changelog, package/release assets, checksums/provenance, and docs agree.
- **Deployed:** public routes and assets return successfully and the live interaction is verified.
- **Measured:** the relevant leading indicator is recorded without violating the privacy promise.

## Prioritized issue map

| Order | Issue                                                             | Priority | Effort | Depends on             |
| ----: | ----------------------------------------------------------------- | -------- | ------ | ---------------------- |
|     1 | Deploy `/play/` and link it as the primary demo                   | P0       | S      | —                      |
|     2 | Package and clean-install-test `reporewind` on npm                | P0       | M      | —                      |
|     3 | Add loopback `npx reporewind .` viewer orchestration              | P0       | M      | npm package            |
|     4 | Replace README still-first hero with moving proof and one command | P0       | S      | final CLI contract     |
|     5 | Add custom social preview and focused topics                      | P0       | S      | final positioning      |
|     6 | Release and verify `v0.2.0` across npm/GitHub/Pages               | P0       | M      | 1–5                    |
|     7 | Build field-level privacy report and redaction projection         | P1       | M      | stable archive/package |
|     8 | Export current frame and social poster presets                    | P1       | M      | privacy projection     |
|     9 | Export story pack and Markdown embed snippet                      | P1       | M      | poster + privacy       |
|    10 | Implement deterministic Story Director                            | P1       | L      | privacy projection     |
|    11 | Add evidence-backed archaeology desk                              | P1       | L      | existing history index |
|    12 | Publish versioned performance fixtures/benchmarks                 | P1       | M      | one-command path       |
|    13 | Provide non-WebGL evidence mode                                   | P1       | M/L    | archaeology desk       |
|    14 | Release opt-in poster Action                                      | P1       | M      | deterministic poster   |
|    15 | Seed Discussions and ready contributor issues                     | P2       | S      | stable P0 contracts    |
|    16 | Publish permissioned documentary gallery                          | P2       | M      | story pack             |
|    17 | Add Homebrew, then evaluate signed standalone binaries            | P2       | M/L    | stable npm adoption    |

## Sources and audit evidence

Repository evidence:

- [Current README](./README.md)
- [Package contract](./package.json)
- [Privacy boundary](./docs/privacy.md)
- [Performance notes](./docs/performance.md)
- [Release checklist](./docs/release-checklist.md)
- [Competitive research](./research_reporewind_growth/findings_competitive_landscape.md)
- [GitHub adoption research](./research_reporewind_growth/findings_github_adoption.md)
- [Distribution and share-loop research](./research_reporewind_growth/findings_distribution_share.md)

Primary external references:

- [GitHub: About READMEs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes)
- [GitHub: Repository topics](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics)
- [GitHub: Social preview](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview)
- [GitHub: Discussions](https://docs.github.com/en/discussions)
- [GitHub: Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)
- [GitHub: Workflow artifacts](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts)
- [npm: package.json fields](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/)
- [npm: provenance statements](https://docs.npmjs.com/generating-provenance-statements/)
- [Homebrew: Creating and maintaining a tap](https://docs.brew.sh/How-to-Create-and-Maintain-a-Tap)

## The shortest version

If only five things are built, build these in order:

1. live interactive demo;
2. `npx reporewind .`;
3. moving README proof plus custom social preview;
4. privacy-reviewed poster/film/Markdown story pack;
5. deterministic, evidence-backed story chapters.

That sequence makes RepoRewind easier to discover, easier to trust, dramatically easier to try, more useful than a one-time visualization, and naturally more shareable. It cannot guarantee stars; it gives the project a credible reason to earn them.
