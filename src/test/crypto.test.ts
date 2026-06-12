import { describe, expect, it } from "vitest";
import { decrypt, encrypt } from "@/lib/crypto";

const MESSENGER_FIXED_SALT = "maio-quantum-box:m1:password-kdf:v1";

function base64UrlToBytes(encoded: string) {
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function bytesToBase64Url(bytes: Uint8Array) {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

function concatBytes(...parts: Uint8Array[]) {
  const combined = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;

  for (const part of parts) {
    combined.set(part, offset);
    offset += part.length;
  }

  return combined;
}

async function encryptMessengerPayload(plaintext: string, password: string) {
  const enc = new TextEncoder();
  const objectId = new Uint8Array([0x65, 0x5f, 0x1c, 0x2a, 0x9b, 0x2c, 0x4d, 0x5e, 0x6f, 0x70, 0x81, 0x92]);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(MESSENGER_FIXED_SALT),
      iterations: 600000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: objectId },
    key,
    enc.encode(plaintext)
  ));

  return `m1.${bytesToBase64Url(concatBytes(objectId, ciphertext))}`;
}

describe("crypto helpers", () => {
  it("round-trips portable mv1 encrypted text with a password", async () => {
    const plaintext = "Launch notes: AES-GCM handles authenticated encryption. Привет.";
    const password = "correct horse battery staple";

    const ciphertext = await encrypt(plaintext, password);

    expect(ciphertext).toMatch(/^mv1\./);
    await expect(decrypt(ciphertext, password)).resolves.toBe(plaintext);
  });

  it("encodes ObjectId, salt, ciphertext, and tag in one portable mv1 blob", async () => {
    const payload = await encrypt("Hello!", "shared password");
    const [, encodedPayload] = payload.split(".");
    const decodedPayload = base64UrlToBytes(encodedPayload);

    expect(decodedPayload).toHaveLength(50);
  });

  it("decrypts compact m1 payloads exported from the messenger", async () => {
    const payload = await encryptMessengerPayload("Hello!", "shared password");
    const [, encodedPayload] = payload.split(".");
    const decodedPayload = base64UrlToBytes(encodedPayload);

    expect(decodedPayload).toHaveLength(34);
    await expect(decrypt(payload, "shared password")).resolves.toBe("Hello!");
  });

  it("uses fresh randomness for each encrypted payload", async () => {
    const plaintext = "same message";
    const password = "same password";

    const first = await encrypt(plaintext, password);
    const second = await encrypt(plaintext, password);

    expect(first).not.toBe(second);
  });

  it("rejects decryption with the wrong password", async () => {
    const ciphertext = await encrypt("private payload", "real password");

    await expect(decrypt(ciphertext, "wrong password")).rejects.toThrow();
  });

  it("rejects malformed encrypted payloads before decrypting", async () => {
    await expect(decrypt("mv1.too.many.parts", "password")).rejects.toThrow(
      "Invalid encrypted payload format."
    );
  });

  it("rejects unversioned Base64 payloads", async () => {
    await expect(decrypt("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", "password")).rejects.toThrow(
      "Invalid encrypted payload format."
    );
  });

  it("rejects undersized portable mv1 payloads before decrypting", async () => {
    await expect(decrypt("mv1.AAAA", "password")).rejects.toThrow(
      "Invalid encrypted payload contents."
    );
  });

  it("rejects undersized compact m1 payloads before decrypting", async () => {
    await expect(decrypt("m1.AAAA", "password")).rejects.toThrow(
      "Invalid encrypted payload contents."
    );
  });
});
