> **过时（Trellis React 脚手架残留）。** 不描述 LYMusicPlayer。  
> 请改读：`directory-structure.md`、`component-guidelines.md`、`hook-guidelines.md`、  
> `state-management.md`、`type-safety.md`、`quality-guidelines.md`。

# Hook Guidelines

> Patterns for React Query hooks (queries and mutations).

---

## Query Hook Pattern

Use this pattern for data fetching hooks:

```typescript
import { useQuery } from '@tanstack/react-query';

interface UseExampleOptions {
  workspaceId: string;
  enabled?: boolean;
}

export function useExample({ workspaceId, enabled = true }: UseExampleOptions) {
  return useQuery({
    queryKey: ['example', workspaceId],
    queryFn: async () => {
      const result = await window.api.example.list({ workspaceId });
      return result;
    },
    enabled
  });
}
```

### Key Points

| Rule                                          | Reason                                          |
| --------------------------------------------- | ----------------------------------------------- |
| Include all dependencies in `queryKey`        | Cache invalidation works correctly              |
| Use `enabled` option for conditional fetching | Prevents unnecessary requests                   |
| Return the entire query result                | Consumers can access `isLoading`, `error`, etc. |

---

## Mutation Hook Pattern

Use this pattern for data modification hooks:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface CreateExampleInput {
  workspaceId: string;
  title: string;
}

export function useCreateExample() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateExampleInput) => {
      const result = await window.api.example.create(data);
      return result;
    },
    onSuccess: (_, variables) => {
      // Invalidate related queries to refetch
      queryClient.invalidateQueries({
        queryKey: ['example', variables.workspaceId]
      });
    }
  });
}
```

### Key Points

| Rule                              | Reason                                           |
| --------------------------------- | ------------------------------------------------ |
| Invalidate queries in `onSuccess` | UI reflects the latest data                      |
| Access `variables` in callbacks   | Use input data for targeted invalidation         |
| Return the entire mutation result | Consumers can access `mutate`, `isPending`, etc. |

---

## Update Mutation Pattern

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface UpdateExampleInput {
  id: string;
  title?: string;
  description?: string;
}

export function useUpdateExample() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateExampleInput) => {
      const result = await window.api.example.update(data);
      return result;
    },
    onSuccess: () => {
      // Invalidate all example queries
      queryClient.invalidateQueries({
        queryKey: ['example']
      });
    }
  });
}
```

---

## Delete Mutation Pattern

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface DeleteExampleInput {
  id: string;
  workspaceId: string;
}

export function useDeleteExample() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: DeleteExampleInput) => {
      const result = await window.api.example.delete({ id: data.id });
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['example', variables.workspaceId]
      });
    }
  });
}
```

---

## Custom Hook with IPC (Non-React-Query)

For simpler cases or when React Query is not used:

```typescript
import { useState, useEffect, useCallback } from 'react';

interface UseDataOptions {
  workspaceId: string;
}

interface DataItem {
  id: string;
  title: string;
}

export function useData({ workspaceId }: UseDataOptions) {
  const [data, setData] = useState<DataItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await window.api.data.list({ workspaceId });
      setData(result.items);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  // Initial fetch
  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData
  };
}
```

### With Data Refresh Subscription

See [ipc-electron.md](./ipc-electron.md) for the complete pattern:

```typescript
export function useData({ workspaceId }: UseDataOptions) {
  // ... state and fetchData ...

  const { onDataRefresh } = useDataRefresh();

  // Initial fetch
  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // CRITICAL: Subscribe to data refresh events
  useEffect(() => {
    const unsubscribe = onDataRefresh(() => {
      void fetchData();
    });
    return unsubscribe;
  }, [onDataRefresh, fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
```

---

## Hook Organization

```
modules/
├── example/
│   ├── hooks/
│   │   ├── index.ts          # Re-exports all hooks
│   │   ├── useExample.ts     # Query hook
│   │   ├── useCreateExample.ts
│   │   ├── useUpdateExample.ts
│   │   └── useDeleteExample.ts
│   └── ...
```

**Re-export pattern**:

```typescript
// modules/example/hooks/index.ts
export { useExample } from './useExample';
export { useCreateExample } from './useCreateExample';
export { useUpdateExample } from './useUpdateExample';
export { useDeleteExample } from './useDeleteExample';
```

---

## Optimistic Updates (Advanced)

For better UX, update the UI immediately before the server responds:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useUpdateExample() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateExampleInput) => {
      return await window.api.example.update(data);
    },
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['example'] });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(['example']);

      // Optimistically update
      queryClient.setQueryData(['example'], (old: DataItem[]) =>
        old.map((item) => (item.id === newData.id ? { ...item, ...newData } : item))
      );

      // Return context with previous data
      return { previousData };
    },
    onError: (err, newData, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['example'], context.previousData);
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['example'] });
    }
  });
}
```

---

## Hook Naming Conventions

| Pattern             | Usage                                    |
| ------------------- | ---------------------------------------- |
| `use{Entity}`       | Query hook for fetching entity           |
| `use{Entity}List`   | Query hook for fetching list of entities |
| `useCreate{Entity}` | Mutation hook for creating               |
| `useUpdate{Entity}` | Mutation hook for updating               |
| `useDelete{Entity}` | Mutation hook for deleting               |
| `use{Feature}`      | Custom hook for specific feature logic   |

---

**Language**: All documentation must be written in **English**.
