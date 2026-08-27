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

Downloaded films are normal local files controlled by the browser and operating system.

## Network behavior

The hosted application makes no repository-data requests. Browser dependencies and fonts are bundled locally. A sanitized HTTPS repository remote (or loopback HTTP URL for local development) may be shown as a user-activated source link; RepoRewind never fetches that URL.

The one-command viewer binds to `127.0.0.1` on a random port and uses an unpredictable single-session path. The browser fetches the validated archive once from that same-origin loopback server. The server accepts only `GET` and `HEAD`, exposes no mutation endpoint, sends restrictive security headers, and stops on <kbd>Ctrl C</kbd>. This loopback transfer does not send repository data to npm, GitHub, or another remote service.

The public playground downloads the same static application assets from GitHub Pages. A history archive selected there is parsed and retained in the current browser tab; it is not submitted to GitHub Pages or another application service. Browser developer tools can be used to verify that no repository-data request occurs.

GitHub Pages does not apply the Netlify-style rules in `public/_headers`. The hosted HTML therefore carries a restrictive Content Security Policy as a `<meta>` policy, while transport and other response headers remain controlled by GitHub Pages. Directives that require an HTTP response header, such as `frame-ancestors`, must not be claimed for that deployment. Hosts that support custom response headers should apply the complete policy from `public/_headers`.

## Untrusted input

History archives are untrusted input. The browser enforces a 256 MB file cap, maximum record counts, bounded strings, valid dates and integers, unique identities, known contributor references, supported statuses, and rename invariants. Rendering uses React text nodes rather than injecting archive HTML.

The analyzer accepts a repository path and optional ref. It invokes Git without a shell, terminates option parsing explicitly, and rejects option-like or control-character refs.
