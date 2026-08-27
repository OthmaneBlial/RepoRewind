<!-- labels: good first issue,accessibility -->

# Add a readable empty state for commits with no visible file changes

## Outcome

When the evidence workspace lands on a commit whose public snapshot exposes no file-change rows, sighted and screen-reader users receive a clear explanation instead of an unexplained empty region.

## Scope

Render one semantic paragraph inside the current-commit evidence section when `changes.length === 0`. Keep the existing list unchanged for commits with changes. Do not change Git analysis, privacy projection, timeline behavior, or the 3D city.

## Relevant files

- `src/App.tsx` (`EvidenceWorkspace`)
- `src/App.test.tsx`
- `src/styles.css` only if the existing empty-state treatment cannot be reused

## Acceptance criteria

- [ ] The empty text explains that this commit has no visible file changes in the selected archive scope.
- [ ] The message is ordinary readable DOM text and does not rely on color, an icon, hover, or canvas.
- [ ] Existing file buttons and their accessible names remain unchanged when changes exist.
- [ ] An interaction test covers both empty and non-empty states.

## Test commands

```bash
npm test -- --run src/App.test.tsx
npm run lint
npm run typecheck
```
