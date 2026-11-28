# Neon World Clock — Firestore Security Specification

## 1. Data Invariants
1. **Strict Owner Isolation & Bootstrapped Admin RBAC (PII Protection):** Documents under `/users/{uid}` contain personally identifiable information (`email`, `displayName`) and subscription/moderation flags (`plan`, `isBanned`). Only the authenticated user whose `request.auth.uid == uid` or the verified bootstrapped admin (`vidushanawood@gmail.com` with `email_verified == true`) may `get` or `delete` a `/users/{uid}` document. Listing `/users` is restricted strictly to `isBootstrappedAdmin()` with zero `get()` or `exists()` lookups.
2. **Email Verification Mandatory for Writes:** Every `create`, `update`, and `delete` operation on `/users/{uid}`, `/users/{uid}/watchlist/{movieId}`, and `/mail/{mailId}` requires `request.auth.token.email_verified == true`.
3. **Zero Plaintext Passwords, Zero Card Numbers & No Shadow Fields:**
   - `/users/{uid}` allows ONLY `['uid', 'email', 'displayName', 'emailVerified', 'plan', 'proActivatedAt', 'proExpiresAt', 'activationMethod', 'isBanned', 'celebrationShown', 'createdAt', 'updatedAt']`.
   - `/users/{uid}/watchlist/{movieId}` allows ONLY `['uid', 'movieId', 'title', 'posterPath', 'backdropPath', 'releaseDate', 'voteAverage', 'overview', 'addedAt']`.
   - `/mail/{mailId}` allows ONLY `['uid', 'to', 'transactionId', 'planName', 'amountPaid', 'activationMethod', 'activationDate', 'expiryDate', 'message', 'createdAt']`.
4. **Anti-Escalation & Moderation Enforcement:**
   - On `create /users/{uid}`, non-admin users MUST initialize `plan == 'free'`, `proActivatedAt == null`, `proExpiresAt == null`, `activationMethod == 'none'`, `isBanned == false`, and `celebrationShown == true`.
   - Regular users can NEVER modify `isBanned` to unban themselves or set `activationMethod == 'admin'`.
   - Self-activated Pro plans (`payment` or `redeem`) are strictly capped at a maximum 31-day window (`<= 2678400000` ms from `request.time.toMillis()`) and require `isBanned == false`.
   - Banned users cannot update their profile or activate Pro.
5. **Identity & Parent Relational Binding (Master Gate):**
   - For `/users/{uid}/watchlist/{movieId}` and `/mail/{mailId}`: writes by owners verify `incoming().uid == request.auth.uid` and `exists(/databases/$(database)/documents/users/$(uid))`.
   - For `/mail/{mailId}`: `incoming().transactionId == mailId`, `incoming().to.lower() == request.auth.token.email.lower()` (for owners), and receipts are immutable (`allow update, delete: if false`).
6. **Secure List Queries (Query Enforcer):** Zero `get()` or `exists()` calls inside any `allow list` rule.
   - `/users/{uid}` list: `isBootstrappedAdmin()` only.
   - `/users/{uid}/watchlist/{movieId}` list: `isSignedIn() && isOwner(uid) && resource.data.uid == request.auth.uid`.
   - `/mail/{mailId}` list: `isBootstrappedAdmin() || (isSignedIn() && resource.data.uid == request.auth.uid)`.
7. **Temporal Integrity & Volumetric Hardening:** Server timestamps (`createdAt`, `addedAt`, `updatedAt`) must match `request.time` on write and creation timestamps remain immutable. All string fields enforce explicit `.size()` bounds.

## 2. The "Dirty Dozen" Adversarial Payloads (All MUST Return `PERMISSION_DENIED`)
1. **Unauthenticated Read:** `get /users/userA`, `list /users`, or `get /mail/tx1` with `request.auth == null`.
2. **Cross-User PII & Receipt Read:** `get /users/userB`, `list /users`, or `get /mail/txOfUserB` while signed in as regular `userA`.
3. **Self-Admin / Free-Pro Signup Forgery:** `create /users/userA` with `plan: "pro"` or `activationMethod: "admin"`.
4. **Self-Unban Attack:** `update /users/userA` setting `isBanned: false` when `existing().isBanned == true`.
5. **Infinite Pro Expiry Forgery:** `update /users/userA` setting `proExpiresAt` 10 years in the future (`> 31 days`).
6. **Unauthorized Admin Action:** Regular `userA` attempting to `update /users/userB` to ban or downgrade `userB`, or `delete /users/userB`.
7. **Unverified Email Write:** `create /users/userA`, `create /users/userA/watchlist/550`, or `create /mail/tx1` with `email_verified: false`.
8. **Shadow Field / Card Number Injection:** `create /users/userA` with extra `cardNumber` or `password` field, or `create /mail/tx1` with extra `bcc` field.
9. **Receipt Spam to Another User's Email:** Regular `userA` creating `/mail/tx1` with `to: "victim@example.com"` not matching `request.auth.token.email`.
10. **Receipt Tampering / Deletion:** Any user or admin attempting `update /mail/tx1` or `delete /mail/tx1`.
11. **Immutable Field Tampering:** `update /users/userA` modifying `uid`, `email` (as admin), or `createdAt`, or `update /users/userA/watchlist/550` modifying `movieId` or `addedAt`.
12. **Denial of Wallet Payload:** `create /mail/tx1` with `message.html` of 100,000 chars (> 12,000 max) or `create /users/userA/watchlist/550` with `overview` > 1,200 chars.
