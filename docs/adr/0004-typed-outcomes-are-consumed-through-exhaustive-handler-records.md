# 4. Typed outcomes are consumed through exhaustive handler records

Date: 2026-07-24

## Status

Accepted. Ratified during the silent-alpha verification session, first
implemented for the price-fetch surface (`ZecPriceOutcome`,
`matchZecPriceOutcome`).

## Context

ADR 0002 makes failures discriminated unions instead of prose; this ADR
governs how those unions are consumed. A union alone does not force a
consumer to consider every arm: an `if`/`else if` chain silently ignores
the arms it never names, and a `switch` is exhaustive only while someone
maintains a `never`-typed `default` — a discipline, not a construction.
Both shapes met their failure mode in this codebase: the send path's
legacy classifier collapsed genuinely different failures into one bucket
(ADR 0002's context), and the price surface flattened four distinct
failure producers into one sentinel number and one string, which cost
diagnostic information exactly when the silent alpha flavors needed it.

## Decision

A discriminated union whose arms demand different consumer behavior is
consumed through an exhaustive handler record: a mapped type requiring
exactly one handler per discriminant, each receiving its narrowed arm
(`ZecPriceOutcomeHandlers` is the template), dispatched by a single
generic `match` function published beside the union. Adding an arm to
the union then fails compilation at every consumer, naming the missing
handler, until each consumer decides what the new arm means for it.
Removing or misspelling an arm fails the same way. There is no
`default` to forget and no fallthrough to misorder.

The `match` function contains the pattern's one assertion — TypeScript
cannot yet correlate a union-keyed record access with its argument — and
that assertion is confined there, documented, and safe by construction:
the discriminant selects exactly the handler declared for it. Consumers
never repeat it.

`switch` with a `never` default remains acceptable inside pure
transforms that fold a union into a value in one place; the handler
record is required where the union crosses a module boundary to
consumers that render, route, or otherwise act on the arms.

## Consequences

New outcome arms propagate as compile errors to every consumer, which is
the point: the person adding the arm is forced to visit each rendering
decision rather than inherit a silent bucket. The cost is one generic
helper and one confined assertion per union, and slightly more ceremony
than a `switch` for single-consumer unions — which is why pure local
folds are exempted. The pattern needs no dependencies and no runtime
machinery beyond a record lookup.
