# Agent instructions: documentation

## The one-sentence documentation rule (ratified 2026-08-10)

Every item doc-comment — Rust `///`, and the KDoc or doc-comment on a
Kotlin or Swift item — is exactly one sentence. That sentence must not
reference ADRs, issues, or any other document. Module headers (Rust
`//!`, a file- or class-level header block) are exempt, and test
doc-comments that follow a ratified convention (for example HYPOTHESIS
falsifiers) keep that convention's shape. Apply the rule to every
unmerged doc-comment before merge.
