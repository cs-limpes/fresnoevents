# Fresno Events Design System

## 1. Design objective

Fresno Events should feel like a polished local editorial guide with strong calendar functionality.

It should not resemble:

- a raw Google Calendar embed
- municipal software
- a generic SaaS dashboard
- a chaotic digital bulletin board
- a wall of unrelated event flyers

The design should balance energy, local personality, readability, and trust.

## 2. Design status

The visual identity is not yet final.

The functional data foundation phase should keep styling plain and usable. A later reader-facing visual foundation phase may establish provisional tokens and component structure, but final logo, palette, typography, illustration style, and brand voice require human approval.

Codex must not treat provisional choices as permanent brand decisions.

Current provisional direction:

- use `Fresno Events` in a bold serif font as a temporary wordmark until a proper logo is designed
- use the supplied palette as the starting palette, with Elden Ring `#F28705` as the initial primary/accent color
- use one default category artwork system for all categories at first, designed to be replaced later
- keep colors, wordmark/logo treatment, graphics, and category artwork centralized and easy to change

## 3. Core design principles

### Editorial consistency

Browsing pages should use consistent cards, spacing, typography, and category visuals.

### Mobile first

Design narrow screens first, then enhance for larger screens.

### Clear hierarchy

At a glance, users should understand:

- what the event is
- when it happens
- where it happens
- what kind of event it is
- whether it is free or restricted

### Controlled variety

Categories may have distinct visual treatments, but all category art should belong to one coherent system.

### Calm around noisy source material

Original flyers may be visually inconsistent. Use them selectively.

### Accessibility

Contrast, focus, labels, reading order, and touch size are part of the design, not later polish.

### Reader usability

The interface should favor ease of use and understandability over decorative complexity. Users should be able to scan dates, times, locations, event type, and key caveats without learning the site first.

## 4. Page frame

Proposed structural regions:

- site header
- primary navigation
- hero or introductory region
- search and date shortcuts
- featured content
- category browsing
- event lists
- newsletter or promotional region
- footer

Each phase should implement only the page regions authorized by `development-phases.md`.

## 5. Header

The eventual header may include:

- logo or wordmark
- Events
- Calendar
- This Weekend
- Submit an Event
- search access
- mobile menu

Before navigation is functional, nonfunctional navigation or controls should be concealed from users rather than presented as working UI.

## 6. Event card anatomy

Recommended order:

1. visual area
2. category label
3. event title
4. date and time
5. venue
6. city or neighborhood
7. price or audience indicator when useful

Cards should use a consistent image ratio.

Potential ratios:

- 4:3 for editorial cards
- 16:9 for featured cards

Final ratio should be chosen based on real layouts.

## 7. Category visual system

Each primary category should receive:

- an icon or motif
- a controlled pattern or illustration
- a category art key
- a label

Category differences must not rely on color alone.

Proposed motifs:

- Art: brush, abstract shape, gallery frame
- Music: waveform, speaker, note, stage light
- Food & Drink: plate, glass, citrus, utensils
- Markets: stall, tote, sunshade, produce
- Festivals: banner, confetti, pennant
- Family: playful geometric forms
- Community: gathering or linked shapes
- Classes & Workshops: tools, hands, notebook
- Nightlife: moon, neon geometry, spotlight
- Outdoors: foothills, sun, leaf, trail
- Sports: motion lines, court or field markings
- Wellness: flowing line, breath, water
- Spiritual: stars, candle, botanical motif
- Theater & Film: curtain, frame, marquee
- Other: flexible neutral pattern

Icons should be decorative only when the text label already communicates the category.

Initial implementation may use one shared default artwork treatment for all categories. Category-specific artwork should wait until the visual system is ready for focused design work.

## 8. Event imagery rules

Use original imagery when:

- it is high enough quality
- crop behavior is acceptable
- rights and source are appropriate
- it improves the card
- the placement is featured or editorially selected

Use category art when:

- no image exists
- the flyer is too text-heavy
- the image is low resolution
- the composition does not crop safely
- using it would create visual chaos

Do not stretch or distort flyers.

Do not use flyer text as the only accessible event information.

## 9. Typography

Final fonts are undecided.

The temporary wordmark should use a bold serif treatment for `Fresno Events`. It must be implemented as a replaceable design element, not as a final logo decision.

Provisional requirements:

- highly readable body face
- distinctive but legible display face
- good numeral clarity
- clear differentiation between headings and metadata
- robust fallback stack
- no dependence on a paid font during prototyping unless approved

Suggested type roles:

- Display
- Heading
- Body
- Metadata
- Button or label

Avoid excessive font families and weights.

## 10. Color

Final palette is undecided.

Starting palette:

```css
--palette-milky-aquamarine: #037F8C;
--palette-dead-sea: #79DCF2;
--palette-midas-gold: #F2B705;
--palette-elden-ring: #F28705;
--palette-momo-peach: #F27979;
```

Use Elden Ring `#F28705` as the initial primary/accent color.

Provisional palette must include semantic roles rather than arbitrary color names:

```css
--color-background
--color-surface
--color-surface-raised
--color-text
--color-text-muted
--color-border
--color-accent
--color-accent-contrast
--color-focus
--color-success
--color-warning
--color-error
```

Category colors, if used, should be separate from semantic system colors.

Every critical state must have a non-color indicator.

Implementation should map palette values into semantic tokens. Component styles should reference semantic tokens wherever possible so future palette changes do not require broad component rewrites.

## 11. Spacing

Use a consistent spacing scale.

Example provisional scale:

```css
--space-1: 0.25rem;
--space-2: 0.5rem;
--space-3: 0.75rem;
--space-4: 1rem;
--space-5: 1.5rem;
--space-6: 2rem;
--space-7: 3rem;
--space-8: 4rem;
```

Codex may use a comparable scale but should document deviations.

## 12. Radius and shadows

Use restrained radius and elevation.

The design should not become a collection of unrelated floating pills.

Recommended roles:

- small radius for tags
- medium radius for controls
- larger radius for cards or featured panels
- subtle shadow only where elevation communicates structure

## 13. Buttons and links

Buttons need:

- clear label
- hover state
- focus state
- active state where relevant
- disabled state when truly unavailable
- adequate touch target

Do not use disabled-looking controls as decoration.

Links should look interactive without relying only on color.

## 14. Filter controls

Future filter UI should support:

- obvious current state
- individual removal
- clear-all action
- mobile-friendly opening and closing
- keyboard navigation
- visible result count when useful
- URL persistence

Do not implement functional filters before the phase that explicitly authorizes public filtering.

## 15. Search

Search should feel prominent but not dominate every screen.

Requirements when implemented:

- explicit label
- helpful placeholder
- clear button or automatic behavior defined in advance
- keyboard accessibility
- empty query behavior
- clear action
- no fake search field in production

## 16. Empty, loading, and error states

### Loading

Use restrained progress feedback.

Avoid layout jumps.

### No events

Explain whether:

- no events exist in the date range
- filters removed all results
- search returned no matches

Provide a useful next action.

### Error

Explain that events could not be loaded without exposing technical details.

Allow retry when appropriate.

## 17. Responsive breakpoints

Use content-driven breakpoints rather than device-brand targets.

Minimum visual checks:

- 320px
- 375px
- 768px
- 1024px
- 1440px

No horizontal page scrolling at 320px.

Cards and controls must remain readable at 200% zoom.

## 18. Accessibility details

- visible focus ring
- logical tab order
- minimum comfortable touch targets
- semantic lists for event collections
- headings in logical hierarchy
- icons with appropriate labels or hidden semantics
- motion reduced under `prefers-reduced-motion`
- dates available in screen-reader-friendly text
- contrast checked for text and controls
- no hover-only information

## 19. Public copy and sample content

Reader-facing views should use real approved event data once live data integration is authorized.

Avoid lorem ipsum.

If sample copy is ever used for documentation, tests, or offline development, it must be clearly labeled as sample content and must not be presented as real current events.

## 20. Design approval boundaries

Codex may:

- implement documented provisional tokens
- create reusable card and layout structure
- build shared default category-art placeholders
- ensure responsive behavior

Codex may not:

- declare the brand identity final
- invent a permanent logo
- purchase or add paid fonts
- select final category taxonomy
- redesign product scope
- add promotional or sponsor styling ahead of its phase
