# Release checklist

Use this checklist for a public tag or hosted demo. It records evidence; it is not a substitute for running the checks.

## Repository

- [ ] Version and changelog agree.
- [ ] License, third-party notices, security policy, privacy model, and contributor docs are current.
- [ ] No secrets, personal archives, local absolute paths, debug output, or generated build directories are tracked.
- [ ] The archive TypeScript types, runtime validation, JSON Schema, and fixtures agree.
- [ ] GitHub Actions pass from a clean `npm ci` install.

## Automated validation

- [ ] `npm run verify`
- [ ] `npm run analyze -- . --output ./artifacts/reporewind-history.json`
- [ ] `node dist-cli/index.js --version`
- [ ] `npm run preview -- --host 127.0.0.1`
- [ ] Production HTML and immutable assets return successfully over HTTP.
- [ ] `dist/LICENSE` and `dist/THIRD_PARTY_NOTICES.md` are present in the deployable artifact.

## Product validation

- [ ] Fictional demo loads and is clearly labeled.
- [ ] Play, pause, timeline, speed, release, merge, and branch controls work.
- [ ] Search opens by mouse and keyboard, navigates results, and selects files.
- [ ] Import accepts a real generated archive and rejects malformed/oversized input safely.
- [ ] Pin → travel → temporal diff works.
- [ ] Fullscreen failure degrades to a readable alert.
- [ ] MP4 capability messaging is accurate; WebM remains available.
- [ ] Export cancel cleans up and a short film can be downloaded.
- [ ] Keyboard focus, focus trapping, Escape, reduced motion, and skip navigation work.
- [ ] Desktop and narrow/mobile layouts are usable.
- [ ] Browser console has no unexpected errors or failed requests.

## Presentation

- [ ] README commands and local links are re-run and accurate.
- [ ] Real main, workflow, detailed, and responsive screenshots match the current release and contain no private data.
- [ ] Hosted deployments reproduce the security headers in `public/_headers` or documented equivalents.
- [ ] The final tag is created only after all applicable evidence is recorded.
