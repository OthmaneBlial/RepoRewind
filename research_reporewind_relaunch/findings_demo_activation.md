# RepoRewind relaunch — demo and landing-page activation findings

Research date: 2026-09-01

## Scope and method

This is a focused activation study, not a general competitor survey. I used five web searches, then inspected official documentation and live products directly. Live responsive checks used 1440×900 and 390×844 viewports with reduced motion enabled. Sources are limited to official project sites, documentation, and repositories.

The question was: how should RepoRewind move a visitor from “that looks interesting” to a meaningful interaction, and from the fictional `/play/` archive to the real local product?

## Strong current patterns

| Product                                                                                                                              | Curiosity → meaningful interaction                                                                                                                                                                                                                                                    | Browser → real use                                                                                                                                                                                                                | Trust, mobile, and accessibility cues                                                                                                                                                                                                                                                                                                                        | RepoRewind lesson                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Biome](https://biomejs.dev/) / [Playground](https://biomejs.dev/playground/)                                                        | The landing page demonstrates real formatter and linter output, then links to a WebAssembly playground. The official repository explicitly frames the playground as a no-install trial.                                                                                               | “Try on the playground or directly on your project” is followed immediately by package-manager-specific install and run commands. The [CLI reference](https://biomejs.dev/reference/cli/) repeats a minimal `npx … check .` path. | MIT/Apache licensing and recognizable production users support trust. The shell of the playground had no horizontal overflow at 390 px in the live probe, although its editor remained at “Loading…” in this automated environment, so full mobile editor behavior was not verified.                                                                         | Put the exact local equivalent beside the browser action it corresponds to. A visitor who just saw one result should not have to return to a separate docs page to reproduce it locally.                                                     |
| [Playwright Trace Viewer](https://trace.playwright.dev/) / [docs](https://playwright.dev/docs/trace-viewer)                          | The empty state offers drag-and-drop or **Select file** inside the actual inspection UI. The docs also publish a URL-addressable sample trace; opening that deep link produced a populated action timeline, snapshots, call details, console, network, and source panels immediately. | The same documentation gives the local equivalent, `npx playwright show-trace path/to/trace.zip`, as well as the static hosted viewer.                                                                                            | The promise “does not send your trace anywhere” appears at the file boundary, not only on a privacy page. The docs say the trace is loaded entirely in-browser. The empty viewer overflowed to 550 px at a 390 px viewport in the live probe, an instructive counterexample: a technically rich desktop tool still needs a deliberate narrow-screen mode.    | Say “open locally” at the file control, show the exact data boundary there, and offer a deep-linked sample that opens on a useful moment. Do not rely on a desktop workspace merely shrinking on mobile.                                     |
| [React Flow](https://reactflow.dev/) / [Playground](https://play.reactflow.dev/)                                                     | The product itself is the hero: visitors can focus, select, and move real nodes before reading a feature list. The no-code playground opens with a populated tree, visible options, dataset switching, a node inspector, and Apply/Discard controls.                                  | The [quick start](https://reactflow.dev/learn) presents a no-code playground, online starters, package-manager install commands, and a clonable Vite template as progressively more committed paths.                              | The [accessibility guide](https://reactflow.dev/learn/advanced-use/accessibility) documents focusable nodes and edges, Enter/Space selection, arrow-key movement, auto-pan on focus, ARIA descriptions, and live updates. At 390 px, the live playground replaced its desktop sidebar with a labelled mobile sidebar control and had no horizontal overflow. | Let the first screen teach the core gesture with real controls. Preserve an equally intentional keyboard and screen-reader path, and change workspace composition on mobile instead of hiding the product behind a static screenshot.        |
| [StackBlitz](https://developer.stackblitz.com/) / [WebContainer API](https://developer.stackblitz.com/platform/api/webcontainer-api) | A starter opens as a working project with files, editor, preview, console, and useful seed code. Editing is immediate; account prompts are attached to later actions such as forking rather than blocking inspection.                                                                 | Fork, share, download, GitHub import, and “from your computer” provide several next steps from the same artifact. The documentation also supplies minimal starters and tutorials.                                                 | The official WebContainer page states that Node.js execution runs entirely inside the browser tab. The tested starter changed to explicit Editor/Preview/Both modes at 390 px and had no horizontal overflow.                                                                                                                                                | Seed the experience, keep the first useful action ungated, and present later commitment as a continuation of the object the visitor already manipulated. On mobile, use modes or sheets rather than squeezing every desktop panel into view. |

## Pattern synthesis

The strongest experiences share a compact activation ladder:

1. **Recognize the result.** The first screen shows the product's distinctive output, not an abstract feature inventory.
2. **Perform one core gesture.** Seed data is already loaded, and the next useful action is obvious.
3. **Understand what changed.** The UI names the outcome in product language and keeps supporting evidence reachable.
4. **Continue with the same job locally.** The install/run command is adjacent to the achieved browser result, not buried in documentation.
5. **Increase commitment progressively.** Importing a real artifact, installing, signing in, sharing, or contributing happens after the visitor has received value.

Other consistent lessons:

- A sample should be a small case with an answer, not merely a non-empty canvas.
- Contextual hints outperform a long opening tour. They name one action, one expected result, and one next step.
- Trust copy is most credible at the moment data is selected or a command is copied.
- “Runs in your browser” is not sufficient privacy language. Strong tools state what is read, where processing occurs, whether anything is transmitted, and how long data remains.
- Mobile activation needs a different information composition. Full-screen multi-panel tools should use explicit modes, bottom sheets, or an accessible textual view.
- Canvas interaction needs a parallel semantic path: keyboard focus, instructions, live status, and a non-canvas evidence representation.

## RepoRewind's current activation baseline

RepoRewind already has unusually strong raw material:

- The showcase describes the city grammar clearly and exposes **Try the live demo** plus **Run it locally** in the hero.
- `/play/` loads a deterministic fictional 25-commit, ten-year archive without setup and begins on a populated historical chapter.
- The live workspace exposes replay, releases, search, evidence, insights, import, comparison, and export instead of presenting a mockup.
- The import dialog explains that archives are processed in the tab and not uploaded, and it states that source and binary contents are excluded.
- Keyboard controls, a skip link, labelled timeline markers, reduced-motion handling, status regions, a text-first Evidence view, and a WebGL fallback are already present.
- Both the live showcase and `/play/` had no horizontal overflow at 390 px in the responsive probe.

The activation problems are about sequence and emphasis:

- The demo opens in a dense expert workspace with no visible first task. The footer says how to orbit and play, but it does not tell the visitor what insight to look for.
- The fictional archive is labelled, but its “repo-rewind” subject can still be mistaken for real product history. There is no one-sentence case premise or stated finding.
- The browser-to-local handoff is absent from the normal `/play/` workspace. It appears only after opening Import, and that dialog promotes the longer archive-export route rather than the simplest local viewer route.
- Import is product vocabulary, but **Open local archive** would make the privacy behavior clearer at the action boundary.
- The mobile layout fits the viewport, but the visible experience is mostly controls and selected-commit text; the meaningful first interaction is not adapted into a small-screen task.
- Most importantly, `npm view reporewind` returned `E404 Not Found` on 2026-09-01. The public showcase currently says that the first `npx` run downloads RepoRewind from npm, but that handoff is not yet available. This is a release gate, not a copy problem.

## Concrete recommendations

### P0 — make the handoff truthful before increasing conversion pressure

Do not promote `npx reporewind .` as a working public path until the package is published and a clean-machine smoke test succeeds. The relaunch should do one of the following:

- publish and verify the package first, then retain the one-command CTA; or
- temporarily label the package as pending and offer a verified source-checkout path.

After publication, test the exact command from an unrelated repository on every supported OS/Node combination. The success state should show the expected loopback URL, private session language, and `Ctrl+C` shutdown instruction. A dead primary CTA would undo the trust established by the privacy story.

### P0 — turn `/play/` into a 60-second case, not an unguided showroom

Add a small, dismissible “Case file” coach card after the archive is ready. It should never obscure the city or block free exploration. Recommended first case:

1. **See growth:** play or jump to the `v2.0.0` landmark.
2. **Find the rebuild:** search for `src/core/timeline.ts` and open its rename evidence.
3. **Compare eras:** pin `v2.0.0`, jump to `v3.0.0`, and open the temporal comparison.
4. **State the finding:** “The timeline engine moved from `src/history/` into `src/core/`; RepoRewind keeps the rename and removed import layer visible as a neighborhood rebuild.”

Each step needs one primary action, an expected visual/text result, **Skip tour**, and **Restart case**. The guide should react to real state rather than advance on “Next.” This makes the product's wedge—stable geography plus evidence-linked time travel—understandable before exposing film export and the eight Insights views.

For returning visitors, expose three compact scenario chips backed by the same deterministic archive: **Rebuild**, **Deleted code**, and **Release growth**. Deep links such as `/play/?case=rebuild&step=2` can let the README, showcase, gallery commentary, issues, and social posts open the product at a meaningful moment without hosting anyone's real history archive.

### P0 — show the local continuation at the moment of success

When the guided case is completed, show a non-modal success card:

> You found a rebuild in the fictional archive. Find the one in your repository—locally.

Include one copyable command, **Run on my repository**, **Keep exploring**, and a three-line trust ledger:

- reads Git metadata, paths, refs, and numeric diffs—not source contents;
- serves a tokenized `127.0.0.1` session and stores the archive in memory;
- sends no repository data and stops when the terminal process stops.

Keep a compact **Run on my repository** action available from the top bar after the coach card is dismissed. It should open the simple loopback command first; portable JSON import is an advanced alternative.

### P1 — tighten the showcase around “proof → play → local”

- Rename the hero actions to remove ambiguity: **Explore a fictional history — no upload** and **Run on my repository — local only**.
- Keep the static hero lightweight, but add a labelled play affordance over the existing real replay asset: **Watch the 12-second rebuild**. Use the current still frame when reduced motion is requested; never autoplay motion for those visitors.
- Place the exact local command and its data boundary directly after the live-demo proof, not only after the long workflow/tour sections.
- Add **Open this case in the live demo** to the product tour's Rebuild/Compare plate. Do not imply that gallery repositories are interactively hosted; their current “no history archive is hosted” contract is a valuable trust cue.
- Keep the reviewed stories, provenance, interpretation limits, real screenshots, license, CI, and source links. They are stronger credibility evidence than generic testimonial logos would be.

### P1 — make the file boundary look local

Change **Import** to **Open archive** or **Open local archive** wherever the product is selecting a browser file. At that control, keep the strongest Playwright-like sentence visible without requiring documentation:

> Opens in this tab. Nothing is uploaded. Refreshing clears the archive.

Below it, retain the warning that names, paths, commit messages, and remotes can still be sensitive. Separate the two local routes clearly:

- **Fastest:** run RepoRewind in the repository and let the tokenized loopback viewer open automatically.
- **Portable:** explicitly generate JSON, review it, then open it in the hosted viewer.

### P1 — treat mobile and accessibility as alternate activation paths

- On narrow screens, open with a compact **Play / Search / Case** control strip and move commit details into a bottom sheet. Use explicit City/Evidence modes; do not attempt to show every desktop panel simultaneously.
- Preserve 44×44 px minimum touch targets and verify 320, 390, 768, and landscape widths. Test the actual case completion, search, timeline scrub, comparison, import, and recovery from unavailable WebGL—not only horizontal overflow.
- In reduced-motion mode, use single-step timeline movement and textual before/after summaries instead of guided autoplay.
- Make coach steps keyboard reachable and non-modal. Announce step completion and the selected commit in a polite live region, but suppress per-frame announcements during playback.
- Keep Evidence view first-class. It should be capable of completing the same rebuild case without WebGL, with the same evidence and success CTA.
- Provide touch wording on touch devices and keyboard wording on keyboard-capable devices. Avoid canvas-only instructions and hover-only explanations.

### P2 — instrument learning without breaking the privacy promise

Do not add behavioral analytics merely to measure the relaunch. Use repeatable moderated tests, opt-in feedback, and local-only counters during development. Suggested acceptance targets:

- A new visitor can explain “files, districts, releases, ruins” after 30 seconds.
- A keyboard-only, touch-only, reduced-motion, or Evidence-view visitor can complete the rebuild case in under 90 seconds.
- The case starts only after the archive and usable interaction mode are ready; no hint points at a disabled or still-loading control.
- The primary local command succeeds from a clean temporary repository and opens the correct private loopback session.
- No 320/390 px horizontal page overflow; focus remains visible; dialogs return focus; automated accessibility checks report no serious violations.
- Network inspection confirms that opening a local archive causes no application request containing repository data.

## Recommended relaunch sequence

1. Resolve and clean-install-verify the npm release gate, or make the interim source path explicit.
2. Add the reactive rebuild case and its Evidence-view equivalent.
3. Add the post-case local CTA and persistent compact handoff.
4. Deep-link the showcase/README proof to specific fictional cases.
5. Complete desktop, 390/320 px, touch, keyboard, reduced-motion, WebGL-failure, and clean-install QA.
6. Only then optimize copy or add more scenarios based on moderated activation observations.

This sequence strengthens RepoRewind's existing differentiation rather than adding a generic onboarding layer: visitors experience one truthful repository change, inspect its evidence, and then repeat the same job privately on their own machine.
