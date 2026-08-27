# History story pack

The story pack turns one reviewed replay into a single portable ZIP for a README, release note, talk, or social post. Select **Export film**, keep **Story pack** selected, review Share Safety, choose the trailer settings, and build the pack. Everything is generated in the current browser tab.

## Stable contents

| File                                 | Purpose                                                                                                 | Dimensions                      |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `repo-rewind-social-card.png`        | GitHub/Open Graph-style card                                                                            | 1200×630                        |
| `repo-rewind-square-poster.png`      | Square social poster                                                                                    | 1080×1080                       |
| `repo-rewind-widescreen-poster.png`  | Presentation and video poster                                                                           | 1920×1080                       |
| `repo-rewind-current-frame.png`      | Reviewed current-era still                                                                              | 1600×900                        |
| `repo-rewind-trailer.mp4` or `.webm` | 12, 16, or 24 second replay                                                                             | selected 1080p or 4K resolution |
| `README-snippet.md`                  | Ready-to-paste linked image, useful alt text, trailer link, and live-demo link                          | —                               |
| `privacy-report.json`                | Disclosure settings, scope, size, completeness, versions, and omissions                                 | —                               |
| `manifest.json`                      | Pack version, projected ref/range, links, dimensions, byte sizes, media types, and SHA-256 per artifact | —                               |

The ZIP itself is always named `repo-rewind-story-pack.zip`. Stable generic names avoid leaking a repository or local filesystem path through the bundle structure.

## Privacy contract

Every poster and the trailer use the exact Share Safety settings confirmed before rendering. The public preset shows generic repository and commit labels, month-level dates, aggregate counts, and the default **Made with RepoRewind** attribution. It omits names, emails, hashes, paths, remotes, and branch/tag names. Attribution is removable without payment.

The bundle contains no raw history archive. PNGs are created from the city canvas and reviewed overlay copy; the browser encoder creates the trailer; neither path adds repository or local-path text metadata. `manifest.json` records only projected selection values and field names. See the [privacy boundary](./privacy.md) for the canonical archive and override rules.

## Verify a pack

After extracting the ZIP, compare each artifact with `manifest.json`:

```sh
jq -r '.artifacts[] | [.sha256, .filename] | @tsv' manifest.json |
  while IFS=$'\t' read -r expected_checksum artifact_name; do
    printf '%s  %s\n' "$expected_checksum" "$artifact_name"
  done | shasum -a 256 -c -
```

Video frame selection and overlay copy are deterministic. MP4/WebM bytes may differ across hardware encoders, so the manifest proves the exact downloaded artifact rather than promising cross-device byte identity.
