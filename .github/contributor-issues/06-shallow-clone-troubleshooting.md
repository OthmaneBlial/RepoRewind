<!-- labels: good first issue,documentation -->

# Document shallow-clone and detached-HEAD analysis

## Outcome

Users can tell whether RepoRewind received complete history, deliberately fetch what is missing, and select a valid ref from a detached checkout without exposing repository data.

## Scope

Add a troubleshooting section with safe read-only diagnosis, separate GitHub Actions and local-clone remedies, and the expected `repository.truncated` behavior. Validate every command against a disposable public or fictional fixture. Do not recommend disabling validation or copying an archive to a third-party service.

## Relevant files

- `docs/troubleshooting.md`
- `docs/github-action.md`
- `README.md` compatibility section only if one short link is needed

## Acceptance criteria

- [ ] Commands distinguish shallow history, detached HEAD, and an invalid ref.
- [ ] The local remedy preserves the user's working tree and names its network fetch explicitly.
- [ ] The Actions remedy keeps `fetch-depth: 0` and `contents: read`.
- [ ] The text explains that `--max-commits` is an intentional bounded view, not an accidental shallow clone.
- [ ] No example contains a personal path, token, email, or private remote.

## Test commands

```bash
npm run docs:check
npm run community:check
npm test -- --run cli/git-reader.integration.test.ts
```
