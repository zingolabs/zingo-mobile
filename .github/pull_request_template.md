## What and why

<!-- One or two lines: what changes for the user or the code, and why. -->

## Checklist

- [ ] Tests or stories cover the change.
- [ ] New strings are in the five catalogs (en, es, pt, ru, tr).

UI changes (skip if this PR touches no screen or component):

- [ ] Built from `app/theme` and the shared primitives and widgets
      (`DESIGN.md`, "Components"); no `fontSize`, radius, colour or icon size
      by hand.
- [ ] A new token, variant, component or exception was approved by the
      designer, and `DESIGN.md` changes in this PR (CI fails when `app/theme`
      values change without it).
- [ ] Visual review checked; `/visual-accept` only after reading the report.
