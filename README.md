# Fresno Events

A planned mobile-first event discovery website for Fresno and nearby Central Valley communities.

The repository is currently in its documentation and architecture stage.

Start with:

- `AGENTS.md`
- `docs/product.specification.md`
- `docs/technical-architecture.md`
- `docs/event-data-model.md`
- `docs/design-system.md`
- `docs/development-phases.md`

Application development should not begin until the documentation review described in Phase 0 is complete.

## Local Phase 1 setup

1. Copy `.dev.vars.example` to `.dev.vars`.
2. Set `GOOGLE_CALENDAR_ID`, `GOOGLE_CALENDAR_API_KEY`, and `FRESNO_EVENTS_CONTACT_EMAIL` in `.dev.vars`.
3. Keep `.dev.vars` local. It is intentionally ignored by git.

Useful commands:

- `npm run test`
- `npm run typecheck`
- `npm run build`
- `npm run dev`
