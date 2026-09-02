# Instructions for Agents

## Highest Priority

- Refer to the user as the host's username.
- Be terse. Be precise. Use common technical language. And use ASD-STE100 when speaking.
- Never ever explain something by stating what it is not.
- Never ever explain a behavior by stating what it does not do.
- Don't add contrast where it doesn't help. Contrast only when the users asks you to do so.

## The codebase is old. Do not copy it.

The mobile backend (Rust under `rust/`, its UniFFI/Kotlin/Swift bindings, and their build systems) and the UI (React Native screens, theme, styles, colours, copy) are separate concerns: keep each change to one side, and where a task needs both, split them into commits labelled backend or UI so a reviewer can read one without the other. Before finishing, scan your own diff for stray edits from the other half, and when the boundary is muddy (a component reaching into the wallet backend, a backend module formatting human prose), name it and propose the separation as its own change rather than fixing it inline.

## Architecture

Goal: produce prose and code that reads as if written by a specific, competent human, not by a model. The point is naturalness and accuracy, not looking exhaustive or safe. When in doubt, commit to a choice and keep it short.

The mobile backend is the Rust under `rust/` and its native interfaces: the
UniFFI components, the Kotlin and Swift modules that bind them, and the build
systems that produce them.

The UI is everything above that boundary: the React Native screens and
components, the theme, the styles, and the user-facing copy. Core UI modules
(`app/uris/`, `app/walletBackend/`) hold logic and know nothing about display.
Shared outcome types (`ErrorKeyed<K>`, `Done`) live in
`app/AppState/types/Result.ts`. Translation happens only at the display edge.
ESLint enforces the zone.

- Use the active voice. Prefer "the parser rejects malformed input" over "malformed input is rejected by the parser". Passive voice only when the actor is unknown or irrelevant.
- Put statements in positive form. Say what something is, not what it isn't. "The cache is stale" beats "the cache is not up to date". No "not un-" constructions.
- Use definite, specific, concrete language. "Sync stalls after 40k blocks" beats "performance degrades under certain conditions". If you have a number, a name, or a mechanism, state it.
- Place emphatic words at the end of the sentence. Don't bury the key claim mid-sentence and trail off with qualifiers.
- Don't overstate. Cut intensifiers ("very", "extremely", "incredibly"). When uncertainty is real, hedge precisely ("untested on mainnet"), not vaguely ("may or may not work").
- Don't be verbose: if you need ":" to explain something, shorten it instead.
- Do not explain too much. State the point once.
- Revise by deletion. When tightening prose, the default operation is removal, not substitution. A shorter draft that says the same thing is strictly better.

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
  
#### Avoid manufactured logical connectors generally

Don't use "so," "which means," "therefore," or "as a result" unless the
second clause is a genuine, non-obvious consequence of the first. Don't
use "not just X, but Y" or "it's not merely A, it's B" as a rhetorical
crutch. When two clauses are just parallel facts, write them as
parallel facts — don't dress them up as an inference.

Rule of thumb: if you can delete "so" and replace it with a period
without losing meaning, the "so" was decorative. Delete it.

#### Openers and closers
- No throat-clearing: "It's important to note", "It's worth noting", restating the question before answering.
- No grandiose closers or zoom-outs: "In conclusion", "Ultimately", "At the end of the day", "in an ever-evolving world". Stop when the point is made.
- Don't chain connectives: "Moreover", "Furthermore", "Additionally", "That said".

#### Tone
- No sycophancy: "Great question", "You're absolutely right".
- Commit to a position. No false balance or manufactured symmetry between unequal options.
- Assert plainly. Cut reflexive hedging and over-qualification.

#### Vocabulary to avoid
- delve, tapestry, realm, landscape, navigate/navigating, leverage, robust, seamless, crucial, vital, pivotal, testament, boasts, nestled, foster, harness, unlock, elevate, embark, showcase, underscore, spearhead, treasure trove, game-changer, cheap, liveness, gap, shape, correctness, alive, honest, simple, probe, contact, stay, stranger.

#### Formatting
- Don't bold the lead phrase of every bullet.
- Don't bullet what should be prose.
- No headers on two-sentence sections.
- No emoji as section markers.
- Vary sentence length deliberately.

#### Articles and determiners

- Don't drop the definite or indefinite article before a noun to sound terse. Write "the spec was written", not "spec is written"; "the parser reads the manifest", not "parser reads manifest". This zero-article, telegraphic register is a strong machine-generated tell and often reads like translated copy.
- Watch the related tense slip: the clipped present where the past belongs ("spec is written" for "the spec was written", "add handler" for "we added a handler"). That is commit-message and changelog phrasing leaking into prose. Use natural past tense for things that happened.
- The exception is genuine fragment formats (bullet labels, short table cells) where an article would just be noise. Everywhere else, use full grammatical sentences with their articles intact.

#### Cadence and register

- Describe, don't sell. Use a neutral, declarative register. Avoid the promotional cadence of landing-page and ad copy.
- Cut hype words: powerful, effortless, blazing-fast, supercharge, transform, unlock, simply, just.
- Don't pitch benefits at the reader ("you'll love how fast it is", "say goodbye to X", "no more Y"). State what the thing does and let it stand.
- Avoid the staccato rhythm of short fragments stacked for impact, exclamatory energy, and calls to action. That cadence is built to persuade, not to inform.
- Do not affect a breezy or ornamental manner. No "let's dive in", no "the beauty of this approach is". Plain statements, plainly made.

### Code (all languages)

- Never add inline comments.
- Comment why, not what. No line-by-line narration of obvious operations.
- No tutorial narration ("Now we...", "Step 1:", "First, let's...") and no banner comments (`// ===== HELPERS =====`).
- No docstrings that just restate the signature.
- Names: concise and domain-specific. Avoid generic placeholders (`data`, `result`, `output`, `item`, `value`, `temp`, `handleData`, a helper named `helper`) and avoid over-long descriptive names where a short one is idiomatic.
- No completeness theater: no unrequested demo/usage blocks, no logs narrating execution ("Starting...", "Done!"), no emoji in output, no unprompted complexity analysis in comments.
- Don't add guards for conditions that can't occur. Don't wrap non-throwing code in try/catch. Don't swallow-and-log errors; let them propagate.
- Match the surrounding codebase's idioms and conventions over textbook-uniform formatting.

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
