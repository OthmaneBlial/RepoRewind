# Community operating contract

RepoRewind's community surfaces are for reproducible Git-history questions, reviewed local-first extensions, and explicitly permissioned public stories. Maintainers target a first useful response to Q&A and scoped contributor issues within 48 hours. Security reports still follow [`SECURITY.md`](../SECURITY.md), never a public issue or Discussion.

## Contribution lanes

| Lane             | Boundary                                                                | Proof expected                                      |
| ---------------- | ----------------------------------------------------------------------- | --------------------------------------------------- |
| Accessibility    | Equivalent keyboard, screen-reader, reduced-motion, and narrow UI paths | Interaction test plus keyboard/browser evidence     |
| Public fixtures  | Fictional or explicitly permissioned Git history only                   | Schema validation and deterministic expected result |
| Packaging        | Exact packed artifact on supported Node and operating systems           | Clean-install smoke output                          |
| Performance      | Advisory, versioned, environment-labeled measurements                   | Machine-readable result and methodology             |
| Export templates | Fixed dimensions over the reviewed Share Safety projection              | Pixel dimensions, snapshot, and privacy report      |
| Documentation    | One reproducible user job with current commands                         | Link check and command execution                    |
| Visual themes    | Bounded token/palette changes that preserve the archival identity       | Before/after images and contrast evidence           |

The canonical starter-task bodies live in [`.github/contributor-issues`](https://github.com/OthmaneBlial/RepoRewind/tree/main/.github/contributor-issues). Every one names its scope, relevant files, acceptance criteria, and test commands, and `npm run community:check` keeps that contract in the main quality gate. Maintainers close or rewrite an issue when its assumptions drift.

## Discussions and public stories

The live surfaces are [RepoRewind Discussions](https://github.com/OthmaneBlial/RepoRewind/discussions) and the [curated documentary gallery](https://othmaneblial.github.io/RepoRewind/gallery.html).

- **Q&A** is for reproducible usage and interpretation questions. Remove repository-sensitive details before posting.
- **Ideas** must name a real analyze → explore → understand → review → export job.
- **Show and tell** accepts only fictional fixtures or an explicitly reviewed public repository story. Include provenance, RepoRewind version, ref/range, redaction choices, exact replay command, and the finding—not only an image.
- **Releases** explains shipped contracts, migrations, and known limits. It is not a substitute for the changelog.

No private archive is retained by the project. A gallery or Discussion submission is a normal public GitHub post controlled by its author.

## First-time contributor credit

When merging a person's first RepoRewind pull request, maintainers apply the `first-time contributor` label. GitHub-generated release notes place those pull requests in a dedicated **First-time contributors** section, linking the author and work. The same credit is added to a gallery entry when the contributor supplied or edited that story. Attribution is never inferred from an email hidden by the public privacy projection.
