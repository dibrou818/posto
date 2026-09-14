---
name: posto-conventions
description: Project-specific conventions and a feature-completeness checklist for Posto (the Next.js/Supabase local-discovery app in this repo, built for Lille bars/activities/events). Consult this whenever building, editing, or reviewing anything in this codebase — a new UI component, a dashboard form, a new field or entity, a popover, a button next to another button. It does NOT replace ui-ux-pro-max (general design taste) or security-review (security audits) — those still apply on top of this. This is the accumulated, codebase-specific layer: what "done" actually means for a Posto feature, and small visual rules this project has already established through real corrections. Apply it proactively even when the user's prompt doesn't ask for a review — especially before declaring a new feature finished.
---

# Posto conventions

Grounded in real corrections made across this project's build — not general design theory (see `ui-ux-pro-max` for that) and not security (see `security-review`). This is what "matches the rest of Posto" actually means in this specific codebase.

## 1. Before calling a feature done: would it ship in production?

This is the one that matters most. It's easy to satisfy the literal prompt ("add X") while leaving X only half-usable — then the next prompt has to be "okay now add the missing half." That's a real pattern that happened repeatedly on this project: the account-settings email/password forms first shipped always-expanded with no "Modifier" toggle; the password-change flow first shipped with no "current password" field; `updatePlace` first shipped without cleaning up the old cover/gallery photo in Storage. Each of these was a correct implementation of the literal ask, and each needed a follow-up prompt because it wasn't actually a complete feature.

Before considering a new feature/field/entity finished, check:
- **Can it be viewed, edited, and removed/undone**, not just created? A field with no way to change or clear it, a row with no delete path, isn't finished.
- **Is there real feedback after the action** — a confirmation message, an updated view — not a silent success the user has to guess worked?
- **Does it clean up its own side effects?** A photo/file upload that gets replaced or removed should delete the old Storage object (see `storagePathFromPublicUrl` in `actions.ts` — reuse it, don't re-derive it). A row that owns child rows should either cascade correctly or be cleaned up explicitly.
- **Does the entry point match how the rest of the app discloses forms?** Don't render a form pre-expanded with live validation before the user asked to edit anything (see §5 below) — check what an equivalent existing flow does before inventing a new shape.

If any of these would need a follow-up prompt to fix, they're not optional polish — they're part of finishing the task the first time.

## 2. Don't default every section to a bordered box

Posto's dashboard forms use `DashboardSection` (`rounded-xl border border-gray-200 bg-white p-4`) a lot, and it's easy to reach for it — or a plain card — for every new block regardless of whether it needs the visual weight. It's better to build groups with spacing/headings/proximity than to stack identical white boxes.

A box (border + fill + shadow) is justified when it's actually doing work:
- **Danger/warning emphasis** — the red "Zone de danger" pattern (`DeletePlaceSection`/`DeleteAccountSection`) is a correct use: it needs to visually stand apart.
- **A real repeated, interactive object** — `PlaceCard`/`EventCard` in a grid are genuinely separate tappable things; a card treatment is earned there.
- **A functionally independent unit** — each `DashboardSection` on a settings/edit page is its own `<form>` that saves on its own, so the border does carry real meaning ("this saves separately from what's below it"), not just decoration. That's a legitimate reason to keep it — the point isn't "never use a box," it's to not give every block the *same* weight by default when they don't all deserve it.

When adding a new section, ask whether it needs to visually compete with what's around it, or whether a heading + spacing already reads as its own group.

## 3. Nested rounded corners: match, don't guess

When a rounded element sits inside another rounded container with even padding on all sides, the visually "correct" outer radius is `inner_radius + gap` — that's not a style preference, it's the only value that makes both corners share the same center of curvature. Only holds when the padding is equal on both edges meeting at that corner (asymmetric padding breaks it).

Apply this when two rounded surfaces are visibly nested with consistent padding — not as a blanket rule to chase on every element with a radius, including standalone ones with nothing nested inside them.

Real example already in this codebase: `EventCard`/`PlaceCard` have a `rounded-xl` (12px) card containing a `rounded-lg` (8px) photo, with `p-3` (12px) padding between them. The concentric-correct outer radius is 8 + 12 = 20px — the current 12px is a bit tight. Worth fixing when you're touching that component anyway; not worth a standalone pass just for this.

**A circular button positioned via offset is the same principle, but not the same formula** — don't reuse "outer = inner's own radius" for it, that's a different shape. `BackButton` (`rounded-full`, 36px → 18px radius) sits `absolute top-3 left-3` (12px) over the hero photo's corner on the place/event pages. The button's own circle center is at `(offset + radius, offset + radius)` from the box's true corner — same additive logic as the nested-card case above, just with the button's *radius*, not its diameter or the offset alone. So the exact match here is `offset + button_radius` = 12 + 18 = **30px**, not 18px and not a guess at "somewhere between the two". This one was gotten wrong once already (settled on 16px by matching the box's radius directly to the button's radius, forgetting the 12px offset needs to be added in) — worth double-checking the arithmetic explicitly rather than eyeballing "closer" when a circle-on-offset case like this comes up again. Current value on both place/event hero photos: `rounded-[30px]` (not on Tailwind's standard scale, which tops out at `rounded-3xl`=24px — used as an arbitrary value on purpose since an approximation was the actual mistake being corrected).

Tailwind's scale doesn't hit every exact value (`rounded-lg`=8px, `rounded-xl`=12px, `rounded-2xl`=16px, `rounded-3xl`=24px) — round to the nearest class on the scale rather than reaching for `rounded-[20px]`, unless the gap between the nearest class and the exact value is large enough to actually read as mismatched.

## 4. Popovers and transient UI must be `z-50`

Posto's persistent chrome is `Header` (`z-40`) and `BottomNav` (`z-30`). Anything transient — a dropdown, tooltip, filter panel, popover — needs `z-50`, not just "a z-index higher than the content near it." An element can be fully inside the viewport and still end up visually hidden behind the header or bottom nav if its own z-index isn't above both. This has already been the actual root cause of a reported "overflow" bug on this project once — see the z-index comments on `QrCodeSection`, `SearchBar`, and `MapFilterButton` for the same reasoning applied three times.

## 5. Compound-field pattern for anything easier entered as parts than as one string

When a stored value is conceptually one thing but easier for a person to enter as 2-3 structured pieces (a couple of native `<select>`s or inputs) than as free text, build a small client component: it renders the structured controls, plus one `<input type="hidden">` carrying the combined/normalized value under the original field name — so the server action needs zero changes. Established examples already in this codebase: `DurationField`, `DateTimeField`, `RecurrenceField`, `PriceField`, `PhoneField`. If you're about to add a free-text field for something that's really "a number + a unit" or "a frequency + a day" or similar, check whether this pattern fits before reaching for a plain `TextField`.

The same instinct applies to *disclosure*, not just structure: a settings-style form (change email, change password) should default to collapsed (current value + a "Modifier" toggle), not sit pre-expanded with live validation visible before anyone asked to change anything — see `ChangeEmailSection`/`ChangePasswordSection` for the shape to match.

## 6. Measure, don't guess, when sizing a button next to another button

If you're adding an icon-only button next to an existing button (or any two controls that need to read as the same family), measure the existing one's real rendered height — `getBoundingClientRect()`/`offsetHeight` in the browser preview — before picking a Tailwind size class. "Looks about the same size" isn't good enough: `buttonClass()`'s default button renders at 36px tall from its padding + line-height, which doesn't line up with any single obvious `h-*` class by eye. There's a standing memory note on this (`button-sizing-consistency.md`) from exactly this mistake on the dashboard's own gear button.

## 7. Check for an existing pattern before writing a new one

This project has a small but growing library of conventions worth reusing rather than re-deriving:
- Type-to-confirm destructive actions → `DeletePlaceSection`/`DeleteAccountSection`'s shape (expand → type an exact phrase → button only enables on exact match).
- Storage cleanup on replace/delete → `storagePathFromPublicUrl` in `actions.ts`.
- A titled, independently-saving form block → `DashboardSection`.
- Mobile vs. desktop branching → `useIsMobileViewport` in `lib/viewport.ts` (don't redefine the breakpoint query locally again).

Before writing something that feels like it might already exist, grep for it.
