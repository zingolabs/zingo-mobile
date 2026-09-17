---
status: accepted
---

# Error channels carry ErrorKeys, never prose

The Least Authority audit (Issue R) traced a latent bug to error signaling through string content:
`parseServerURI` returned either a canonical URI or a translated error message in the same `string`,
and callers recovered the distinction by sniffing for an "Error" prefix that only held because every
translation catalog happened to keep the English word "Error" at the front. A translator localizing
that prefix would have silently broken server validation, and in a non-English locale the app could
have adopted a translated sentence as its server address.

We decided that an error crossing a module boundary travels as an `ErrorKey`, a string-literal union
of translation-catalog keys carried in a discriminated union, never as translated prose. `translate()`
is called only at the display edge, in the component about to render the text. Core modules
(`app/uris/`, `app/walletBackend/`) neither accept nor call `translate`, and ESLint enforces that
zone. Operation outcomes are discriminated unions with domain-named success tags and a shared
`'error'` failure tag; the shared pieces (`ErrorKeyed<K>`, `Done`) live in
`app/AppState/types/Result.ts`. This also removes in-band success/failure conventions such as
empty-string-means-success (`WalletLifecycleService`) and the `GlobalConst.error` prefix sentinel,
which is deleted outright.

## Considered Options

- Translated prose with a guaranteed prefix: rejected, the invariant lives in translator-maintained
  data that no compiler or test enforces.
- Throwing typed errors: rejected for these paths, invalid user input and expected operational
  failures are ordinary control flow, and result unions keep them on the ordinary path with
  exhaustiveness checking.
- A uniform `'success'` tag everywhere: rejected in favor of domain-named success tags
  (`'canonicalUri'`, `'paymentTarget'`, `'done'`), the success side of each union is a different
  domain concept and the tag should say what the caller is holding. The failure side is one concept
  everywhere, so it keeps the single `'error'` tag.

## Consequences

- Error-key unions must stay in sync with the translation catalogs; a key present in the union but
  missing from a catalog renders as the raw key.
- Composite error messages assembled in core (as `parseZcashURI` did) are gone; each failure carries
  one key plus an optional `param`, and the display edge renders it.
- Pure parsers no longer depend on the active locale, so their tests need no translate stub.
