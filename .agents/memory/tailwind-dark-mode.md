---
name: Tailwind v4 dark mode
description: Forcing dark mode in Tailwind v4 — @apply dark is invalid
---

In Tailwind v4, `dark` is a variant selector, not a utility class. `@apply dark;` throws `Cannot apply unknown utility class 'dark'`.

**Rule:** Never use `@apply dark;` in any `@layer base` block.

**Why:** Tailwind v4 changed how variants work — they can only be used as prefixes (e.g. `dark:bg-slate-900`), not applied standalone.

**How to apply:** Force dark mode by adding the class in JavaScript:
```ts
document.documentElement.classList.add("dark");
```
Call this in `main.tsx` before rendering the React tree.

The custom variant declaration `@custom-variant dark (&:is(.dark *));` in index.css is still correct and needed for `dark:` prefixed utilities.
