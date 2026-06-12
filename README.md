# Maio Quantum Box

Maio Quantum Box is a quantum-proof encryption tool. Can be used to encrypt private data before sending with messaging apps, email, etc. so no third party can decrypt and inspect it, even with the help of quantum computers and AGI.

It doesn't send data to the Internet: there is no backend, database, authentication layer, or server-side storage.

## Downloads

Desktop builds are published through GitHub Releases:

- [Latest release](https://github.com/nickmaio/maio-quantum-lock/releases/latest)
- [All releases](https://github.com/nickmaio/maio-quantum-lock/releases)

Recommended install assets:

- Windows: installer from the latest release
- Linux: AppImage or `.deb` package from the latest release
- macOS: `.dmg` package from the latest release

## Features

- Interactive encryption/decryption lab using AES-GCM in the browser and desktop apps
- Versioned encrypted payload format for standalone and mobile messaging workflows

## Run Locally

### Prerequisites

Use a recent Node.js version. Node 18 or newer is recommended.

### Install

```bash
npm install
```

### Run Locally

```bash
npm run dev
```

The Vite dev server is configured to run on port `8080`:

```text
http://localhost:8080
```

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Encryption Lab

The Lab section lets users encrypt and decrypt text in a closed box. The helper in `src/lib/crypto.js`:

- Derives a 256-bit AES-GCM key from a password with PBKDF2-SHA256
- Uses 600,000 PBKDF2 iterations
- Generates a random 16-byte salt
- Generates a 12-byte ObjectId (timestamp included, MongoDB-compatible)
- Uses the raw ObjectId bytes as the AES-GCM nonce
- Returns a versioned `mv1` payload containing Base64URL-encoded ObjectId, salt, and ciphertext
- Validates encrypted payload structure before attempting decryption

## Configuration Notes

- Path alias `@` maps to `src/` through `vite.config.ts`.
- Vite serves on host `::` and port `8080`.
- Google Fonts are imported from `src/index.css`, so the page may request external font files at runtime.

## Deployment

This is a static Vite app. Any host that can serve static files can deploy it.

Typical deployment flow:

```bash
npm run build
```

Then deploy the generated `dist/` directory to a static hosting provider such as Vercel, Netlify, Cloudflare Pages, GitHub Pages, or an object-storage/CDN setup.

If deploying under a subpath, update the Vite `base` option as needed.

MIT (c) Nick Maio
