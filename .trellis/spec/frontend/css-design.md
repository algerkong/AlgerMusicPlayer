> **OBSOLETE (Trellis React scaffold).** This file does **not** describe LYMusicPlayer.
> Use `directory-structure.md`, `component-guidelines.md`, `hook-guidelines.md`,
> `state-management.md`, `type-safety.md`, and `quality-guidelines.md` instead.

# CSS & Design System

> CSS modularization and design tokens.

---

## CSS Organization

### Entry Point

`src/renderer/src/styles/index.css` is the single CSS entrypoint imported by the renderer bootstrap.

**Folder structure**:

```
src/renderer/src/styles/
├── index.css            # Entry point (imports in a stable order)
├── tokens.css           # :root tokens + .dark overrides
├── base.css             # html/body/typography/focus/scrollbars
├── components/          # Component-scoped classes
│   ├── sidebar.css
│   ├── tabbar.css
│   └── ...
├── layout/              # Shell-level layout helpers
└── pages/               # Page-specific styling
```

**Rules**:

- Keep `index.css` import order stable to avoid cascade regressions
- When adding new styles, put them in the closest domain file (components/layout/pages)
- If a file grows beyond ~300-500 lines, split it

### Index.css Structure

```css
/* src/renderer/src/styles/index.css */

/* 1. Design tokens first */
@import './tokens.css';

/* 2. Base styles (reset, typography) */
@import './base.css';

/* 3. Layout helpers */
@import './layout/shell.css';

/* 4. Component styles */
@import './components/sidebar.css';
@import './components/tabbar.css';
@import './components/dialog.css';

/* 5. Page-specific styles */
@import './pages/home.css';
@import './pages/settings.css';
```

---

## Design Tokens

### CSS Custom Properties

Define design tokens as CSS custom properties in `:root`:

```css
/* src/renderer/src/styles/tokens.css */
:root {
  /* Colors */
  --color-background: 0 0% 100%; /* HSL format for Tailwind */
  --color-foreground: 20 14% 4%;
  --color-primary: 24 10% 10%;
  --color-primary-foreground: 60 9% 98%;
  --color-muted: 60 5% 96%;
  --color-muted-foreground: 25 5% 45%;
  --color-border: 20 6% 90%;
  --color-destructive: 0 84% 60%;

  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;

  /* Border radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);

  /* Typography */
  --font-sans: system-ui, -apple-system, sans-serif;
  --font-mono: ui-monospace, monospace;

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-normal: 200ms ease;
  --transition-slow: 300ms ease;
}

/* Dark mode overrides */
.dark {
  --color-background: 20 14% 4%;
  --color-foreground: 60 9% 98%;
  --color-primary: 60 9% 98%;
  --color-primary-foreground: 24 10% 10%;
  --color-muted: 12 6% 15%;
  --color-muted-foreground: 24 5% 64%;
  --color-border: 12 6% 15%;
}
```

### Using Tokens with Tailwind

```css
/* tailwind.config.js */
module.exports = {
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--color-background))",
        foreground: "hsl(var(--color-foreground))",
        primary: {
          DEFAULT: "hsl(var(--color-primary))",
          foreground: "hsl(var(--color-primary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--color-muted))",
          foreground: "hsl(var(--color-muted-foreground))",
        },
        border: "hsl(var(--color-border))",
        destructive: "hsl(var(--color-destructive))",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
      },
    },
  },
};
```

---

## CSS Class Naming Convention (BEM)

Use **BEM naming convention** to prevent class name conflicts:

### BEM Structure

```
.block                    /* Independent component */
.block__element           /* Internal element */
.block__element--modifier /* Element variant */
```

### Naming Rules

| Type               | Format              | Example                           |
| ------------------ | ------------------- | --------------------------------- |
| Block (container)  | `component-name`    | `.sidebar-dropdown`               |
| Element (child)    | `block__element`    | `.sidebar-dropdown__menu`         |
| Modifier (variant) | `element--modifier` | `.sidebar-dropdown__item--danger` |

### Example

```css
/* Good: BEM clearly distinguishes elements */
.sidebar-dropdown {
} /* Block: entire dropdown component */
.sidebar-dropdown__menu {
} /* Element: menu container */
.sidebar-dropdown__item {
} /* Element: menu item */
.sidebar-dropdown__item--danger {
} /* Modifier: danger variant */

/* Bad: easy to confuse */
.sidebar-dropdown-menu {
} /* Is this a container or a menu item? */
.sidebar-dropdown-item {
}
.sidebar-dropdown-item--danger {
}
```

### Guidelines

1. **Block naming**: Use kebab-case, describe component function (e.g., `entity-menu`, `doc-tree`)
2. **Element naming**: Double underscore `__`, describe child role (e.g., `__header`, `__item`, `__icon`)
3. **Modifier naming**: Double hyphen `--`, describe state or variant (e.g., `--active`, `--disabled`, `--danger`)
4. **Avoid deep nesting**: Maximum one level of element, don't write `.block__element__subelement`

### When to Use BEM vs Tailwind

| Scenario                          | Recommended              |
| --------------------------------- | ------------------------ |
| Simple components, one-off styles | Tailwind utility classes |
| Complex components, reusable      | BEM + CSS file           |
| Dynamic state toggling in JS      | BEM modifier classes     |
| Component library (shadcn/ui)     | Use built-in variants    |

---

## Portal Components

Components using `createPortal` to render to `document.body` need special handling:

```css
.sidebar-dropdown__menu--portal {
  position: fixed;
  z-index: 9999;
}
```

---

## Base Styles

### Typography

```css
/* src/renderer/src/styles/base.css */
html {
  font-family: var(--font-sans);
  font-size: 16px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

body {
  background-color: hsl(var(--color-background));
  color: hsl(var(--color-foreground));
}

h1,
h2,
h3,
h4,
h5,
h6 {
  font-weight: 600;
  line-height: 1.25;
}

h1 {
  font-size: 2rem;
}
h2 {
  font-size: 1.5rem;
}
h3 {
  font-size: 1.25rem;
}
h4 {
  font-size: 1rem;
}
```

### Focus States

```css
/* Consistent focus ring */
:focus-visible {
  outline: 2px solid hsl(var(--color-primary));
  outline-offset: 2px;
}

/* Remove default focus for mouse users */
:focus:not(:focus-visible) {
  outline: none;
}
```

### Scrollbars (Notion-style)

```css
/* Hide scrollbars by default, show on hover */
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: hsl(var(--color-foreground) / 0);
  border-radius: 5px;
  transition: background 0.4s ease;
}

/* Show on container hover */
.scrollable:hover::-webkit-scrollbar-thumb {
  background: hsl(var(--color-foreground) / 0.12);
  transition: background 0.15s ease;
}

/* Darker on scrollbar hover */
.scrollable::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--color-foreground) / 0.22);
}

/* Even darker when dragging */
.scrollable::-webkit-scrollbar-thumb:active {
  background: hsl(var(--color-foreground) / 0.32);
}
```

---

## Component Styles Example

```css
/* src/renderer/src/styles/components/sidebar.css */

/* Block */
.sidebar {
  width: var(--sidebar-width, 240px);
  height: 100%;
  background: hsl(var(--color-background));
  border-right: 1px solid hsl(var(--color-border));
  display: flex;
  flex-direction: column;
}

/* Elements */
.sidebar__header {
  padding: var(--spacing-md);
  border-bottom: 1px solid hsl(var(--color-border));
}

.sidebar__content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-sm);
}

.sidebar__footer {
  padding: var(--spacing-md);
  border-top: 1px solid hsl(var(--color-border));
}

/* Item element */
.sidebar__item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast);
}

/* Modifiers */
.sidebar__item:hover {
  background: hsl(var(--color-muted));
}

.sidebar__item--active {
  background: hsl(var(--color-muted));
  font-weight: 500;
}

.sidebar__item--disabled {
  opacity: 0.5;
  pointer-events: none;
}
```

---

## Quick Reference

| Question                       | Answer                                    |
| ------------------------------ | ----------------------------------------- |
| Where to define colors?        | `tokens.css` as CSS custom properties     |
| Where to put component styles? | `styles/components/{name}.css`            |
| How to name CSS classes?       | BEM: `.block__element--modifier`          |
| When to use Tailwind vs BEM?   | Simple = Tailwind, Complex/Reusable = BEM |
| How to support dark mode?      | Override tokens in `.dark` class          |

---

**Language**: All documentation must be written in **English**.
