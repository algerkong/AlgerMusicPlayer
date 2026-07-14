> **过时（Trellis React 脚手架残留）。** 不描述 LYMusicPlayer。  
> 请改读：`directory-structure.md`、`component-guidelines.md`、`hook-guidelines.md`、  
> `state-management.md`、`type-safety.md`、`quality-guidelines.md`。

# Component Guidelines

> Semantic HTML, empty states, and scrollbar patterns.

---

## Semantic HTML

Use proper HTML elements for accessibility and native browser behavior:

```tsx
// Good
<button onClick={handleClick}>Click me</button>

// Bad
<div role="button" onClick={handleClick}>Click me</div>
```

### Exception: Nested Interactive Elements

HTML does not allow `<button>` inside `<button>`. When a clickable card contains nested buttons (e.g., delete button), use `<div role="button">` for the outer container:

```tsx
// Good - Card with nested delete button
<div
  role="button"
  tabIndex={0}
  onClick={() => onClick(item)}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick(item);
    }
  }}
  className="cursor-pointer focus-ring ..."
>
  <span>{item.title}</span>
  <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}>
    Delete
  </button>
</div>

// Bad - Nested buttons cause hydration errors
<button onClick={() => onClick(item)}>
  <span>{item.title}</span>
  <button onClick={onDelete}>Delete</button>  {/* ERROR: button inside button */}
</button>
```

**Required attributes for `<div role="button">`:**

- `role="button"` - Accessibility role
- `tabIndex={0}` - Make it focusable
- `onKeyDown` - Handle Enter/Space keys
- `cursor-pointer` - Visual affordance

---

## Empty State Visual Centering

When displaying empty states in flex-column layouts with headers, use negative margin to achieve visual centering:

```tsx
// Good - Visual centering with negative margin offset
{
  !isLoading && items.length === 0 && (
    <div className="flex-1 flex items-center justify-center">
      <div className="-mt-24">
        <EmptyState />
      </div>
    </div>
  );
}

// Bad - Mathematical centering looks "off" visually
{
  !isLoading && items.length === 0 && (
    <div className="flex-1 flex items-center justify-center">
      <EmptyState />
    </div>
  );
}
```

**Why this pattern?**

- `flex-1 items-center` centers content in the **remaining space** below the header
- This creates mathematically correct but visually awkward positioning
- Negative margin (`-mt-24` to `-mt-32`) offsets the content upward for better visual balance

**Offset Guidelines:**

| Page Type                   | Offset   | Reason                               |
| --------------------------- | -------- | ------------------------------------ |
| Standard page header        | `-mt-24` | Compensates for ~80px header         |
| Header + action button/form | `-mt-32` | Additional offset for extra elements |

---

## Preventing Scrollbar Layout Shift

When a scrollable container's content grows to require a scrollbar, the scrollbar appearance can cause layout shift (content "jumps" left as scrollbar takes up space).

**Solution**: Use `scrollbar-gutter: stable` to reserve space for the scrollbar.

```tsx
// Good - Scrollbar space is always reserved
<main
  className="flex-1 overflow-y-auto p-6"
  style={{ scrollbarGutter: 'stable' }}
>
  {children}
</main>

// Bad - Content shifts when scrollbar appears/disappears
<main className="flex-1 overflow-y-auto p-6">
  {children}
</main>
```

**When to use:**

- Main content areas with `overflow-y-auto`
- Containers where content dynamically expands (e.g., tree views, lists)
- Any scrollable area where centered content (`mx-auto`) would shift

---

## Scrollbar Auto-Hide (Notion-inspired)

Scrollbars should be invisible by default and fade in/out smoothly on hover. This follows Notion's design language.

**Implementation (CSS)**:

```css
/* Global scrollbar styles */
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: hsl(var(--foreground) / 0);
  border-radius: 5px;
  transition: background 0.4s ease;
}

/* Show on container hover */
.scrollable:hover::-webkit-scrollbar-thumb {
  background: hsl(var(--foreground) / 0.12);
  transition: background 0.15s ease;
}

/* Darker on scrollbar hover */
.scrollable::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--foreground) / 0.22);
}

/* Even darker when dragging */
.scrollable::-webkit-scrollbar-thumb:active {
  background: hsl(var(--foreground) / 0.32);
}
```

**Behavior:**

| State              | Opacity | Transition |
| ------------------ | ------- | ---------- |
| Default (hidden)   | 0%      | -          |
| Hover on content   | 12%     | 0.15s in   |
| Hover on scrollbar | 22%     | -          |
| Dragging           | 32%     | -          |
| Mouse leaves       | -> 0%   | 0.4s out   |

**Scroll Detection Hook** (for showing scrollbar during active scroll):

```tsx
import { useRef, useEffect, useState } from 'react';

function useScrolling<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleScroll = () => {
      setIsScrolling(true);
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setIsScrolling(false), 1000);
    };

    element.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      element.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutRef.current);
    };
  }, []);

  return { ref, isScrolling };
}

// Usage
function MyScrollableList() {
  const { ref, isScrolling } = useScrolling<HTMLDivElement>();

  return (
    <div ref={ref} className={`overflow-y-auto scrollable ${isScrolling ? 'is-scrolling' : ''}`}>
      {/* content */}
    </div>
  );
}
```

---

## Toast Notifications

Implement a toast notification system for user feedback:

### Basic Usage

```tsx
import { useToast } from '../hooks/useToast';

function MyComponent() {
  const { toast } = useToast();

  const handleAction = async () => {
    try {
      await someAsyncOperation();
      toast.success('Operation completed!');
    } catch (error) {
      toast.error('Something went wrong');
    }
  };

  // Info toast for neutral messages
  toast.info('Processing...');
}
```

### Toast Types

| Type                     | Usage                      | Visual       |
| ------------------------ | -------------------------- | ------------ |
| `toast.success(message)` | Confirm successful actions | Green accent |
| `toast.error(message)`   | Report failures            | Red accent   |
| `toast.info(message)`    | Neutral information        | Muted accent |

### Design Principles

- Semi-transparent background (glassmorphism)
- Subtle border and shadow
- Pill-shaped or rounded
- Auto-dismiss after 3 seconds (configurable)
- Stack multiple toasts vertically

### Custom Duration

```tsx
// Custom duration (5 seconds)
toast.success('Saved!', 5000);

// Shorter duration (1.5 seconds)
toast.info('Copied', 1500);
```

---

## Drag and Drop (Tree Structures)

When implementing drag-and-drop for tree structures, use a library like `@dnd-kit`.

### Library Choice

Use **@dnd-kit** instead of `react-beautiful-dnd` (deprecated) because:

- Active maintenance and modern React support
- Official tree example for nested structures
- Better TypeScript support
- Modular architecture

### Architecture

```
components/dnd/
├── index.ts              # Public exports
├── tree-dnd-utils.ts     # Tree flattening & validation utilities
├── SortableTree.tsx      # DndContext wrapper component
├── SortableTreeItem.tsx  # Individual draggable tree item
└── TreeItemOverlay.tsx   # Drag preview overlay
```

### Key Concepts

#### 1. Tree Flattening

dnd-kit's `SortableContext` works best with flat lists. Flatten the tree while preserving hierarchy via `ancestorIds`:

```tsx
interface FlattenedTreeItem {
  node: TreeNode;
  depth: number;
  ancestorIds: string[]; // For circular reference prevention
  parentId: string | null;
  index: number;
}
```

#### 2. Drop Position Detection

For folders, divide the element into three zones:

- Top 20%: Drop "before" (as sibling above)
- Middle 60%: Drop "inside" (as child)
- Bottom 20%: Drop "after" (as sibling below)

For items (non-containers), it's simply top/bottom 50%.

#### 3. Validation Rules

- Cannot drop on itself
- Cannot drop into own descendants (circular reference)
- Cannot drop inside non-container items
- Cannot drag non-moveable items (system items)

### Basic Usage

```tsx
import { SortableTree } from './components/dnd';

<SortableTree
  nodes={treeNodes}
  expandedIds={expandedIds}
  onToggle={handleToggle}
  onNodeClick={handleNodeClick}
  onMoveNode={async (nodeId, nodeType, newParentId, newParentPath) => {
    // Call API to update parent
    await api.updateNode({ nodeId, parentId: newParentId });
  }}
  rootPath="/root"
  rootEntityId={rootId}
/>;
```

---

## Focus Management

### Focus Ring

Use consistent focus styles:

```css
/* Consistent focus ring */
.focus-ring:focus-visible {
  outline: 2px solid hsl(var(--color-primary));
  outline-offset: 2px;
}

/* Remove default focus for mouse users */
.focus-ring:focus:not(:focus-visible) {
  outline: none;
}
```

### Focus Trapping

For modals and dialogs, trap focus within the container:

```tsx
import { useRef, useEffect } from 'react';

function useFocusTrap<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    element.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    return () => element.removeEventListener('keydown', handleKeyDown);
  }, []);

  return ref;
}
```

---

## Loading States

### Skeleton Loading

```tsx
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-muted rounded ${className}`} />;
}

// Usage
function ListSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-3/4" />
    </div>
  );
}
```

### Loading Button

```tsx
function Button({ isLoading, children, ...props }: ButtonProps) {
  return (
    <button disabled={isLoading} {...props}>
      {isLoading ? (
        <span className="inline-flex items-center gap-2">
          <Spinner className="h-4 w-4" />
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
}
```

---

## Quick Reference

| Pattern                    | When to Use                 |
| -------------------------- | --------------------------- |
| `role="button"` + tabIndex | Nested interactive elements |
| `-mt-24` offset            | Empty state centering       |
| `scrollbar-gutter: stable` | Prevent layout shift        |
| Auto-hide scrollbar        | Any scrollable container    |
| Toast notifications        | User feedback               |
| Focus trap                 | Modals/dialogs              |
| Skeleton loading           | Initial data fetch          |

---

**Language**: All documentation must be written in **English**.
