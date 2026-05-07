---
applyTo: "**/*.tsx"
---

# Vendure UI:

UI Components are imported from "@vendure/dashboard".

## Vendure Dashboard Stack

- The `@vendure/dashboard` UI layer is a forked/curated stack built on shadcn-style components and Base UI primitives.
- When implementing or reviewing TSX UI, use `.github/instructions/shadcn-ui.instructions.md` and `.github/instructions/base-ui.instructions.md` as reference guidance for component patterns and behavior.

## When to Use Built-in vs. Custom Components

**Built-in `@vendure/dashboard` components** — Use when:
- The component exists in `@vendure/dashboard` and fits your use case
- You need consistency with existing dashboard UI
- The component is already styled and tested
- Examples: Button, Card, Dialog, Combobox, Table, Input, Badge, etc.

**Custom component with Base UI + Tailwind** — Use when:
- `@vendure/dashboard` doesn't have a pre-built component
- You need a specialized or domain-specific UI element
- The built-in component can't be extended to meet your needs

⚠️ **If you're unsure whether to extend an existing component or build a custom one, ask before proceeding.** This helps maintain consistency and avoids duplicating components.

## TanStack Guidance

- For table, sorting, filtering, pagination, and related TanStack patterns, use `.github/skills/tanstack-expert/SKILL.md`.