# Neon World Clock — Firestore Security Specification

## 1. Data Invariants
1. **Strict Owner Isolation (PII Protection):** Documents under `/users/{uid}` contain personally identifiable information (`email`, `displayName`). Only the authenticated user whose `request.auth.uid == uid` may `get`, `create`, `update`, or `delete` their own document. Blanket `list` queries on `/users` are unconditionally denied (`allow list: if false`).
2. **Email Verification Mandatory for Writes:** Every `create`, `update`, and `delete` operation on `/users/{uid}` strictly requires `request.auth.token.email_verified == true` and `incoming().emailVerified == true`.
3. **Zero Plaintext Passwords & No Shadow Fields:** Incoming documents may contain ONLY `['uid', 'email', 'displayName', 'emailVerified', 'createdAt', 'updatedAt']`. Any extra field (e.g., `password`, `role`, `isAdmin`) is rejected via `keys().hasOnly(...)` on create and `affectedKeys().hasOnly(...)` on update.
4. **Identity & Email Binding:** `incoming().uid` must equal both `{uid}` and `request.auth.uid`. `incoming().email` must match `request.auth.token.email` (case-insensitive).
5. **Temporal Integrity & Immutability:** `createdAt` must equal `request.time` on create and is strictly immutable (`incoming().createdAt == existing().createdAt`) on update. `updatedAt` (if provided) must equal `request.time`.
6. **Path Variable & Volumetric Hardening:** `{uid}` must satisfy `isValidId(uid)` (`^[a-zA-Z0-9_\-]+$`, 1..128 chars). `displayName` is bounded to 1..80 chars; `email` is bounded to 3..254 chars.

## 2. The "Dirty Dozen" Adversarial Payloads (All MUST Return `PERMISSION_DENIED`)
1. **Unauthenticated Read:** `get /users/userA` with `request.auth == null`.
2. **Cross-User PII Read:** `get /users/userB` while signed in as `userA`.
3. **Collection Scrape (`list`):** `list /users` while signed in as verified `userA`.
4. **Unverified Email Create:** `create /users/userA` with `email_verified: false` in token.
5. **UID Spoofing:** `create /users/userA` with payload `{ uid: "userB", ... }`.
6. **Email Spoofing:** `create /users/userA` with payload `{ email: "victim@example.com", ... }` while token email is `attacker@example.com`.
7. **Shadow Field Injection (Plaintext Password):** `create /users/userA` with extra field `password: "secret123"`.
8. **Privilege Escalation (Ghost Role):** `create /users/userA` or `update /users/userA` with extra field `isAdmin: true` or `role: "admin"`.
9. **Client-Forged Timestamp:** `create /users/userA` with `createdAt: Timestamp(2020-01-01)` instead of `request.time`.
10. **Immutable `createdAt` Tampering:** `update /users/userA` modifying `createdAt`.
11. **Oversized Display Name (Denial of Wallet):** `create` or `update /users/userA` with `displayName` length 5000 chars (> 80 max).
12. **Value Poisoning on Update:** `update /users/userA` setting `emailVerified: false` or `displayName: 12345` (invalid type).
