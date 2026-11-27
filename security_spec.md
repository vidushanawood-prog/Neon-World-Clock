# Neon World Clock — Firestore Security Specification

## 1. Data Invariants
1. **Strict Owner Isolation (PII Protection):** Documents under `/users/{uid}` contain personally identifiable information (`email`, `displayName`). Only the authenticated user whose `request.auth.uid == uid` may `get`, `create`, `update`, or `delete` their own document. Blanket `list` queries on `/users` are unconditionally denied (`allow list: if false`).
2. **Email Verification Mandatory for Writes:** Every `create`, `update`, and `delete` operation on `/users/{uid}` and `/users/{uid}/watchlist/{movieId}` strictly requires `request.auth.token.email_verified == true`.
3. **Zero Plaintext Passwords & No Shadow Fields:** Incoming `/users/{uid}` documents may contain ONLY `['uid', 'email', 'displayName', 'emailVerified', 'createdAt', 'updatedAt']`. Incoming `/users/{uid}/watchlist/{movieId}` documents may contain ONLY `['uid', 'movieId', 'title', 'posterPath', 'backdropPath', 'releaseDate', 'voteAverage', 'overview', 'addedAt']`.
4. **Identity & Parent Relational Binding (Master Gate):**
   - For `/users/{uid}`: `incoming().uid` must equal both `{uid}` and `request.auth.uid`; `incoming().email` must match `request.auth.token.email` (case-insensitive).
   - For `/users/{uid}/watchlist/{movieId}`: `incoming().uid` must equal `{uid}` and `request.auth.uid`; `string(incoming().movieId)` must equal `{movieId}`; and single-document writes (`create`/`update`) must verify the parent user profile document exists via `exists(/databases/$(database)/documents/users/$(uid))`.
5. **Secure List Queries (Query Enforcer):** `allow list` on `/users/{uid}/watchlist/{movieId}` never uses `get()` or `exists()`; it enforces `isSignedIn() && isOwner(uid) && resource.data.uid == request.auth.uid`.
6. **Temporal Integrity & Immutability:** `createdAt` (on profiles) and `addedAt` (on watchlist items) must equal `request.time` on create and remain strictly immutable on update. `updatedAt` (if provided) must equal `request.time`.
7. **Path Variable & Volumetric Hardening:** `{uid}` satisfies `isValidId(uid)` (`^[a-zA-Z0-9_\-]+$`, 1..128 chars). `{movieId}` satisfies `isValidMovieId(movieId)` (`^[0-9]{1,12}$`). Every string field has strict `.size()` bounds (`title <= 200`, `posterPath <= 300`, `backdropPath <= 300`, `releaseDate <= 20`, `overview <= 1200`).

## 2. The "Dirty Dozen" Adversarial Payloads (All MUST Return `PERMISSION_DENIED`)
1. **Unauthenticated Read:** `get /users/userA` or `get /users/userA/watchlist/550` with `request.auth == null`.
2. **Cross-User PII & Watchlist Read:** `get /users/userB` or `list /users/userB/watchlist` while signed in as `userA`.
3. **User Collection Scrape (`list`):** `list /users` while signed in as verified `userA`.
4. **Unverified Email Write:** `create /users/userA` or `create /users/userA/watchlist/550` with `email_verified: false` in token.
5. **UID Spoofing:** `create /users/userA/watchlist/550` with payload `{ uid: "userB", ... }`.
6. **Movie ID Mismatch / Path Poisoning:** `create /users/userA/watchlist/550` with payload `{ movieId: 999, ... }` or document ID `"550;DROP TABLE"`.
7. **Shadow Field Injection:** `create /users/userA` with extra `password` field, or `create /users/userA/watchlist/550` with extra `isAdmin: true` or `streamUrl` field.
8. **Orphaned Watchlist Write:** `create /users/userA/watchlist/550` when parent `/users/userA` document does not exist.
9. **Client-Forged Timestamp:** `create /users/userA/watchlist/550` with `addedAt: Timestamp(2020-01-01)` instead of `request.time`.
10. **Immutable Field Tampering:** `update /users/userA` modifying `createdAt`, or `update /users/userA/watchlist/550` modifying `movieId`, `uid`, or `addedAt`.
11. **Denial of Wallet Payload:** `create /users/userA/watchlist/550` with `overview` length 50,000 chars (> 1200 max) or `title` length 500 chars (> 200 max).
12. **Value Poisoning:** `create /users/userA/watchlist/550` with `voteAverage: 999` (> 10) or `title: 12345` (non-string).
