---
name: "Repository Workflow Orchestration"
description: "Use when planning or executing multi-step work in this repository, including feature implementation, bug fixing, UX-first discovery, TS/TSX changes, validation, and review handoff. Triggers: workflow, plan, implementation steps, handoff, execution checklist, done criteria."
---

# Repository Workflow Orchestration

Use this workflow for non-trivial tasks so work is predictable, reviewable, and complete.

## Agent Selection

- Use **SE: UX Designer** first when requirements are unclear, user journey is part of scope, or dashboard behavior needs flow decisions.
- Use **Expert React Frontend Engineer** for TSX/dashboard implementation and React architecture decisions.
- Use **Code Reviewer** before final delivery for correctness, maintainability, type safety, and regression risk checks.

## Execution Stages

1. **Scope and constraints**
- Restate objective, inputs, out-of-scope items, and acceptance criteria.
- Identify touched areas (plugin, dashboard, resolver, service, migration, tests).

2. **Plan before edits**
- Create a short ordered plan with explicit verification steps.
- Prefer smallest safe change set over broad refactors.

3. **Implement**
- Follow Vendure patterns and existing repository conventions.
- Keep types strict; avoid introducing `any` and avoid broad type assertions.
- Preserve behavior unless task explicitly requires behavior change.

4. **Validate**
- Run targeted checks first (typecheck, tests for changed area, lint when relevant).
- If full suite is expensive, run nearest-scope checks and note residual risk.

5. **Review handoff**
- Invoke review mindset (or Code Reviewer agent) and list findings ordered by severity.
- Fix high-severity findings before final response when feasible.

6. **Delivery**
- Summarize what changed, why, and what was validated.
- Include remaining risks, assumptions, and clear next steps only when useful.

## Definition of Done

- Acceptance criteria are met.
- Relevant validation has been executed or limitations are explicitly stated.
- No new type-safety regressions in modified TS/TSX code.
- Final response reports concrete file-level outcomes.

## Do Not

- Do not skip validation after code edits unless blocked.
- Do not mix unrelated refactors into task-focused changes.
- Do not claim completion when tests/checks were not run.