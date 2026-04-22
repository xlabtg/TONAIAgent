# Task: Implement CSRF Token Generation and Distribution

**Priority:** 🟡 MEDIUM
**Effort:** ~2 days
**Related Issue:** #325 (re-audit finding §4)
**Suggested labels:** `security`, `api`, `csrf`

## Problem

PR #320 added `isCsrfTokenValid()` which validates a presented CSRF token against a server-side stored value using constant-time comparison. But there is **no token generation, no issuance endpoint, and no distribution path** — the validator has nothing to validate against.

## Acceptance Criteria

- [ ] Design the CSRF strategy — recommended: **double-submit cookie** with a server-signed token (HMAC over `userId + sessionId + issuedAt`). Alternative: synchronizer token stored server-side per session.
- [ ] Implement `generateCsrfToken(sessionId): { token, cookie }`.
- [ ] Issue the token via:
  - A `Set-Cookie: csrf_token=…; SameSite=Strict; Secure; HttpOnly=false; Path=/` on session creation
  - Inclusion in the response to `GET /healthz` if no session (allows unauthenticated pages that do state-mutating requests)
- [ ] Require the token on every `POST/PUT/PATCH/DELETE` endpoint — compare `X-CSRF-Token` header to the cookie value.
- [ ] Rotate the token on login, logout, and sensitive operations (password change, 2FA change).
- [ ] Add tests for:
  - Missing token → 403
  - Mismatched token → 403
  - Expired token → 403
  - Valid token → 2xx
- [ ] Update `docs/api.md` with the CSRF contract.
- [ ] Update the Telegram Mini App client to read the cookie and send the header.

## Implementation Notes

- Signed tokens (no server-side session storage) scale horizontally — stateless validation.
- HMAC key goes through `SecretsLoader` (see [`09-secrets-wiring.md`](./09-secrets-wiring.md)).
- Tokens should be ~32 bytes of randomness (minimum) + HMAC.

## Files to Create/Modify

- `services/api/middleware/csrf.ts` — add `generateCsrfToken`, `csrfMiddleware`
- `services/api/routes/session.ts` — issue token on session start
- `apps/mini-app/**` — read cookie, send header on mutating requests
- `tests/api/csrf.test.ts` — expand
- `docs/api.md` — document the CSRF contract

## References

- Re-audit report §4: API Input Validation
- PR #320 (merged)
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
