# 3. Errors and data flow in separate channels

Date: 2026-07-22

## Status

Accepted. Ratified by the maintainer after the Least Authority initial
audit of zingo-mobile (12 June 2026, Issues Q and R) and implemented for
the native stack by PR #1174's `FfiOutcome`.

## Context

Even with typed errors (ADR 0002), a boundary can still mix its channels:
a bridge method that catches a typed exception and *resolves* its message
into the success channel has re-encoded the failure as data, and every
consumer downstream must sniff again. The React Native bridge offers two
channels — promise resolution and promise rejection — and the Rust FFI
offers two — return value and thrown exception. Mixing them at any hop
destroys the guarantee end to end.

## Decision

The success channel carries only data, and the error channel carries only
failures, at every hop of the stack. A Rust `Ok` crosses the FFI as a
return value and a Rust `Err` as a typed exception; the Kotlin and Swift
bridges settle the two outcomes through `FfiOutcome` — resolve the value
verbatim, reject the exception under the call's name — and never convert
one channel into the other; TypeScript receives failure only as a
rejection and contains it at one seam per function, converting it to a
typed failure arm. Nothing is ever appended to, prefixed onto, or
inferred from the data payload to signal failure, and payload validation
(malformed JSON, an unrecognized enum value) is classified as its own
failure reason — not conflated with transported errors.

## Consequences

The channel is the contract: a consumer that receives a resolution may
parse it as data unconditionally, and tests can pin channel purity — a
leaked error-prose string in the data channel is a malformed payload, not
a failure signal. Diagnostic prose leaves the wire, which also serves the
audit's log-hygiene findings, since failure payloads carry structured
reasons rather than free text that tempts logging of sensitive context.
The cost is that both bridge implementations must stay symmetrical per
function; the shared settlement seam (`FfiOutcome`) exists precisely so
that symmetry is one code path, not a per-method discipline.
