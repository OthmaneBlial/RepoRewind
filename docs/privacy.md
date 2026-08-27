# Privacy and trust boundaries

RepoRewind is local-first. It has no accounts, analytics, telemetry, cookies, application backend, or remote upload path.

## Data read by the analyzer

For the selected local Git repository and ref, the analyzer reads:

- repository name, branch/ref, and a sanitized configured remote string;
- commit hashes, parent hashes, timestamps, messages, and refs;
- contributor display names and local Git email metadata used only to group identities within that analysis; archive-local sequential identifiers are serialized, and email strings are included only with `--include-emails`;
- file paths, change status, rename origins, and numeric addition/deletion totals;
- tags and branch tips.

It does not read source contents, binary contents, working-tree files, credential stores, Git configuration beyond the sanitized remote, issue data, or hosting-provider data. URL usernames, passwords, queries, and fragments are removed; unsupported local/file remotes are omitted.

Contributor identifiers do not contain a hash or other reusable derivative of an email address. They are assigned in first-seen history order, so an archive without `--include-emails` cannot be correlated through an email-derived identifier.

Commit messages, names, file paths, and remotes can still be sensitive. Treat a generated archive as private unless you have reviewed it.

## Storage and retention

The explicit `analyze` command writes one JSON file to the path selected by the operator. The one-command viewer keeps the generated archive in process memory and exposes it only through its tokenized loopback session; it creates no temporary archive file. The browser builds in-memory indexes and does not write history to local storage, IndexedDB, or cookies. Reloading a hosted import or closing its tab deletes that browser copy. Delete an explicitly generated JSON file using normal operating-system controls to remove the durable copy.

Downloaded films and privacy reports are normal local files controlled by the browser and operating system.

## Share Safety and presentation projections

Film export starts with a **Public share** projection. It preserves month-level dates, aggregate counts, and a removable **Made with RepoRewind** attribution while replacing the repository name and commit titles with generic labels and omitting contributor names, emails, commit hashes, paths, branch/tag names, and the remote. A **Private review** preset exposes identifying presentation fields except emails. Either preset can be adjusted field by field before rendering.

The review is a presentation projection only. It never rewrites or deletes values in the canonical in-memory archive. Switching presets, canceling an export, closing the dialog, or closing the tab creates no durable browser state.

Enabling an identifying field in a public projection disables rendering until the operator confirms the exact sensitive fields. If the canonical archive contains contributor emails, every public export also requires a separate acknowledgement even though emails remain omitted. RepoRewind never silently fetches missing history; a shallow archive is labeled as partial in the review and report.

[Story Director](./story-director.md) chapter titles are visible export fields. Its deterministic defaults are generic; editing a title under the public preset adds a separate confirmation gate. Reports record the chapter count and whether titles were customized, but never a discarded title or raw evidence value.

Every film-only export is accompanied by `reporewind-privacy-report.json`; a [history story pack](./story-pack.md) includes the same report as `privacy-report.json`. The [non-WebGL evidence mode](./non-webgl.md) downloads `repo-rewind-evidence-poster.png` with `reporewind-evidence-privacy-report.json`. Its fixed public projection uses only generic repository labels, aggregate counts, month-level activity, and deterministic generic chapter titles; it omits contributor identities, messages, hashes, refs, remotes, and paths. The report records:

- the selected disclosure settings and public/private preset;
- included and omitted field names, but never omitted field values;
- analyzed ref scope, archive byte size, and complete/partial history status;
- RepoRewind, archive schema, and report versions;
- warnings for email-bearing archives, partial history, and sensitive public overrides.

The film overlay and privacy report use the same immutable disclosure settings. Export tests snapshot both public-safe and private overlay copy so a redaction regression fails the verification gate.

## Network behavior

The hosted application makes no repository-data requests. Browser dependencies and fonts are bundled locally. A sanitized HTTPS repository remote (or loopback HTTP URL for local development) may be shown as a user-activated source link; RepoRewind never fetches that URL.

The one-command viewer binds to `127.0.0.1` on a random port and uses an unpredictable single-session path. The browser fetches the validated archive once from that same-origin loopback server. The server accepts only `GET` and `HEAD`, exposes no mutation endpoint, sends restrictive security headers, and stops on <kbd>Ctrl C</kbd>. This loopback transfer does not send repository data to npm, GitHub, or another remote service.

The public playground downloads the same static application assets from GitHub Pages. A history archive selected there is parsed and retained in the current browser tab; it is not submitted to GitHub Pages or another application service. Browser developer tools can be used to verify that no repository-data request occurs.

GitHub Pages does not apply the Netlify-style rules in `public/_headers`. The hosted HTML therefore carries a restrictive Content Security Policy as a `<meta>` policy, while transport and other response headers remain controlled by GitHub Pages. Directives that require an HTTP response header, such as `frame-ancestors`, must not be claimed for that deployment. Hosts that support custom response headers should apply the complete policy from `public/_headers`.

## Untrusted input

History archives are untrusted input. The browser enforces a 256 MB file cap, maximum record counts, bounded strings, valid dates and integers, unique identities, known contributor references, supported statuses, and rename invariants. Rendering uses React text nodes rather than injecting archive HTML.

The analyzer accepts a repository path and optional ref. It invokes Git without a shell, terminates option parsing explicitly, and rejects option-like or control-character refs.
