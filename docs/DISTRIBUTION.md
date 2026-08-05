# Building & Distribution

Notula is packaged with [electron-builder](https://www.electron.build). Config
lives in [`electron-builder.yml`](../electron-builder.yml); installers are
written to `dist/` (git-ignored).

Builds are currently **unsigned** — see [Signing](#signing-later) for the
warnings this causes and how to fix it later.

## Targets

| OS | Artifact | Notes |
|---|---|---|
| Windows | `.exe` (NSIS installer) | Per-user, choose-install-dir |
| macOS | `.dmg` | **Must be built on a Mac** (Apple restriction) |
| Ubuntu / Debian | `.deb` + **AppImage** | |
| RHEL / Fedora | `.rpm` + **AppImage** | |

**AppImage** is a single executable that runs on virtually every Linux distro
(Ubuntu *and* RHEL) with no install — the simplest thing to hand someone.

## The one hard rule

**macOS builds require macOS.** You cannot build, sign, or notarize a `.dmg`
from Windows or Linux — Apple does not allow it. Options: a Mac, or a
`macos-latest` CI runner (GitHub Actions).

Everything else can be produced from a single machine with the right tooling.

## Build locally

### Windows (on Windows)
```bash
npm run dist:win
```
Native — no extra tooling. Produces `dist/Notula Setup <version>.exe`.

### Linux (`.deb`, `.rpm`, AppImage)
Best built on Linux. From a non-Linux host, use electron-builder's Docker image
so you don't need to install `rpm`/`fakeroot` yourself:

```bash
# From the project root (Docker Desktop running):
docker run --rm -ti \
  -v ${PWD}:/project \
  -w /project \
  electronuserland/builder:wine \
  /bin/bash -c "npm ci && npm run dist:linux"
```

On an actual Ubuntu box, just:
```bash
sudo apt-get install -y rpm fakeroot   # needed for the .rpm target
npm run dist:linux
```

### macOS (on a Mac)
```bash
npm run dist:mac
```
Produces `dist/Notula-<version>.dmg` (unsigned).

## Quick sanity check (no installer)

```bash
npm run pack     # electron-builder --dir: unpacked app in dist/, no installer
```
Fast way to confirm packaging works before making full installers.

## Signing (later)

Unsigned installers run, but:

- **macOS** → Gatekeeper blocks the app until it's signed with an **Apple
  Developer ID** (\$99/yr) and **notarized**. Users can right-click → *Open* to
  bypass in the meantime.
- **Windows** → SmartScreen shows an "unknown publisher" warning until the
  installer is **code-signed** (OV/EV cert). Users click *More info → Run anyway*.
- **Linux** → no signing required.

To add signing later, set electron-builder env vars in CI/locally:
- macOS: `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`, a Developer
  ID cert in the keychain; set `mac.identity` in the config.
- Windows: `CSC_LINK` (path/base64 of the `.pfx`) and `CSC_KEY_PASSWORD`.

## Auto-update

Wired via `electron-updater` (see `src/main/index.ts`). On launch, a **packaged**
build checks the latest GitHub Release, downloads a newer version in the
background, and prompts to restart. No-ops in `dev`.

Covers **Windows (NSIS)**, **macOS (zip)**, and **Linux (AppImage)**. `.deb`/`.rpm`
update through the system package manager instead. Each release the CI publishes
includes the `latest*.yml` metadata electron-updater needs.

## When you want all four automatically

A GitHub Actions matrix (`windows-latest` + `macos-latest` + `ubuntu-latest`)
builds each OS's artifacts in parallel and uploads them to a Release — the
easiest way to get macOS builds without owning a Mac. Ask and it can be wired up.
