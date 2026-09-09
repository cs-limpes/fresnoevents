# Category Taxonomy Decision

## Status

This decision applies to the existing Phase 3 public category filtering behavior and the normalized event model that supports it.

## Problem

The original normalized model assigned each event exactly one `primaryCategory`, and the public category filter compared the selected category only with that value. That made legitimate cross-category events undiscoverable from secondary categories. A market with live music and food, for example, could appear under only one of those browsing intents.

## Decision

Events may belong to multiple categories.

The normalized taxonomy now supports:

```ts
taxonomy: {
  primaryCategory: EventCategory
  categories?: EventCategory[]
  tags: string[]
  audience: EventAudience[]
  priceType: EventPriceType
}
```

`primaryCategory` remains authoritative for the event's primary visual/category treatment. `categories` is the discovery taxonomy used by category filtering and search.

The field is optional at the TypeScript boundary so older fixtures or cached/legacy normalized data that contain only `primaryCategory` remain usable. When `categories` is absent or empty, browsing falls back to `[primaryCategory]`.

## Editorial metadata

The existing Google Calendar metadata key remains `category` for backward compatibility.

A single category continues to work:

```text
category: music
```

Multiple explicit categories use the parser's existing comma-separated list convention:

```text
category: markets, food-drink, music, community
```

The first valid explicit category becomes `primaryCategory`; all valid explicit categories are retained in order in `categories`.

Legacy descriptive category values such as `Youth Teen Program` continue through the existing heuristic normalizer and produce one normalized category.

Unknown explicit values are ignored when at least one recognized explicit category is present. If no explicit category can be recognized, the legacy heuristic fallback is used; if that also finds no match, the event normalizes to `other`.

## Category vocabulary

This change deliberately retains the existing category vocabulary:

- Art
- Music
- Food & Drink
- Markets
- Festivals
- Family
- Community
- Classes & Workshops
- Nightlife
- Outdoors
- Sports
- Wellness
- Spiritual
- Theater & Film
- Other

The structural filtering defect can be corrected without forcing a simultaneous editorial migration. A later inventory review may rename, merge, split, or add categories based on actual Fresno event coverage.

## Filtering behavior

Selecting a category matches an event when that category occurs anywhere in its normalized category list. Filter options are built from all categories represented in the loaded event data, not only primary categories.

Keyword search also includes every normalized category.

Other facets remain unchanged and continue to combine with category filtering using AND semantics.

## Visual behavior

Cards and event details continue to use `primaryCategory` for their single displayed category treatment. This avoids turning a discovery fix into an unrelated visual redesign.

## Deferred work

This decision does not:

- change the category vocabulary based on an exhaustive live-calendar inventory;
- automatically infer multiple categories from event prose;
- alter tags into categories;
- change category artwork;
- add multi-select category controls;
- change city, neighborhood, audience, price, date, or calendar-view behavior.

Those require separate evidence or product decisions.
