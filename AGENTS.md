# Fresno Events: Codex Operating Rules

## Project purpose

Fresno Events is a public, mobile-first local event discovery website for Fresno and the surrounding area. Google Calendar is the initial editorial source of truth. The public site should make events easy to browse, search, filter, understand, and share while maintaining a coherent visual identity.

Before changing code, read these files in order:

1. `docs/product.specification.md`
2. `docs/technical-architecture.md`
3. `docs/event-data-model.md`
4. `docs/design-system.md`
5. `docs/development-phases.md`

## Core rule

Knowledge of the full product does not authorize implementation of the full product.

Only implement the phase and task explicitly authorized in the current prompt. Later phases exist to provide architectural context and prevent short-sighted decisions. They are not permission to build ahead.

## Mandatory behavior before editing

Before changing any file:

1. Inspect the repository and relevant documentation.
2. State the current authorized phase.
3. Summarize what already exists.
4. List the exact files you intend to create or modify.
5. Identify any ambiguity that would materially affect the requested work.
6. Confirm which future features will remain untouched.

Do not begin implementation until that inspection is complete.

## Scope boundaries

Do not:

- Implement future-phase features because they appear easy or logically related.
- Add placeholder systems, routes, services, dependencies, schemas, or abstractions for future features unless explicitly requested.
- Install libraries for anticipated future use.
- Create fake functionality that looks operational.
- Change architecture outside the current task.
- Rewrite working code merely to match personal preference.
- introduce authentication, databases, analytics, payment systems, sponsorship tooling, submission workflows, or external services unless the current phase authorizes them.
- expose secrets, API keys, calendar identifiers, or service credentials in client code.
- silently change product requirements.
- infer that completing one phase authorizes beginning the next.
- delete user-authored copy, design assets, or documentation without explicit authorization.
- claim a feature works without testing it.

When a requested feature conflicts with the specifications, stop and explain the conflict rather than resolving it silently.

## Implementation principles

Prefer the simplest implementation that satisfies the current phase and remains compatible with the documented architecture.

Use:

- TypeScript for application code.
- React with Vite for the front end.
- Cloudflare Workers with Static Assets for deployment.
- Plain CSS or CSS modules unless another styling system is explicitly approved.
- Semantic HTML.
- Accessible controls.
- Mobile-first layouts.
- Small, focused components.
- Explicit data types.
- Predictable error and empty states.

Avoid unnecessary dependencies and abstractions.

## Product behavior priorities

When decisions are not fully specified, prioritize:

1. Correctness of dates, times, and event data.
2. Mobile usability.
3. Readability and accessibility.
4. Clear event discovery.
5. Visual consistency.
6. Performance.
7. Editorial maintainability.
8. Implementation convenience.

## Date and timezone rules

The canonical display timezone is `America/Los_Angeles`.

Do not use the runtime machine timezone as a product default.

All date-range logic, including Today, This Weekend, Upcoming, all-day events, and recurring events, must be tested against the canonical timezone.

## Source-of-truth rules

Google Calendar is the initial editorial source of truth for published events.

The public site may normalize, categorize, cache, and present event data, but it must not invent event facts.

If data is missing:

- use documented fallbacks,
- omit the field,
- or display a clear neutral label.

Do not fabricate prices, categories, locations, images, descriptions, or organizer information.

## Visual rules

The site is an editorial event-discovery experience, not a reskinned scheduling tool.

Do not let inconsistent event flyers determine the visual structure of browsing pages.

Use category-based art and consistent card layouts as the default. Event flyers may appear selectively or on event detail views when available and appropriate.

## Testing and completion report

At the end of every task, provide:

- the authorized scope completed,
- every file created or modified,
- commands run,
- tests performed,
- results of those tests,
- known limitations,
- deliberate deferrals,
- any decisions that still require human approval.

Stop after the authorized task is complete.

## Git discipline

Keep changes focused.

Do not combine unrelated cleanup with requested work.

Use clear commit messages.

When possible, make one logical commit per authorized task.

Do not merge or deploy unless explicitly instructed.
