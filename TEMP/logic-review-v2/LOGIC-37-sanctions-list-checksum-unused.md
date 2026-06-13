# LOGIC-37 — Downloaded sanctions lists are never integrity-validated (checksum computed but unused)

**Severity:** 🟠 Medium
**Area:** Regulatory
**Stage:** Stage 3 — Compliance & sanctions hardening
**Suggested labels:** `bug`, `security`, `severity:medium`, `area:regulatory`, `stage:3-compliance-hardening`, `audit:logic-review-v2`
**Location:** `services/regulatory/providers/list-downloader.ts:314-329`
**Filed as:** [#447](https://github.com/xlabtg/TONAIAgent/issues/447)

## Problem

`refreshList()` downloads a sanctions list, computes a SHA-256 `checksum` and stores it on the snapshot, but
never validates it against a pinned/expected hash, the previous snapshot, or a minimum entry count. A truncated,
empty, or tampered download is accepted as a valid list.

## Evidence

```ts
const content = await this.download(src.url);
const checksum = crypto.createHash('sha256').update(content).digest('hex');  // computed, never compared
const entries = parseContent(content, src.format);
// snapshot stored regardless of integrity / size sanity
```

## Impact

A partial HTTP body, an upstream outage returning an error page, or a tampered feed yields a sanctions list
with missing entries — sanctioned entities silently disappear from screening, a direct compliance failure.

## Suggested fix

Validate the download before accepting it: compare `checksum`/entry-count against the previous snapshot and
reject an unexpected large shrink; support a pinned expected hash where the source publishes one; refuse empty
or unpar. able payloads. Surface a loud error/alert on rejection rather than silently replacing the list.

## Acceptance criteria

- [ ] A download that parses to zero/abnormally-few entries (vs. the prior snapshot) is rejected, not stored.
- [ ] Where a source publishes a checksum, the download is verified against it.
- [ ] Rejection raises an alert and keeps the last-known-good list.
