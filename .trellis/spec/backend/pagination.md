# Pagination Guidelines

> Cursor vs offset pagination for list APIs.

---

## When to Use Each Approach

| Approach   | Performance                | Use Case                          | Example                        |
| ---------- | -------------------------- | --------------------------------- | ------------------------------ |
| **Cursor** | O(1) - constant            | User-facing lists, large datasets | Activity feed, search results  |
| **Offset** | O(n) - degrades with depth | Admin interfaces, small datasets  | Settings list, user management |

**Default recommendation**: Use **cursor pagination** for user-facing lists.

---

## Why Cursor is Faster

```
Offset pagination (page 900,000 of 1M records):
  SELECT * FROM items ORDER BY updated_at LIMIT 20 OFFSET 900000
  Database scans 900,000 rows, discards them, returns 20
  Time: ~700ms

Cursor pagination (same position):
  SELECT * FROM items
  WHERE (updated_at, id) < (cursor_time, cursor_id)
  ORDER BY updated_at DESC, id DESC LIMIT 20
  Database uses index, jumps directly to position
  Time: ~40ms (17x faster)
```

---

## Cursor Pagination Schema

### Input Schema

```typescript
export const listItemsInputSchema = z.object({
  status: z.enum(['active', 'archived']).optional(),
  cursor: z.string().optional(), // Format: base64(`${updatedAt}_${id}`)
  limit: z.number().min(1).max(100).optional().default(20)
});
```

### Output Schema

```typescript
export const listItemsOutputSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  items: z.array(itemSchema).optional(),
  nextCursor: z.string().nullable().optional(), // null = no more data
  hasMore: z.boolean().optional()
});
```

---

## Cursor Encoding/Decoding

Use `updatedAt` + `id` for stable ordering (handles same-timestamp collisions):

```typescript
/**
 * Encode cursor from updatedAt and id
 */
function encodeCursor(updatedAt: Date, id: string): string {
  return Buffer.from(`${updatedAt.getTime()}_${id}`).toString('base64');
}

/**
 * Decode cursor to { updatedAt, id }
 */
function decodeCursor(cursor: string): { updatedAt: Date; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const [timestampStr, id] = decoded.split('_');
    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp) || !id) return null;
    return { updatedAt: new Date(timestamp), id };
  } catch {
    return null;
  }
}
```

---

## Cursor Query Pattern

```typescript
export function listItems(input: ListItemsInput): ListItemsOutput {
  const { status, cursor, limit = 20 } = input;
  const conditions = [];

  // Apply filters
  if (status) {
    conditions.push(eq(item.status, status));
  }

  // Apply cursor condition
  if (cursor) {
    const cursorData = decodeCursor(cursor);
    if (!cursorData) {
      return { success: false, error: 'Invalid cursor format' };
    }

    // Tuple comparison: (updatedAt, id) < (cursorUpdatedAt, cursorId)
    const cursorCondition = or(
      lt(item.updatedAt, cursorData.updatedAt),
      and(eq(item.updatedAt, cursorData.updatedAt), lt(item.id, cursorData.id))
    );
    conditions.push(cursorCondition);
  }

  // Fetch limit + 1 to determine hasMore
  const fetchLimit = limit + 1;
  const results = db
    .select()
    .from(item)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(item.updatedAt), desc(item.id))
    .limit(fetchLimit)
    .all();

  // Check if there are more results
  const hasMore = results.length > limit;
  if (hasMore) {
    results.pop(); // Remove the extra item
  }

  // Generate next cursor from last item
  const nextCursor =
    hasMore && results.length > 0
      ? encodeCursor(results[results.length - 1].updatedAt, results[results.length - 1].id)
      : null;

  return { success: true, items: results, nextCursor, hasMore };
}
```

---

## Frontend Integration

```typescript
function useItems({ status }) {
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Initial fetch
  const fetchInitial = async () => {
    const result = await window.api.items.list({ status, limit: 20 });
    setItems(result.items);
    setNextCursor(result.nextCursor);
    setHasMore(result.hasMore);
  };

  // Load more
  const loadMore = async () => {
    if (!hasMore || !nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);

    const result = await window.api.items.list({
      status,
      cursor: nextCursor,
      limit: 20
    });

    setItems((prev) => [...prev, ...result.items]);
    setNextCursor(result.nextCursor);
    setHasMore(result.hasMore);
    setIsLoadingMore(false);
  };

  return { items, hasMore, loadMore, isLoadingMore };
}
```

---

## List API Checklist

When creating a new list API:

- [ ] **Choose pagination type**: Cursor (default) or Offset (admin only)
- [ ] **Add filter parameters**: `status`, `type`, etc.
- [ ] **Add cursor/limit to input schema**
- [ ] **Add nextCursor/hasMore to output schema**
- [ ] **Use composite ordering**: `ORDER BY updatedAt DESC, id DESC`
- [ ] **Fetch limit + 1**: To determine `hasMore` without extra count query
- [ ] **Handle invalid cursor**: Return error, don't crash

---

## Offset Pagination (When Needed)

For admin interfaces or small datasets:

```typescript
export const listAdminItemsInputSchema = z.object({
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0)
});

export function listAdminItems(input: ListAdminItemsInput): ListAdminItemsOutput {
  const { limit, offset } = input;

  const items = db
    .select()
    .from(item)
    .orderBy(desc(item.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  const [{ count }] = db
    .select({ count: sql<number>`count(*)` })
    .from(item)
    .all();

  return {
    success: true,
    items,
    total: count,
    limit,
    offset
  };
}
```

---

## Summary

| Rule                            | Reason                        |
| ------------------------------- | ----------------------------- |
| Default to cursor pagination    | O(1) performance              |
| Use `updatedAt + id` for cursor | Handles timestamp collisions  |
| Fetch `limit + 1`               | Efficient hasMore check       |
| Encode cursor as base64         | URL-safe, opaque              |
| Reserve offset for admin        | Only when page jumping needed |
