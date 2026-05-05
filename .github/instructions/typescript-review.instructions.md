---
name: "TypeScript Review Standards"
description: "Use when reviewing, editing, or generating TypeScript and TSX files. Enforces stricter standards for correctness, maintainability, strong typing, and avoiding any in .ts and .tsx code."
applyTo:
  - "**/*.ts"
  - "**/*.tsx"
---

# TypeScript Review Standards

- Prioritize correctness, maintainability, and type safety over style-only feedback.
- Avoid `any`. If a boundary cannot be typed precisely, prefer `unknown` plus narrowing or runtime validation.
- Avoid broad type assertions and double casts such as `as unknown as T`. Fix the type mismatch at the source when possible.
- Avoid non-null assertions unless the invariant is local, obvious, and cannot be expressed through control flow.
- Prefer precise domain types, discriminated unions, generics, and shared utility types over duplicated loose object shapes.
- Keep public APIs and component props explicit. Do not hide required behavior behind optional fields without a clear default path.
- When data crosses trust boundaries, validate and narrow it before use.
- In Vendure server code, prefer Vendure domain types such as `ID`, `RequestContext`, `PaginatedList`, generated GraphQL types, and entity types over ad hoc `string | number | object` placeholders.
- In dashboard React code, keep component props, loader results, mutation results, and UI state explicitly typed. Do not rely on implicit `any` through destructuring, callbacks, or event handlers.
- Reuse generated GraphQL document and result types instead of re-declaring partial response shapes unless there is a deliberate view model boundary.
- Keep entity, service, resolver, and dashboard-layer types aligned. Flag mappings that silently drop nullable cases, currency precision, channel scope, or relation loading assumptions.
- Prefer small typed helper functions for normalization and formatting over inline object reshaping that obscures nullability or domain invariants.
- Flag code that weakens type guarantees, couples unrelated concerns, or makes future changes harder to reason about.
- When suggesting fixes, prefer the smallest change that improves safety without changing intended behavior.
- For reviews, report findings first, ordered by severity, with concrete fix direction and file references.