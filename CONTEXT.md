# Context

A glossary of the language this project uses. Terms are added as they
are resolved; each entry says what the term means here, not how it is
implemented.

## Bridge

The Rust FFI layer (`rust/lib`) that exposes wallet operations to the
Android and iOS platform code through UniFFI. The bridge is distinct
from zingolib (the wallet library it wraps) and from the platform
modules (the Kotlin and Swift code that consume it).

## In-band error

A failure signaled inside the success payload's content — for example,
a returned string beginning with the prefix `Error:`. An in-band error
can only be detected by inspecting the value, so every consumer must
sniff content, and valid data that resembles the sentinel is
misclassified. The project is eliminating this pattern (issue #1151;
audit Issues Q and R).

## Sniff

A check that classifies a value by inspecting its content — for
example, testing whether a returned string begins with `error` — rather
than by its type or channel. A sniff is probabilistic: data that
happens to resemble the sentinel is misclassified. Contrast with
structural classification.

## Structural classification

Classifying a value by whether it satisfies the format its type
promises — for example, whether a string is valid base64 — rather than
by matching a sentinel inside it. Deterministic where the formats are
disjoint: wallet-export base64 can never contain a colon or space, so
failure prose can never be mistaken for it.

## Attack string

A vuln-reproducing input used in a red-to-green test: a value that is
legitimate data yet matches a sniff's sentinel — for example, a valid
base64 wallet export that begins with `error`.

## Out-of-band (typed) error

A failure carried on a channel separate from the data: a thrown FFI
exception, a rejected promise, a typed `Err`. Whether a call succeeded
is knowable from the type or channel of its result at every layer,
never from its content. This is the goal state of the typed-error
migration.

## Pin

The git reference in `rust/Cargo.toml` that fixes which zingolib
revision the bridge builds against. "The pin bump" refers to advancing
that reference past a given upstream change; a bump can cross unrelated
upstream work, each piece with its own migration surface.

## ServerInfo

The connected lightwalletd server's diagnostics (version, vendor,
chain name, heights, and related fields), as reported by its
`get_lightd_info` RPC. Upstream zingolib returns it as typed data; the
bridge will expose it as a typed record rather than rendered JSON.
