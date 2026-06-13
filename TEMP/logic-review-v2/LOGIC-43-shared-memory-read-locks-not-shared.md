# LOGIC-43 — Shared-memory read locks overwrite each other (single map entry per key)

**Severity:** 🟠 Medium
**Area:** Reliability
**Stage:** Stage 4 — Strategy / backtest / optimizer integrity
**Suggested labels:** `bug`, `severity:medium`, `area:reliability`, `stage:4-strategy-integrity`, `audit:logic-review-v2`
**Location:** `core/multi-agent/memory/shared-memory.ts:108-146`
**Filed as:** [#453](https://github.com/xlabtg/TONAIAgent/issues/453)

## Problem

Locks are stored in `this.locks: Map<key, MemoryLock>` — at most one lock record per key. Read locks are
supposed to be shareable by multiple holders, but acquiring a second read lock simply overwrites the map entry
with the new holder. The first reader's lock record is lost; when that reader calls `releaseLock`, the
`holderId` no longer matches and the release returns `false`, while the lock now reflects only the last reader.

## Evidence

```ts
const existingLock = this.locks.get(key);
if (existingLock && existingLock.expiresAt > new Date()) {
  if (existingLock.type === 'write') return null;
  if (type === 'write') return null;
}
// read-on-read falls through and OVERWRITES the single entry:
this.locks.set(key, lock);
```

## Impact

Concurrent readers silently evict each other's lock bookkeeping. A reader cannot reliably release its own lock,
and a write lock can be acquired once the *last* reader's TTL passes even if earlier readers are still active —
breaking the read/write mutual-exclusion guarantee the lock is meant to provide.

## Suggested fix

Model read locks as a set of holders per key (e.g. `Map<key, { write?: Lock; readers: Map<holderId, Lock> }>`):
allow multiple concurrent readers, block writers until all readers release, and release per holder.

## Acceptance criteria

- [ ] Multiple concurrent read-lock holders are tracked independently; each can release its own lock.
- [ ] A write lock is granted only when there are no active readers.
- [ ] Regression test acquires two read locks, releases one, and asserts the other still holds.
