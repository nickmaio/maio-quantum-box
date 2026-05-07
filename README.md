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

- Interactive encryption/decryption lab using AES-GCM in the browser
- Versioned encrypted payload format with legacy payload compatibility

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

The Lab section lets a user encrypt and decrypt text entirely in the browser. The helper in `src/lib/crypto.js`:

- Derives a 256-bit AES-GCM key from a password with PBKDF2-SHA256
- Uses 600,000 PBKDF2 iterations
- Generates a random 16-byte salt
- Generates a random 12-byte initialization vector
- Returns a versioned `mqb1` payload containing Base64URL-encoded salt, IV, and ciphertext
- Validates encrypted payload structure before attempting decryption
- Supports the earlier legacy `salt + iv + ciphertext` Base64 payload format for backward compatibility

Nothing is sent to a server by this project. The plaintext, password, and ciphertext live only in the browser runtime unless the user copies or stores them elsewhere.

Security note: Maio Quantum Box is designed for cases where the shared password is exchanged offline or through a separate trusted channel, so it does not include direct online key exchange. AES-256-GCM provides a strong symmetric-encryption margin, including against known quantum search attacks when paired with a strong password. This project is still not a formally audited security product, and password strength remains critical.

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
