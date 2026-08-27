# Opt-in evidence poster Action

RepoRewind includes a manual, artifact-only GitHub Action for maintainers who want a deterministic repository poster without enabling CI video or automatic publication.

## Safe default workflow

Run **Actions → Evidence poster → Run workflow**. The checked-in workflow:

- checks out complete history with `fetch-depth: 0`;
- grants only `contents: read`;
- analyzes Git without interpolating messages, paths, refs, or PR metadata into a shell command;
- uses the public Share Safety projection and excludes contributor emails;
- renders the PNG twice on the same supported Linux/Chromium runner and fails unless the bytes match;
- uploads only a private Actions artifact for 1, 3, or 7 days;
- never commits, comments, deploys Pages, modifies a Release, or publishes a package.

Private and internal repositories use the same non-publishing path. The manifest records repository visibility, `published: false`, `private-actions-artifact-only`, and the selected retention period. Publishing a reviewed artifact requires a separate job, permission boundary, and protected environment that this repository does not enable by default.

## Artifact contract

The uploaded directory contains exactly:

| File                                      | Purpose                                                          |
| ----------------------------------------- | ---------------------------------------------------------------- |
| `repo-rewind-evidence-poster.png`         | Fixed 1200×630 public-safe evidence poster                       |
| `reporewind-evidence-privacy-report.json` | Field disclosure, scope, omissions, and archive-version record   |
| `action-manifest.json`                    | Retention, visibility, non-publication, and determinism evidence |
| `SHA256SUMS`                              | SHA-256 for the poster, privacy report, and manifest             |

The action refuses to replace an existing output file. It supports GitHub-hosted Linux runners for the deterministic pixel check; other operating systems fail with an explicit compatibility message.

## Use from another repository

Pin the action to an immutable release tag or full commit SHA. The caller remains responsible for checkout, Node 24, and artifact upload:

```yaml
permissions:
  contents: read

steps:
  - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7
    with:
      fetch-depth: 0
  - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7
    with:
      node-version: 24.20.0
  - id: poster
    uses: OthmaneBlial/RepoRewind/.github/actions/poster@REPLACE_WITH_RELEASE_SHA
    with:
      max-commits: '5000'
      retention-days: '3'
  - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4
    with:
      name: reporewind-poster
      path: ${{ steps.poster.outputs.artifact-path }}
      retention-days: 3
```

Do not replace the immutable reference with `main` in a production repository. Tag/release publication and CI film remain separate roadmap decisions.
