<!-- labels: good first issue,public fixture -->

# Add an explicit public fixture for rename and deletion archaeology

## Outcome

Contributors can reproduce rename-chain and ruin metrics with a small fictional history whose expected evidence is understandable without reading the ten-year demo.

## Scope

Add one hand-authored schema-v1 fixture with 6–10 commits: create a path, rename it once, edit it, then delete it. Use fictional names, messages, hashes, refs, and paths. Add focused archaeology and comparison assertions. Do not copy or derive data from a real repository.

## Relevant files

- `src/data/story-fixtures.ts`
- `src/core/archaeology.test.ts`
- `src/core/compare.test.ts`
- `docs/archaeology.md`

## Acceptance criteria

- [ ] Runtime archive validation accepts the fixture without loosening bounds.
- [ ] The fixture contains no email, remote URL, real person, or real project identifier.
- [ ] Tests prove the rename chain, final deletion, and supporting commit indices.
- [ ] The metric documentation names the fixture and the exact interpretation it demonstrates.

## Test commands

```bash
npm test -- --run src/core/archaeology.test.ts src/core/compare.test.ts src/core/schema.test.ts
npm run docs:check
npm run typecheck
```
