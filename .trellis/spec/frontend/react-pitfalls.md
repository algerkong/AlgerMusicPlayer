> **OBSOLETE (Trellis React scaffold).** This file does **not** describe LYMusicPlayer.
> Use `directory-structure.md`, `component-guidelines.md`, `hook-guidelines.md`,
> `state-management.md`, `type-safety.md`, and `quality-guidelines.md` instead.

# React Pitfalls & Common Mistakes

> Critical React patterns that cause bugs if not followed.

---

## Storing Functions in useState

**CRITICAL**: When storing a function in React state, you MUST wrap it in an arrow function.

React's `useState` setter interprets function arguments as "updater functions" and executes them immediately.

```tsx
// WRONG - React will EXECUTE handler immediately!
const [callback, setCallback] = useState<(() => void) | null>(null);
setCallback(myFunction); // myFunction(prevState) is called!

// CORRECT - Wrap in arrow function to store as value
setCallback(() => myFunction); // myFunction is stored, not called
```

**Why this happens:**

React's `setState` has two signatures:

1. `setState(newValue)` - Direct value
2. `setState(prevState => newState)` - Updater function

When you pass a function, React assumes it's an updater and calls it with the previous state.

**Real-world example:**

```tsx
// NavigationContext.tsx
const [backHandler, setBackHandlerState] = useState<(() => void) | null>(null);

// Bug: backHandler() gets called immediately, resetting app state
setBackHandlerState(handler);

// Fix: Store the handler as a value
setBackHandlerState(() => handler);
```

**Symptoms of this bug:**

- State unexpectedly resets after setting
- UI "flickers" - shows new state briefly then reverts
- Functions execute at wrong times

---

## Object/Date Stability in Hook Dependencies

**CRITICAL**: When passing objects or Date values to hooks, you MUST ensure reference stability using `useMemo`.

React's dependency comparison uses reference equality (`===`). Functions that create new objects (like `new Date()`) return different references on every render, causing infinite re-render loops.

```tsx
// WRONG - Creates new Date objects every render -> infinite loop
const [timeRange, setTimeRange] = useState<TimeRangeOption>('all');
const { dateFrom, dateTo } = getDateRangeFromOption(timeRange); // new Date() inside!

useMyData({ dateFrom, dateTo }); // Dependencies change -> refetch -> re-render -> repeat

// CORRECT - useMemo stabilizes the reference
const { dateFrom, dateTo } = useMemo(
  () => getDateRangeFromOption(timeRange),
  [timeRange] // Only recalculate when timeRange actually changes
);

useMyData({ dateFrom, dateTo }); // Stable references, no infinite loop
```

**Why this happens:**

1. `getDateRangeFromOption()` returns `{ dateFrom: new Date(...), dateTo: new Date(...) }`
2. Each render creates NEW Date objects with different references
3. Hook sees different dependency values -> triggers effect/fetch
4. Fetch completes -> state updates -> component re-renders
5. Go to step 1 -> **infinite loop**

**Symptoms of this bug:**

- Console shows repeated API calls (same request fired many times per second)
- UI "flickers" or feels unresponsive
- High CPU usage, app becomes slow
- Network tab shows endless requests

**When to use useMemo for hook dependencies:**

| Scenario                                         | Need useMemo? |
| ------------------------------------------------ | ------------- |
| Primitive values (`string`, `number`, `boolean`) | No            |
| Objects/arrays created inline                    | Yes           |
| Date objects                                     | Yes           |
| Results from functions that return new objects   | Yes           |
| Stable references (from useState, useRef)        | No            |

---

## State Lifecycle & Component Unmounting

**Problem**: State is lost when navigating between views because components get unmounted.

**Common scenario**:

```tsx
// Bad - TreeView's expandedIds state is lost when switching to editor
function MyPage() {
  const [editingItem, setEditingItem] = useState(null);

  if (editingItem) {
    return <ItemEditor item={editingItem} />; // TreeView unmounts here!
  }

  return <TreeView />; // Remounts with fresh state when returning
}
```

**Solution**: Lift state to a component that doesn't unmount:

```tsx
// Good - expandedIds persists because MyPage never unmounts
function MyPage() {
  const [editingItem, setEditingItem] = useState(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  if (editingItem) {
    return <ItemEditor item={editingItem} />;
  }

  return (
    <TreeView
      expandedIds={expandedIds} // Controlled mode
      onExpandedIdsChange={setExpandedIds}
    />
  );
}
```

**State Lifecycle Decision Matrix**:

| Lifecycle           | When to use                                  | How to implement                    |
| ------------------- | -------------------------------------------- | ----------------------------------- |
| **Component-level** | Form inputs, temp UI state                   | `useState` inside component         |
| **Page-level**      | Expand/collapse, scroll position, selections | Lift to parent that doesn't unmount |
| **Session-level**   | User preferences, last viewed item           | `localStorage` or Electron store    |

**Key Questions Before Creating State**:

1. **Will this component unmount during normal user flow?**
   - Conditional rendering (`{editing ? <A/> : <B/>}`)
   - Route changes
   - Key prop changes

2. **Should the state survive the unmount?**
   - User expectations: "I expanded this folder, I expect it to stay expanded"
   - UX: No jarring state resets

3. **Where should the state live?**
   - Find the nearest ancestor that won't unmount during the relevant user flows

---

## Loading State Patterns (Avoiding Flash of Loading)

**Problem**: Showing loading skeleton on every data fetch causes UI flicker, especially on refetch after user actions.

**Bad pattern**:

```tsx
// Bad - Shows skeleton on every fetch, including refetch
const fetchData = async () => {
  setIsLoading(true); // Always shows skeleton!
  const data = await api.getData();
  setData(data);
  setIsLoading(false);
};

// User deletes item -> refetch -> flash of skeleton -> jarring UX
```

**Good pattern**: Distinguish initial load vs background refresh:

```tsx
// Good - Only show skeleton on initial load
const [isLoading, setIsLoading] = useState(true); // Initial load
const [isRefetching, setIsRefetching] = useState(false); // Background refresh

const fetchData = async (isRefetch = false) => {
  if (isRefetch) {
    setIsRefetching(true); // Silent refresh, keep showing data
  } else {
    setIsLoading(true); // Show skeleton only on initial load
  }

  try {
    const data = await api.getData();
    setData(data);
  } finally {
    setIsLoading(false);
    setIsRefetching(false);
  }
};

// Expose separate refetch function
const refetch = () => fetchData(true);

// Initial load
useEffect(() => {
  void fetchData(false);
}, []);
```

**When to show loading skeleton**:

| Scenario                      | Show skeleton? | Why                                         |
| ----------------------------- | -------------- | ------------------------------------------- |
| Initial page load             | Yes            | User expects to wait for first load         |
| Refetch after edit/delete     | No             | Keep showing existing data, update silently |
| Refetch after navigation back | No             | User expects to see what they left          |
| Pull-to-refresh (mobile)      | Spinner only   | Show refresh indicator, not full skeleton   |
| Pagination / load more        | Partial        | Only show loading for new items             |

**Optional: Show subtle refetch indicator**:

```tsx
// Show a subtle indicator without replacing content
{
  isRefetching && <div className="absolute top-2 right-2 text-xs text-muted">Updating...</div>;
}
```

---

## useChat Hook ID Change Causes State Reset

**CRITICAL**: When using chat hooks (like Vercel AI SDK's `useChat`) with a dynamic `id` prop, changing the `id` will cause the hook to reinitialize and **clear all messages**.

This creates a race condition when loading chat history.

```tsx
// WRONG - Race condition: setMessages is called but then useChat resets
const { messages, setMessages } = useChat({
  id: currentChat?.id // When this changes, hook reinitializes
});

const handleSelectChat = async (chat: Chat) => {
  const result = await api.getChat(chat.id);
  setCurrentChat(result.chat); // 1. Triggers useChat to reset
  setMessages(result.messages); // 2. Messages set but immediately cleared by reset!
};
```

```tsx
// CORRECT - Use ref + useEffect to set messages AFTER hook reinitializes
const pendingMessagesRef = useRef<Message[] | null>(null);

const { messages, setMessages } = useChat({
  id: currentChat?.id
});

const handleSelectChat = async (chat: Chat) => {
  const result = await api.getChat(chat.id);
  pendingMessagesRef.current = result.messages; // 1. Store messages
  setCurrentChat(result.chat); // 2. Trigger hook reset
};

// 3. Apply messages after hook reinitializes
useEffect(() => {
  if (pendingMessagesRef.current !== null) {
    setMessages(pendingMessagesRef.current);
    pendingMessagesRef.current = null;
  }
}, [currentChat?.id, setMessages]);
```

**Why this happens:**

1. `useChat({ id })` uses `id` to namespace its internal state
2. When `id` changes, the hook treats it as a "new chat" and resets
3. Any `setMessages` call made before the reset takes effect gets overwritten

**Symptoms of this bug:**

- Chat history loads (can see in console) but UI shows empty/welcome state
- Messages appear briefly then disappear
- Only happens when switching between existing chats, not when sending new messages

**General rule for hooks with ID props:**
When a hook uses an `id` to manage state, assume the state resets on `id` change. Use refs + effects to apply state after the reset.

---

## Summary: Quick Reference

| Pitfall                       | Symptom                                       | Fix                            |
| ----------------------------- | --------------------------------------------- | ------------------------------ |
| Function in useState          | State resets, functions execute at wrong time | Wrap with `() =>`              |
| Object/Date in dependencies   | Infinite loops, endless API calls             | Use `useMemo`                  |
| State in unmounting component | State lost on navigation                      | Lift state to parent           |
| Loading on every fetch        | UI flickers                                   | Distinguish initial vs refetch |
| Hook ID change                | State cleared, race conditions                | Use ref + useEffect            |

---

**Language**: All documentation must be written in **English**.
