const PORTABLE_FORMAT_VERSION = "mv1";
const MESSENGER_FORMAT_VERSION = "m1";
const MESSENGER_FIXED_SALT = "maio-quantum-box:m1:password-kdf:v1";
const OBJECT_ID_LENGTH = 12;
const SALT_LENGTH = 16;
const GCM_TAG_LENGTH = 16;
const PBKDF2_ITERATIONS = 600000;

let objectIdRandom = null;
let objectIdCounter = null;

function getCrypto() {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.subtle || !cryptoApi.getRandomValues) {
    throw new Error("Web Crypto API is not available in this environment.");
  }
  return cryptoApi;
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(encoded) {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToBase64Url(bytes) {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

function base64UrlToBytes(encoded) {
  if (!/^[A-Za-z0-9_-]+$/u.test(encoded) || encoded.length % 4 === 1) {
    throw new Error("Invalid encrypted payload encoding.");
  }
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  return base64ToBytes(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
}

function concatBytes(...parts) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const combined = new Uint8Array(length);
  let offset = 0;

  for (const part of parts) {
    combined.set(part, offset);
    offset += part.length;
  }

  return combined;
}

function encodePayload(objectId, salt, ciphertext) {
  return `${PORTABLE_FORMAT_VERSION}.${bytesToBase64Url(
    concatBytes(objectId, salt, new Uint8Array(ciphertext))
  )}`;
}

function decodePortablePayload(encoded) {
  const parts = encoded.split(".");
  if (parts.length !== 2 || parts[0] !== PORTABLE_FORMAT_VERSION) {
    throw new Error("Invalid encrypted payload format.");
  }

  const payload = base64UrlToBytes(parts[1]);
  if (payload.length <= OBJECT_ID_LENGTH + SALT_LENGTH + GCM_TAG_LENGTH) {
    throw new Error("Invalid encrypted payload contents.");
  }

  return {
    objectId: payload.slice(0, OBJECT_ID_LENGTH),
    salt: payload.slice(OBJECT_ID_LENGTH, OBJECT_ID_LENGTH + SALT_LENGTH),
    ciphertext: payload.slice(OBJECT_ID_LENGTH + SALT_LENGTH),
  };
}

function decodeMessengerPayload(encoded) {
  const parts = encoded.split(".");
  if (parts.length !== 2 || parts[0] !== MESSENGER_FORMAT_VERSION) {
    throw new Error("Invalid encrypted payload format.");
  }

  const payload = base64UrlToBytes(parts[1]);
  if (payload.length <= OBJECT_ID_LENGTH + GCM_TAG_LENGTH) {
    throw new Error("Invalid encrypted payload contents.");
  }

  return {
    objectId: payload.slice(0, OBJECT_ID_LENGTH),
    salt: new TextEncoder().encode(MESSENGER_FIXED_SALT),
    ciphertext: payload.slice(OBJECT_ID_LENGTH),
  };
}

function decodePayload(encoded) {
  if (encoded.startsWith(`${PORTABLE_FORMAT_VERSION}.`)) {
    return decodePortablePayload(encoded);
  }

  if (encoded.startsWith(`${MESSENGER_FORMAT_VERSION}.`)) {
    return decodeMessengerPayload(encoded);
  }

  throw new Error("Invalid encrypted payload format.");
}

async function deriveKey(password, salt) {
  if (typeof password !== "string" || password.length === 0) {
    throw new Error("A non-empty password is required.");
  }

  const cryptoApi = getCrypto();
  const enc = new TextEncoder();
  const keyMaterial = await cryptoApi.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return cryptoApi.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function generateObjectId() {
  const cryptoApi = getCrypto();

  if (!objectIdRandom || objectIdCounter === null) {
    objectIdRandom = cryptoApi.getRandomValues(new Uint8Array(5));
    const counterSeed = cryptoApi.getRandomValues(new Uint8Array(3));
    objectIdCounter = (counterSeed[0] << 16) | (counterSeed[1] << 8) | counterSeed[2];
  }

  const objectId = new Uint8Array(OBJECT_ID_LENGTH);
  const timestamp = Math.floor(Date.now() / 1000);
  objectId[0] = (timestamp >>> 24) & 0xff;
  objectId[1] = (timestamp >>> 16) & 0xff;
  objectId[2] = (timestamp >>> 8) & 0xff;
  objectId[3] = timestamp & 0xff;
  objectId.set(objectIdRandom, 4);
  objectId[9] = (objectIdCounter >>> 16) & 0xff;
  objectId[10] = (objectIdCounter >>> 8) & 0xff;
  objectId[11] = objectIdCounter & 0xff;
  objectIdCounter = (objectIdCounter + 1) & 0xffffff;

  return objectId;
}

export async function encrypt(plaintext, password) {
  const cryptoApi = getCrypto();
  const enc = new TextEncoder();
  const objectId = generateObjectId();
  const salt = cryptoApi.getRandomValues(new Uint8Array(SALT_LENGTH));
  const key = await deriveKey(password, salt);
  const ciphertext = await cryptoApi.subtle.encrypt(
    { name: "AES-GCM", iv: objectId },
    key,
    enc.encode(plaintext)
  );
  return encodePayload(objectId, salt, ciphertext);
}

export async function decrypt(encoded, password) {
  const cryptoApi = getCrypto();
  const dec = new TextDecoder();
  const { objectId, salt, ciphertext } = decodePayload(encoded);
  const key = await deriveKey(password, salt);
  const plaintext = await cryptoApi.subtle.decrypt(
    { name: "AES-GCM", iv: objectId },
    key,
    ciphertext
  );
  return dec.decode(plaintext);
}
