<!-- labels: help wanted,export template -->

# Add a 1280×640 GitHub social-card preset to story packs

## Outcome

A reviewed story pack includes a GitHub-repository social-preview image at the documented 1280×640 dimensions without weakening the public Share Safety projection.

## Scope

Add one fixed `github-social-card.png` variant to the existing stable ZIP, manifest, documentation table, and deterministic tests. Reuse the current poster composition and cover fitting. Do not add a new privacy preset, network upload, GitHub API call, or automatic repository setting change.

## Relevant files

- `src/export/story-pack.ts`
- `src/export/story-pack.test.ts`
- `docs/story-pack.md`
- visual reference: https://github.com/OthmaneBlial/RepoRewind/blob/main/docs/repo-rewind-social-preview.png

## Acceptance criteria

- [ ] The PNG is exactly 1280×640 and appears in stable manifest order.
- [ ] Its SHA-256 is present and verifies after ZIP extraction.
- [ ] Public-mode snapshots contain no repository name, contributor, message, hash, ref, remote, email, or path.
- [ ] Existing four image presets and trailer filenames remain backward compatible.
- [ ] Documentation states the GitHub upload remains a separate manual review step.

## Test commands

```bash
npm test -- --run src/export/story-pack.test.ts src/core/privacy.test.ts
npm run docs:check
npm run typecheck
```
