# Releasing Maio Quantum Box

This document is for maintainers. The public README intentionally stays focused on downloads and simple browser-local use.

## Native App Builds

The project includes a Tauri desktop wrapper in `src-tauri/`.

Windows prerequisites for local native builds:

- Rust through `rustup`
- Microsoft Visual Studio Build Tools with MSVC and the Windows SDK
- Microsoft Edge WebView2 Runtime

Run the desktop app in development:

```bash
npm run tauri:dev
```

Build the Windows installer and app bundle:

```bash
npm run tauri:build
```

Build only the native `.exe` without creating an installer:

```bash
npm run tauri:build:exe
```

Build the MSI installer:

```bash
npm run tauri:build:msi
```

Local Windows artifacts are generated under:

```text
src-tauri/target/release/
src-tauri/target/release/bundle/
```

Do not commit generated binaries to the repository. Keep distributable builds attached to versioned GitHub Releases.

## GitHub Actions

The `.github/workflows/desktop.yml` workflow runs lint, tests, the web build, and native Tauri builds for Windows, Linux, and macOS.

Branch and pull-request builds upload desktop packages as temporary workflow artifacts. Pushing a version tag creates a draft GitHub Release with desktop packages attached:

```bash
git tag v0.1.0
git push origin v0.1.0
```

Review and publish the draft release after the platform builds finish.

## Release Assets

Recommended public assets:

- Windows: NSIS installer, plus MSI when available
- Linux: AppImage and `.deb`
- macOS: `.dmg`

Use GitHub Releases as the canonical distribution channel. Avoid hardcoding version-specific binary URLs in the README; use `/releases/latest` there instead.
