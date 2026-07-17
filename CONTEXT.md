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

## Ironwood

The NU6.3 network upgrade of the Zcash chain. Ironwood carries its own
consensus branch ID, but it is not a new blockchain: the chain remains
Zcash, and "ironwood-activated" describes that same chain once the
upgrade's activation height has passed. The upgrade introduces the
Ironwood pool.

## Ironwood pool

The newest shielded value pool, introduced by the Ironwood network
upgrade (NU6.3). Once the upgrade activates, funds sent to a unified
address settle in the Ironwood pool rather than Orchard, and change
from shielded spends returns there. Balances and value transfers
report per pool, so anything that assumes shielded funds live in
Orchard is stale wherever Ironwood is active.

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

## Structural contract

The stronger form of structural classification: the boundary's type
makes invalid values unrepresentable, so nothing remains to classify.
Where a structural classifier validates a value after it crosses, a
structural contract prevents the questionable value from existing at
all — the wallet export crosses as bytes or as an absent value, and no
string exists to resemble anything. The save path adopted this contract
in the change known as R5.

## Attack string

A vuln-reproducing input used in a red-to-green test: a value that is
legitimate data yet matches a sniff's sentinel. The canonical example
was a valid base64 wallet export beginning with `error`; the save
path's structural contract has since made that string unrepresentable,
and the tests that once pinned its correct classification now pin the
contract that retired it.

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
