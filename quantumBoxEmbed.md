# Quantum Box Embed: Mobile Compatibility Draft

## Goal

Use Quantum Box as the portable encryption source while allowing the messaging app to store messages compactly when it generates them internally.

There are two compatible cases:

- Quantum Box/exported payloads include a random salt, so they are fully self-contained and can be decrypted manually with only the payload and password.
- Messenger-native messages may omit a random salt and use the protocol default salt, so the stored record is smaller.

The password remains the only shared secret between Quantum Box and the messaging app.

## Payload Formats

Portable Quantum Box payload:

```text
mv1.<base64url(objectId[12] || salt[16] || ciphertextAndTag)>
```

Compact messenger-native payload or stored record:

```text
m1.<base64url(objectId[12] || ciphertextAndTag)>
```

If the compact form is used only inside the database, the record can omit `objectId` from `body` because MongoDB already stores it as `_id`:

```js
{
  _id: ObjectId(objectId),
  body: base64url(ciphertextAndTag),
  cryptoVersion: "m1"
}
```

## Decoded Layouts

Portable `mv1`:

```text
bytes 0..11   objectId bytes, used as MongoDB _id and AES-GCM nonce
bytes 12..27  random PBKDF2 salt
bytes 28..end AES-GCM ciphertext plus auth tag
```

Compact `m1`:

```text
bytes 0..11   objectId bytes, used as MongoDB _id and AES-GCM nonce
bytes 12..end AES-GCM ciphertext plus auth tag
```

For `Hello!`:

```text
portable mv1:
objectId:         12 bytes
salt:             16 bytes
ciphertext+tag:   22 bytes
binary payload:   50 bytes
base64url:        67 chars
with mv1. prefix: 71 chars

compact m1:
objectId:          12 bytes
ciphertext+tag:    22 bytes
binary payload:    34 bytes
base64url:         46 chars
with m1. prefix:   49 chars
```

## Key Derivation

Portable `mv1` uses the embedded random salt:

```text
key = PBKDF2-SHA256(password, payloadSalt, 600000)
```

Compact `m1` uses the fixed protocol salt:

```text
key = PBKDF2-SHA256(password, fixedProtocolSalt, 600000)
```

Recommended fixed salt input:

```text
TextEncoder().encode("maio-quantum-box:m1:password-kdf:v1")
```

This means messenger-native compact messages rely on users choosing strong, unique passwords per DM. Reusing the same password across DMs or recipients will reuse the same derived key for compact messages.

## Messenger Import Rules

When importing a Quantum Box `mv1` payload:

1. Verify the `mv1.` prefix.
2. Decode the Base64URL body.
3. Extract:
   - `objectId = decoded.slice(0, 12)`
   - `salt = decoded.slice(12, 28)`
   - `ciphertextAndTag = decoded.slice(28)`
4. Insert the message using the extracted ObjectId as `_id`.
5. Store the encrypted body and the imported salt.

Example imported record:

```js
{
  _id: ObjectId(objectId),
  body: base64url(ciphertextAndTag),
  salt: base64url(salt),
  cryptoVersion: "mv1"
}
```

When decrypting an imported `mv1` record:

```text
salt = record.salt
nonce = record._id bytes
ciphertextAndTag = base64urlDecode(record.body)
key = PBKDF2(password, salt, 600000)
```

## Messenger-Native Generation

When the messaging app generates a message in-house:

1. Generate or reserve the MongoDB ObjectId before encryption.
2. Derive the key from the DM password and fixed protocol salt.
3. Use the ObjectId bytes as the AES-GCM nonce.
4. Encrypt the UTF-8 plaintext.
5. Store only `base64url(ciphertextAndTag)` as `body`.
6. Mark the record as `cryptoVersion: "m1"`.

Example native compact record:

```js
{
  _id: ObjectId(objectId),
  body: base64url(ciphertextAndTag),
  cryptoVersion: "m1"
}
```

When decrypting a native `m1` record:

```text
salt = fixedProtocolSalt
nonce = record._id bytes
ciphertextAndTag = base64urlDecode(record.body)
key = PBKDF2(password, fixedProtocolSalt, 600000)
```

## Quantum Box Flow

Quantum Box should continue producing portable random-salt `mv1` payloads:

1. User enters plaintext and password.
2. Quantum Box generates a MongoDB-compatible ObjectId.
3. Quantum Box generates a fresh 16-byte random salt.
4. Quantum Box derives the AES-256-GCM key from password and salt.
5. Quantum Box uses ObjectId bytes as the AES-GCM nonce.
6. Quantum Box encrypts the UTF-8 plaintext.
7. Quantum Box exports `mv1.<base64url(objectId || salt || ciphertextAndTag)>`.

Quantum Box should support portable `mv1` payloads and compact messenger-exported `m1` payloads. Compact `m1` decrypt uses the fixed protocol salt.

## Safety Rules

- Never encrypt two different plaintexts with the same derived key and ObjectId.
- For Quantum Box `mv1`, generate a fresh random salt for every payload.
- For messenger-native `m1`, require strong unique passwords per DM.
- If insertion fails because of duplicate `_id`, discard the payload and regenerate ObjectId and ciphertext.
- Use raw 12-byte ObjectId bytes as the nonce, not the 24-character hex string.
- Keep payload format versioning separate from any future messenger key versioning.

## Additional Authenticated Data

Use AES-GCM `additionalData` only if stable metadata is known during both encryption and decryption.

Possible AAD fields:

```text
cryptoVersion || dmId || senderId || objectId
```

AAD is authenticated but not encrypted. If any AAD value changes, decryption fails. This can prevent moving encrypted bodies between DMs, senders, or message records.

For current Quantum Box portable payloads, omit AAD unless the same values are guaranteed to be available when decrypting manually.

## Open Decisions

- Whether the mobile app should store `cryptoVersion` per message or infer it from conversation settings.
