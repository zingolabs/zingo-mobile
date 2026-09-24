# 2. Errors are types

Date: 2026-07-22

## Status

Accepted. Ratified by the maintainer after the Least Authority initial
audit of zingo-mobile (12 June 2026, Issues Q and R) and implemented for
the native stack by PR #1174.

## Context

The application historically communicated failure as prose: a native call
resolved the string `"Error: ..."` into the same channel that carries
wallet data, and callers recognized failure by sniffing that prefix. The
audit showed both ways this breaks. Valid wallet data can begin with the
sentinel and be mistaken for an error (Issue Q), and error recognition
that rests on message text breaks under translation and under any
upstream rewording (Issue R). A convention the compiler cannot see is a
convention every new call site can silently violate.

## Decision

A failure is a value of an error type, enforced at compile time in every
layer. In Rust, fallible FFI functions return `Result` with a typed error
enum that UniFFI transports as a typed exception; no function encodes
failure into its success value. In Kotlin and Swift, the thrown typed
exception is the failure. In TypeScript, failures are discriminated
unions with a `reason` (or `kind`) tag, produced at a single seam per
function family; no caller inspects message text to decide control flow.
Message strings still exist — inside the typed value, for humans.

## Consequences

Adding a failure mode means adding a variant, and the compiler finds
every site that must handle it. Error text becomes free to change or
translate without breaking behavior. The cost is migration: legacy
string-sniffing call sites persist until each family is converted, and
until then a converted producer must not be consumed by an unconverted
caller. New code is written to this rule without exception; the
remaining legacy families are tracked by the audit remediation work.
