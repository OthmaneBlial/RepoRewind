# Security policy

## Supported versions

RepoRewind is currently pre-1.0. Security fixes are applied to the latest release and the `main` branch; older snapshots are not maintained.

## Reporting a vulnerability

Use GitHub's private **Report a vulnerability** flow in the repository Security tab. Include the affected commit or version, impact, reproduction, and a minimal proof of concept. Do not include private repository contents, real contributor data, access tokens, or unrelated personal information.

Please do not publish an exploit in an issue, discussion, or pull request. If private vulnerability reporting is not visible on a future mirror, wait for a private maintainer channel rather than disclosing sensitive details publicly.

Maintainers will acknowledge reproducible reports through the private advisory and coordinate remediation and disclosure there. Timelines depend on severity, exploitability, and the availability of a safe fix.

## Security model

RepoRewind has no backend, account system, telemetry, or remote ingestion service. Its main trust boundary is the local JSON archive selected by the user. Archives are schema-validated, size- and record-bounded, parsed off the main thread when workers are available, and retained only in browser memory. The analyzer invokes Git with fixed argument arrays and validates user-supplied refs before execution.

See [Privacy and trust boundaries](./docs/privacy.md) for the complete data inventory and deletion model.
