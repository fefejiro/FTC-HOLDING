# TTL Cleanup Strategy for Transient Lyrics

## Overview
The `transient_lyrics` table stores copyrighted song lyrics temporarily with a 24-hour expiration. This document outlines the cleanup strategy to ensure lyrics are automatically deleted after expiration.

---

## Approach 1: Query-Time Filtering (Recommended)

**How it works:**
- Don't delete expired rows immediately
- Filter out expired rows when querying
- Periodic cleanup via cron job (e.g., daily at 3 AM)

**Advantages:**
- Simple to implement
- No real-time background jobs needed
- PostgreSQL handles filtering efficiently

**Implementation:**
```typescript
// When fetching lyrics, always filter by expiration
const getTransientLyrics = async (recognizedTrackId: string) => {
  return db
    .select()
    .from(transientLyrics)
    .where(
      and(
        eq(transientLyrics.recognizedTrackId, recognizedTrackId),
        gt(transientLyrics.expiresAt, new Date()) // Only non-expired
      )
    )
    .limit(1);
};

// Periodic cleanup job (run daily)
const cleanupExpiredLyrics = async () => {
  const deleted = await db
    .delete(transientLyrics)
    .where(lt(transientLyrics.expiresAt, new Date()));
  
  console.log(`Cleaned up ${deleted.rowCount} expired lyric records`);
};
```

**Cron Setup:**
```typescript
// In server/index.ts
import cron from 'node-cron';

// Run cleanup every day at 3:00 AM
cron.schedule('0 3 * * *', async () => {
  await cleanupExpiredLyrics();
});
```

---

## Approach 2: PostgreSQL Triggers (Advanced)

**How it works:**
- Use PostgreSQL's built-in trigger system
- Automatically delete rows when accessed after expiration

**Not recommended** because:
- Adds complexity to database layer
- Harder to debug and monitor
- Replit's PostgreSQL may have limitations on custom functions

---

## Approach 3: Real-Time Deletion

**How it works:**
- Delete immediately when TTL expires using background workers

**Not recommended** because:
- Requires persistent background processes
- Overkill for 24-hour TTL
- More complex error handling

---

## Recommended Implementation

**Phase 1: Query-Time Filtering (Immediate)**
```typescript
// Always check expiration when fetching
const lyrics = await getTransientLyrics(trackId);
if (!lyrics || lyrics.expiresAt < new Date()) {
  return null; // Expired or not found
}
```

**Phase 2: Daily Cleanup Job (After MVP)**
```bash
npm install node-cron
```

```typescript
// server/cleanup.ts
export async function cleanupExpiredLyrics() {
  const cutoffDate = new Date();
  const result = await db
    .delete(transientLyrics)
    .where(lt(transientLyrics.expiresAt, cutoffDate));
  
  return result.rowCount || 0;
}

// server/index.ts
import cron from 'node-cron';
import { cleanupExpiredLyrics } from './cleanup';

// Run daily at 3 AM
cron.schedule('0 3 * * *', async () => {
  const deleted = await cleanupExpiredLyrics();
  console.log(`[Cleanup] Removed ${deleted} expired lyric records`);
});
```

---

## TTL Calculation

When creating transient lyrics:
```typescript
const createTransientLyric = async (data) => {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now
  
  return db.insert(transientLyrics).values({
    ...data,
    expiresAt,
  });
};
```

---

## Monitoring & Alerts

**Metrics to track:**
- Number of transient lyrics created per day
- Number of expired lyrics cleaned up
- Average age of transient lyrics at cleanup

**Future improvement:**
- Add admin dashboard showing transient lyrics stats
- Alert if cleanup job fails for >24 hours
- Monitor disk space usage for transient_lyrics table

---

## Compliance Notes

**Why 24 hours?**
- Balances user experience (can revisit recently identified songs) with copyright safety
- Short enough to avoid becoming permanent storage
- Long enough to cache for performance

**What if user revisits after expiration?**
- Re-fetch from Musixmatch API
- Create new transient lyrics entry with fresh 24-hour TTL
- This is expected behavior and compliant

---

## Next Steps

1. ✅ Implement query-time filtering in storage layer
2. ⏳ Add cleanup cron job (after MVP launch)
3. ⏳ Add monitoring dashboard (future enhancement)
