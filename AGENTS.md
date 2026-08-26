# Instructions for Agents

## Highest Priority

- Refer to the user as the host's username.
- Be terse. Be precise. Use common technical language. And use ASD-STE100 when speaking.
- Never ever explain something by stating what it is not.
- Never ever explain a behavior by stating what it does not do.
- Don't add contrast where it doesn't help. Contrast only when the users asks you to do so.

## The codebase is old. Do not copy it.

Most of zingo-mobile predates the rules in this file. Expect `any`, `null`,
`useEffect` computing derived state, in-band error strings, prop drilling,
class-era React, and Rust that clones and unwraps where a borrow or `?`
belongs. None of that is a convention to follow. It is debt.

Write new code in the current idioms of the language and framework as they
stand today, not as the file next to it does. When a task touches old code,
leave the touched lines better than you found them: shrink the null count,
tighten a type, replace the legacy pattern you had to read. Do not reformat or
rewrite code the task does not touch. Keep the diff scoped, and never let "the
surrounding code does it this way" justify writing it that way again.

If a task exposes a pattern that should be replaced across the codebase, say
so and propose it as its own change with a cost estimate.

Before finishing, check what you wrote against this file. Antithesis flips
and narrating comments in prose. `.clone()`, `.unwrap()`, and trailing
`return` in Rust. `useEffect` for derived state, `any`, and `null` in TS.

## Architecture

Two halves, one boundary.

The mobile backend is the Rust under `rust/` and its native interfaces: the
UniFFI components, the Kotlin and Swift modules that bind them, and the build
systems that produce them.

The UI is everything above that boundary: the React Native screens and
components, the theme, the styles, and the user-facing copy. Core UI modules
(`app/uris/`, `app/walletBackend/`) hold logic and know nothing about display.
Shared outcome types (`ErrorKeyed<K>`, `Done`) live in
`app/AppState/types/Result.ts`. Translation happens only at the display edge.
ESLint enforces the zone.

When working on a task that requires changes in both halves, make separate commits and say which is which.
Confirm with the user if they want to commit

## Code

### All languages

- In comments, never narrate.
- In comments, never include justifications or logical connectors.
- In functions, explain what the function does in one sentence, if possible.
- No tutorial narration ("Now we...", "Step 1:") and no banner comments
  (`// ===== HELPERS =====`).
- If a workaround needs a paragraph of justification, the code is wrong. Fix
  the code.
- Names are short and domain-specific. No `data`, `result`, `output`, `item`,
  `value`, `temp`, `handleData`, or a helper named `helper`. No over-long
  descriptive names where a short one is idiomatic.
- No completeness theater: no unrequested demo or usage blocks, no logs
  narrating execution, no emoji in output, no unprompted complexity analysis.
- No guards for conditions that cannot occur. No try/catch around code that
  does not throw. Do not swallow-and-log errors. Let them propagate.
- Never leave an error unhandled.
- When writing tests, don't ever enumerate facts, or make a list of things something does. Use the following form:
  "Tests that <behavior> happens when <condition>. <Clarifications>".

### Documentation in code

Every item doc-comment (Rust `///`, KDoc, Swift doc-comment) is one sentence
and references no ADR, issue, or other document. Module headers (Rust `//!`,
file- or class-level blocks) are NOT exempt.

### Rust

- Borrow or restructure before reaching for `.clone()`.
- Use `?` for propagation. No `.unwrap()` or `.expect()` outside tests.
- Tail expressions. No explicit `return` on the final line.
- Do not annotate types the compiler infers.
- Prefer `if let` and combinators (`map`, `and_then`, `ok_or`,
  `unwrap_or_else`) over verbose `match` when clearer.
- Prefer iterator chains over manual `for` + `push`.
- Take `&str` where a borrow suffices.

### TypeScript / React

- No `any`. Do not annotate what TS infers. No `as` to silence the checker.
- Union and literal types over enums. Named exports.
- No `React.FC`. Type props directly.
- `useMemo` and `useCallback` only for a real identity or performance need.
- Derive state during render. No `useEffect` to compute it.
- No `console.log`.
- Do not over-componentize trivial markup. Do not prop-drill where
  composition or context fits.
- No `null` in new or touched code. Model absence and outcomes as
  discriminated unions with domain-named success tags and a shared `'error'`
  tag: `{ kind: 'canonicalUri'; uri } | ErrorKeyed<'uris.baduri'>`.
- Never signal errors in-band through string content. An error channel
  carries an `ErrorKey` (a string-literal union of catalog keys), never
  translated prose.
- Call `translate()` only in the component about to render the text.

### HTML / CSS

- Semantic elements. No div soup.
- Class lists stay purposeful. No utilities that do nothing.

### Shell

- No heredocs. Use a real file or `printf` with explicit lines.

## Prose

Applies to comments, commit messages, pull request descriptions, and reports.
Write as a specific, competent human. Commit to a choice and keep it short.
Commits should avoid descriptions. They should follow conventional commits terminology.

### Economy

- Omit needless words. "in order to" → "to", "due to the fact that" →
  "because", "has the ability to" → "can". Delete "essentially",
  "basically", "fundamentally".
- Active voice. Positive form. Specific, concrete language: "sync stalls after
  40k blocks", not "performance degrades under certain conditions".
- One paragraph, one topic. Emphatic words at the end of the sentence.
- No intensifiers. Hedge precisely ("untested on mainnet") or not at all.
- State the point once. Revise by deletion.

### Punctuation and constructions

- No em dashes. No semicolons. Split the sentence.
- No antithesis flips: "not X, but Y", "isn't just X, it's Y", "not only X
  but also Y".
- No default groups of three. No "from X to Y" sweeps. No "whether you're X
  or Y" wrap-ups. No forced analogies.
- No decorative connectors. "So", "therefore", "which means" only when the
  second clause is a real, non-obvious consequence of the first.
- No throat-clearing ("it's worth noting"), no grandiose closers ("in
  conclusion", "at the end of the day"), no chained connectives ("moreover",
  "furthermore", "that said").
- No sycophancy. No false balance.
- Keep articles and past tense. "The spec was written", not "spec is
  written". Telegraphic prose reads machine-generated.
- Describe, don't sell. No hype (powerful, effortless, blazing-fast,
  supercharge, transform, simply, just), no benefit pitches, no stacked
  fragments for impact, no "let's dive in".

### Banned vocabulary

so, delve, tapestry, realm, landscape, navigate, navigating, leverage, robust,
seamless, crucial, vital, pivotal, testament, boasts, nestled, foster,
harness, unlock, elevate, embark, showcase, underscore, spearhead, treasure
trove, game-changer, cheap, liveness, gap, shape, correctness, alive, honest,
simple, probe, contact, stay, stranger, ratified, verdict, witness, claim, assert, ride.

### Formatting

- Do not bold the lead phrase of every bullet.
- Do not bullet what should be prose.
- No headers on two-sentence sections. No emoji as section markers.
- Vary sentence length.
