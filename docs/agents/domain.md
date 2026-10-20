# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root.
- **`docs/adr/zingo-mobile/`** — read ADRs that touch the area you're about to work in.

`docs/adr/` is a submodule of zingo-adrs. The [zingo-adrs README](https://github.com/zingolabs/zingo-adrs#pointing-a-code-repository-at-zingo-adrs) explains how to initialise it and how its scopes map onto `docs/adr/`.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The producer skill (`/grill-with-docs`) creates glossary terms lazily when they actually get resolved.

## File structure

```
/
├── CONTEXT.md
├── docs/adr/            (submodule: zingolabs/zingo-adrs)
│   ├── 001-some-org-decision.md
│   ├── zingo-mobile/
│   │   ├── 0001-some-decision.md
│   │   └── 0002-another-decision.md
│   └── zingolib/
└── app/
```

## Proposing a record

Records are never proposed in this repository. The [zingo-adrs README](https://github.com/zingolabs/zingo-adrs#proposing-a-record) explains how, and a zingo-mobile record goes in the `zingo-mobile/` scope there.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/grill-with-docs`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (the biometric gate is a privacy shutter) — but worth reopening because…_
