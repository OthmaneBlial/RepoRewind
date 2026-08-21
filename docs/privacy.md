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

The CLI writes one JSON file to the path selected by the operator. The browser reads a user-selected file into memory, builds in-memory indexes, and does not write it to local storage, IndexedDB, cookies, or a server. Reloading the page or closing the tab deletes the browser copy. Delete the JSON file using normal operating-system controls to remove the durable copy.

Downloaded films are normal local files controlled by the browser and operating system.

## Network behavior

The application makes no repository-data requests. Browser dependencies and fonts are bundled locally. A sanitized HTTPS repository remote (or loopback HTTP URL for local development) may be shown as a user-activated source link; RepoRewind never fetches that URL.

## Untrusted input

History archives are untrusted input. The browser enforces a 256 MB file cap, maximum record counts, bounded strings, valid dates and integers, unique identities, known contributor references, supported statuses, and rename invariants. Rendering uses React text nodes rather than injecting archive HTML.

The analyzer accepts a repository path and optional ref. It invokes Git without a shell, terminates option parsing explicitly, and rejects option-like or control-character refs.
