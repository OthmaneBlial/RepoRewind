<!-- labels: help wanted,visual theme,accessibility -->

# Add a bounded high-contrast theme for the evidence workspace

## Outcome

People who cannot comfortably read the warm glass treatment can switch the DOM-based evidence workspace to a high-contrast palette while keeping the existing archival-daylight default.

## Scope

Add one evidence-workspace-only theme toggle using CSS custom properties. Persist it only for the current tab. Preserve visible focus, reduced motion, narrow layout, semantic DOM, and the 3D city palette. Do not introduce a general theme framework or recolor exported posters.

## Relevant files

- `src/App.tsx` (`EvidenceWorkspace`)
- `src/styles.css` evidence-workspace rules
- `src/App.test.tsx`
- visual reference: https://othmaneblial.github.io/RepoRewind/play/

## Acceptance criteria

- [ ] Default and high-contrast palettes meet WCAG AA contrast for normal text and controls.
- [ ] The toggle has an accessible name and pressed state and is keyboard reachable.
- [ ] Selection survives city/evidence switching during the tab session but creates no cookie or telemetry.
- [ ] The 320 px layout has no horizontal overflow in either palette.
- [ ] Tests cover the default, toggle, session state, and mode-switch behavior; the pull request includes redacted before/after screenshots.

## Test commands

```bash
npm test -- --run src/App.test.tsx
npm run lint
npm run typecheck
npm run build:web
```
