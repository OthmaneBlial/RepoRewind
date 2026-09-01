# Troubleshooting

## The local viewer does not open

Print the exact loopback URL instead of launching a browser:

```bash
npx reporewind /path/to/repository --no-open
```

Open the printed `http://127.0.0.1:<port>/<session>/` URL on the same machine. Keep the terminal process running and press <kbd>Ctrl C</kbd> when finished. RepoRewind never binds the viewer to `0.0.0.0` by default.

## The contributor development server does not start

Verify the supported runtime and locked install:

```bash
node --version
npm --version
npm ci
npm run dev
```

Node.js 24 is recommended; Node.js 22.13 or newer is also supported. RepoRewind binds to `http://127.0.0.1:5173` by default. If that port is occupied, Vite prints the alternative URL it selected.

## The analyzer cannot read a repository

Confirm the path is a Git working tree and that the selected ref exists:

```bash
git -C /path/to/repository status
git -C /path/to/repository rev-parse --verify main
npx reporewind /path/to/repository --branch main
```

RepoRewind reports Git's failure without retrying a different ref or reading the working tree. Repositories with no commits cannot produce a city.

## A large archive is slow or rejected

Start with a bounded history:

```bash
npx reporewind /path/to/repository --max-commits 5000
```

The browser rejects files over 256 MB, more than 250,000 commits, or more than 2,000,000 file-change entries. These are safety limits, not target capacities. The earliest retained commit is reconstructed against Git's empty tree so the truncated baseline remains complete.

## The city is replaced by a WebGL message

Enable hardware acceleration, update the browser/GPU driver, and retry in a current desktop browser. Search, archive validation, and CLI generation do not require WebGL, but the interactive city and film capture require a working canvas renderer.

## MP4 is unavailable

MP4 requires a secure context and a browser/hardware combination that passes the exact H.264 capability probe. Localhost is accepted for development. Choose WebM when the dialog reports that H.264 is unavailable. Keep the tab visible during either export and retry at 1080p if 4K exceeds available memory.

## Reset the demo

Select the repository switcher or **Open archive**, then choose **Open demo**. Opened archives are memory-only; reloading the page also restores the fictional demo.

## Run the complete diagnostic gate

```bash
npm run verify
```

If it fails, preserve the first complete error output. Do not bypass formatting, lint, validation, test, build, documentation, or audit failures.
