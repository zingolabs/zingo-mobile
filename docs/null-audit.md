# Null audit of the TypeScript codebase

Audited 2026-07-24 on branch `no_more_nulls`. This document catalogues every
literal `null` in the TypeScript sources (excluding `node_modules`), assesses
whether each one's meaning is unambiguous, and ranks the sites that could hide
a misinterpretation bug. It is ordered as a remediation backlog: verified
high-risk findings first, ambiguous-but-latent findings second, and the
idiomatic majority last as compact inventories.

**Coverage.** `rg` finds 421 textual `null` occurrences on 352 lines across 80
files. Every line is accounted for below. Nulls that express one semantic
decision (for example the type annotation and initializer in
`useState<T | null>(null)`) are collapsed into a single entry listing all of
their lines. Five parallel auditors read each null in the context of its whole
enclosing function; every HIGH finding was then independently re-verified
against the source by the orchestrating session.

**Risk scale.** HIGH means a concrete misinterpretation-failure path exists in
the immediate context. MEDIUM means the null's meaning is ambiguous (it
conflates two or more states, or null and undefined are interchangeable) but no
concrete failure was found. LOW means the null is idiomatic and unambiguous.

## Taxonomy

The nulls fall into nine natural categories. One is codebase-specific and did
not exist in any standard vocabulary: the **arg-skip sentinel**, where `null`
passed positionally means "leave this field unchanged" while `''` means "clear
it". It dominates `Send.tsx`.

| Category | What null means | Sites | Risk profile |
|---|---|---|---|
| third-party (React refs, library contracts) | Component not mounted yet, or a documented library value | ~45 | Uniformly LOW |
| state-init (`useState`/`useRef`/class field) | Not yet available / nothing selected / no timer pending | ~40 | Mostly LOW; 3 MEDIUM |
| type-union (`T \| null` annotations and props) | Not yet fetched, distinct from empty | ~30 | Mostly LOW |
| guard (`=== null`, `!== null`, `== null`, truthiness) | Dispatch on the null state | ~25 | 2 HIGH, 3 MEDIUM |
| arg-skip sentinel (NEW; `updateToField`) | Skip this positional field | 17 call sites + signature | 3 MEDIUM |
| render-guard (`return null` / ternary JSX) | Render nothing | ~20 | Uniformly LOW |
| reset (`setX(null)`, `ref.current = null`) | Return to the empty/disarmed state | ~20 | Uniformly LOW |
| boundary (JSON/FFI/storage crossings) | Backend absent / failed / omitted — often conflated | ~15 | 2 HIGH, 5 MEDIUM |
| test-mock | Stand-in for a production null | 8 | Uniformly LOW (all verified faithful) |

## HIGH: verified misinterpretation bugs

These four survived independent re-verification. Each has a concrete failure
path; two have narrow triggers, noted honestly.

### 1. `fetchWallet` returns null for three failure kinds, and the recovery-info caller silently swallows it

`app/walletBackend/utils/walletUtils.ts:645,649,664,668,683,699,703,718` —
`fetchWallet` collapses backend-error-string, empty native response, and thrown
exception into one `return null`. At `app/LoadedApp/LoadedApp.tsx:1910-1913`,
enabling the `recoveryWalletInfoOnDevice` setting does:

```ts
const wallet = await fetchWallet(this.state.readOnly);
if (wallet) {
  await createUpdateRecoveryWalletInfo(wallet);
}
```

The toggle state is written as enabled at line 1903 *before* the fetch. On any
null, the store step is silently skipped: the user sees recovery-on-device
enabled, no backup material was stored, and no error surfaces. They discover
the missing backup when they need it. A second sharp edge inside the function:
on parse success with missing fields it returns `{}` cast to `WalletType`
(lines 672, 707), which passes the caller's `if (wallet)` truthiness while
carrying no seed.

**Fix direction:** make `fetchWallet` return a discriminated result (or throw),
and make the caller surface failure and revert the toggle.

### 2. Latency truthiness reads a 0 ms measurement as "server down"

`app/LoadingApp/LoadingApp.tsx:1099` and `1387` seed probes with
`latency: null`, and `app/selectingServer.ts:9,33` correctly resolves only on a
successful probe using strict `latency !== null`. But all three consumers
re-read the *resolved* number with truthiness:

- `LoadingApp.tsx:1017` — `if (server && server.latency)`
- `LoadingApp.tsx:1103` — `if (serverChecked && serverChecked.latency)`
- `LoadingApp.tsx:1391` — `if (!serverChecked || !serverChecked.latency)`

`calculateLatency` is `Date.now()` minus `Date.now()`; two timestamps in the
same millisecond yield `0`, which these guards read as the null "probe failed"
state. Line 1391 is the custom-server modal — exactly the flow where a
developer adds a localhost/LAN regtest server — so a healthy server is rejected
with `changeservernew-error`. Line 1103 (`checkServer`) reports a working
server dead and drives needless server-switch recovery. Narrow trigger
(sub-millisecond round trip), but the falsy-zero conflation is the textbook
misinterpretation this audit hunts, and the strict-null discipline that
`selectingServer.ts` gets right is undone one level up.

**Fix direction:** `latency !== null` at all three sites, or clamp measured
latency to a minimum of 1.

### 3. Receive's address-index guards treat `!== null` as "an address exists", but empty is encoded as index 0

`components/Receive/Receive.tsx:106,107` — `uAddrIndex`/`tAddrIndex` are
`number | null`, null meaning "addresses effect has not run". The populating
effect at lines 276-277 writes `length > 0 ? length - 1 : 0`, so an **empty**
filtered list is encoded as index `0`, not null. Six sites then use the null
check alone as an existence proof
(`Receive.tsx:377,379` in `doCopy`; `618,620` in the NAT sheet; `651,653` in
the EA sheet):

```ts
index === 1 && tAddrIndex !== null ? tAddr[tAddrIndex].address : ''
```

With `tAddr = []` and `tAddrIndex = 0`, `tAddr[0]` is undefined and `.address`
throws. The correct pattern exists 15 lines below at `Receive.tsx:392,404`,
where `currentAddress` pairs the null check with `uAddr.length > 0` — the six
sites simply dropped the second conjunct. Reachability today is narrow: the
TransparentWarning route to transparent scope is dead code (`show('TW')` is
never called; see Observations), and the live scope picker is gated on
`tAddr.length > 0` — so the crash needs an `addresses` refresh that empties the
external-transparent list while transparent scope is active. That is plausible
across a rescan or server change, and the guard's meaning is wrong regardless.

**Fix direction:** encode "empty" as null in the effect (or add the length
conjunct at all six sites), matching `currentAddress`.

### 4. `VerifyAddress` renders a definitive "not your address" verdict when the boundary silently failed

`components/Receive/components/VerifyAddress.tsx:45` — `verifyOK` is
`boolean | null`, null meaning "not yet verified". Line 63 stores
`verifyAddressJSON.is_wallet_address` straight off `JSON.parse` of the native
response with no field validation. The render gate at line 136 is strict:

```ts
{verifyOK !== null && ( verifyOK ? <check/> : <not-yours/> )}
```

A well-formed native response lacking (or renaming) `is_wallet_address` stores
`undefined`, which passes `!== null` and falls into the falsy branch — the user
is told the address is **not** theirs when the check never produced a verdict.
The trigger is schema drift on the native side, which is a live concern while
the app rides a forked zingolib. An address-verification screen showing a
confident false negative is the worst place for this class of bug.

**Fix direction:** validate the parsed field is a boolean before `setVerifyOK`,
otherwise surface an error state distinct from both true and false.

## MEDIUM: ambiguous nulls, no concrete failure found

| # | Location | The ambiguity | Why it matters |
|---|---|---|---|
| 5 | `components/Send/Send.tsx:627-631` + 17 call sites (see arg-skip inventory) | Five unlabeled positional slots where `null` = skip and `''` = clear; `Send.tsx:1617,1618` differ only in which slot holds `''` | Transposing any two arguments silently clears the wrong form field, and TypeScript cannot object since every slot accepts `string \| null` |
| 6 | `components/Send/Send.tsx:509,511,512,513` | The amount written into the form comes from `JSON.parse` of the native `sendPropose` response, guarded only by `!== undefined` (`RPCSendProposeType.fee/amount` are bare optionals) | A native `"amount": null` would pass the guard and write a garbage amount string into the form |
| 7 | `components/Send/Send.tsx:1960-1975` | In the memo field's `onChangeText`, the amount slot interleaves the skip sentinel (`null`) with a business value (`'0'`) in one conditional | Hardest-to-read null in the file; correct today only because `'0'` is a truthy string |
| 8 | `app/LoadingApp/LoadingApp.tsx:207` + `components/Settings/SettingsFileImpl.ts:52,260` | `version: null` means fresh install, but `readSettings`' catch-all (line 260) also returns it for a corrupt/unreadable settings.json | A user with corrupted settings sees the fresh-install flow and silently reverts to default server/currency/security settings |
| 9 | `app/AppState/classes/SettingsFileClass.ts:20,23` | Documented tri-state `null` (fresh) / `''` (legacy file) / string (version), two of which are falsy | Only strict comparison keeps the states apart; sole consumer is strict today, any future truthiness check merges them. Constructor is typed plain `string`, so null enters only via deserialization, bypassing the declared type |
| 10 | `app/AppState/types/NetInfoType.ts:4,6` | Library tri-state (`null` = undetermined, `false` = offline), but every consumer (`useShieldFunds.ts:170`, `StartMenu.tsx:90,320,467`, `LoadingApp.tsx:624,628,774`, `LoadedAppOptionsPanelHost.tsx:129`) uses truthiness | During the boot window an online device transiently takes the offline path; fail-closed and self-correcting, so no data loss |
| 11 | `app/walletBackend/modules/DataService.ts:287,290` | `?? null` deliberately merges JSON-null ("no activation scheduled") with field-absent ("old native lib") for `ironwoodActivationHeight` | Documented and fail-closed; app and native lib ship together, so the absent arm is near-unreachable |
| 12 | `app/walletBackend/types/RPCBalancesType.ts:15,16,17,18` | `?` plus `\| null` makes absent and null interchangeable, and null conflates pool-not-active, zero-Ironwood-funds, and old-lib | Consumers use `(x \|\| 0)`, which is numerically safe; `unconfirmed_ironwood_balance` has no consumer, so its contract is unexercised |
| 13 | `app/walletBackend/utils/walletUtils.ts:416` + `app/walletBackend/types/RPCDrainStatusType.ts:2` | `drainStatus` delivers "no drain running" as the truthy string `"null"` on the same channel as `Error:`-prefixed strings | The one consumer (`MigrationSending.tsx:139`) parses and guards correctly; the discipline exists only by convention for future callers |
| 14 | `app/LoadingApp/components/ImportUfvk.tsx:104,105,123,124` | `possibleBirthday: number \| null` (null = last word not numeric) consumed by truthiness, so a parsed birthday of `0` reads as "not a number" | A paste ending in the literal word "0" leaves it glued to the key text; real Zingo exports never carry birthday 0 |
| 15 | `app/uris/serverUris.ts:13-160` (19 seed entries) + `app/uris/fetchServerList.ts:79` | `latency: null` means both "unmeasured" (static seeds) and "registry omitted ping" (fetch path) | Inert seed data; the danger is realized at the truthiness consumers covered by HIGH finding 2 |
| 16 | `components/Settings/Settings.tsx:514` | Locally fabricated `ironwoodActivationHeight: null` ("we never asked") feeds a type whose shared consumer `IronwoodActivation.ts:21` folds null, undefined, and a literal 0 height together via `!info?.ironwoodActivationHeight` | Display-only here, and a 0 activation height does not occur on real Zcash chains |
| 17 | `components/Scanner/Scanner.tsx:54` | Loose `device == null` (the hook actually returns `undefined`, never null) inside a branch that also conflates no-permission with no-camera | A device with permission but no back camera (emulators, some tablets) shows a misleading "No permission" message |
| 18 | `components/Components/priceFetcherStore.ts:38` | Module singleton `deps: Deps \| null`; `doFetch` silently no-ops while unbound | A fetch requested before any `setDeps` is dropped with no retry and no signal — latent trap for future callers |
| 19 | `components/Header/Header.tsx:287` | The null "history count unknown" window is treated optimistically (UFVK icon tappable) while `BalanceRow.tsx:52,232` treats the same null conservatively (shield button hidden) | Inconsistent policy for one tri-state variable; UX-level only |
| 20 | `components/History/History.tsx:578` | `valueTransfersFiltered !== null` guards a variable typed `ValueTransferType[]` and initialized `[]` — it is never null | The fallback branch is dead code, and the phantom check misleads readers sitting next to the genuinely nullable `valueTransfers` |
| 21 | `components/AddressBook/AddressBook.tsx:98,279,376,992` | Two sentinels for "no real item": `null` (sheet closed) and `-1` (add-new mode), folded together at line 990 via `currentItem ?? -1` | The compound guard at 992 handles both, but overlapping sentinels invite a future site checking only one |

## LOW: idiomatic and unambiguous inventory

### Third-party contracts — React element refs (`useRef<T>(null)`)

Null is React's "component not mounted yet". Every consumer uses `?.`, an
explicit check, or `safeSnapToIndex`. Sites:

`components/Send/Send.tsx:227,228,236,237,238` ·
`components/Send/components/Memo.tsx:45` ·
`components/Send/components/Confirm.tsx:149` ·
`components/Settings/Settings.tsx:1229,1230,1231,1232,1233,1234,1235` ·
`components/History/History.tsx:179,180,192` ·
`components/History/components/ValueTransferDetail.tsx:122` ·
`components/Receive/Receive.tsx:109,110,111` ·
`components/Receive/components/NewAddress.tsx:58` ·
`components/Ufvk/ShowUfvk.tsx:148,191` ·
`components/AddressBook/AddressBook.tsx:125,126,127` ·
`components/Seed/Seed.tsx:159` ·
`components/Components/ConfirmBottomSheet.tsx:26` ·
`components/Components/ChainSelect.tsx:111` ·
`components/Components/SingleAddress.tsx:59` ·
`components/AddressList/AddressList.tsx:80,81` ·
`components/Messages/MessageList.tsx:91,92` ·
`components/SyncReport/SyncReport.tsx:75` ·
`components/Rescan/Rescan.tsx:67` ·
`components/Pools/Pools.tsx:44` ·
`components/Insight/Insight.tsx:84` ·
`components/About/About.tsx:31` ·
`app/LoadedApp/LoadedApp.tsx:744` ·
`app/LoadingApp/LoadingApp.tsx:493` ·
`app/LoadedApp/components/ComputingTxContent.tsx:130` ·
`app/LoadingApp/components/ImportUfvk.tsx:74` ·
`app/LoadingApp/components/NewSeed.tsx:75` ·
`app/LoadingApp/components/StartMenu.tsx:71,72` ·
`app/hooks/usePriceSnapAutoClose.ts:27` ·
`app/utils/safeSnapToIndex.ts:39`

Special member of this family: `components/History/History.tsx:197,198,199,201`
and `components/History/components/ValueTransferLine.tsx:53,89,91` handle
React's *callback-ref* contract, where null is the unmount/recycle signal; the
strict `ref === null` branch deletes the registry entry, preventing a
documented crash. Exemplary.

### Third-party contracts — library API values

- `handleComponent={null}` tells @gorhom/bottom-sheet to render no drag handle
  (null and undefined are deliberately different in that API):
  `components/Receive/Receive.tsx:472`, `components/Ufvk/ShowUfvk.tsx:492,499`,
  `components/Components/ChainSelect.tsx:223`,
  `components/Components/SelectBottomSheet.tsx:219`.
- `app/LoadedApp/LoadedApp.tsx:999` — `Linking.getInitialURL()` resolves
  `string | null`; strict check matches the typed contract.
- `app/simpleBiometrics.ts:128` — `Keychain.getSupportedBiometryType()` null
  means "no biometry supported"; strict check, fail-closed function.
- `app/AppState/types/NetInfoType.ts` mirrors the netinfo library (listed under
  MEDIUM 10 for its consumers, not its declaration).

### State-init — "not yet available / nothing selected"

All checked strictly or via safe truthiness (class-instance-or-null,
function-or-null, enum-string-or-null — never a falsy domain value):

- Context defaults: `app/context/contextAppLoaded.tsx:29-34` and their state
  mirror `app/LoadedApp/LoadedApp.tsx:754-759` (balance, addresses, value
  transfers, messages, totals — null = not fetched, `[]`/`0` = fetched empty).
- Sheet/selection state: `components/Receive/Receive.tsx:95,96,252`,
  `components/Ufvk/ShowUfvk.tsx:130,200`, `components/History/History.tsx:150`,
  `components/History/components/Filters.tsx:40,50,85,123,162,307`,
  `components/AddressBook/AddressBook.tsx:99,280,377` (action),
  `components/Settings/Settings.tsx:333,1714,1811,1873,2122,2176,2235`
  (accordion), `components/OptionsPanel/OptionsPanel.tsx:93,98` (copied-URL
  caption, documented in the adjacent comment).
- Origin/verdict tri-states handled strictly:
  `components/Ufvk/ShowUfvk.tsx:143,144,512,588` and
  `components/Seed/Seed.tsx:154,155,604,692` (keychain-vs-wallet source);
  `components/Settings/Settings.tsx:487,490,491,531,557,2826`
  (`selectedServerActive: boolean | null`, the cleanest tri-state in the
  codebase — documented, with a strict `!== null` render gate that truthiness
  would break).
- Timer/animation handles (null = disarmed; handles are never falsy):
  `components/History/History.tsx:147,564`,
  `components/AddressBook/AddressBook.tsx:102,361`,
  `components/AddressList/AddressList.tsx:69,232`,
  `components/Ufvk/ShowUfvk.tsx:190,237,325`,
  `components/Seed/Seed.tsx:105,229,269`,
  `app/LoadingApp/LoadingApp.tsx:490,1900`,
  `app/LoadingApp/components/NewSeed.tsx:68,89,129`,
  `app/hooks/usePriceSnapAutoClose.ts:32,37`,
  `app/hooks/useSyncStatus.ts:32`,
  `components/Components/priceFetcherStore.ts:39,40,50`.
  The clipboard timers in Seed, ShowUfvk, and NewSeed are security-relevant
  (null-on-expiry stops the unmount handler wiping an unrelated clipboard) and
  are maintained correctly.
- Lazy-init refs: `components/TabBar/CustomTabBar.tsx:87,98`.
- Listener registries (null = unwired, warn-and-no-op callers):
  `app/context/optionsPanel.tsx:54,55,56,80,81,82,83`,
  `app/showConfirm.ts:24,26`,
  `components/Components/ConfirmBottomSheet.tsx:27,36`.
- Class fields: `app/LoadedApp/LoadedApp.tsx:746,747` (drawerNav),
  `820,824,2073` (newSelectServer, addTagModalTarget).
- Migration screens: `components/MigrationSending/MigrationSending.tsx:103,104,152`,
  `components/MigrationTransactions/MigrationTransactions.tsx:102,104` (the
  null plan is disambiguated by sibling `loading`/`errorMsg` flags, and the
  early returns make Accept unreachable against a null plan),
  `components/ErrorBoundary/AppErrorBoundary.tsx:33,38`.
- `components/Send/components/Confirm.tsx:104` (`privacyLevel` — null =
  computing; the render check is truthiness, safe only because
  `getPrivacyLevel` never returns `''`).

### Type-union annotations and props

Declarations whose null flows from the context state above, consumed with
strict checks: `app/AppState/AppContextLoaded.ts:33,36,39,40,43,44` ·
`app/AppState/AppStateLoaded.ts:11,23,28` ·
`app/AppState/types/ServerUrisType.ts:8` ·
`app/AppState/types/InfoType.ts:13` ·
`app/AppState/const/IronwoodActivation.ts:21` (documented fail-closed fold) ·
`components/History/components/Filters.tsx:14,15` ·
`components/TabBar/CustomTabBar.tsx:34` ·
`components/Header/components/BalanceRow.tsx:44,52,232` ·
`components/AddressBook/components/AddTagModalHost.tsx:21,24` ·
`app/hooks/useShieldFunds.ts:28` ·
`app/hooks/usePriceSnapAutoClose.ts:17,28,46` (exemplary: documented contract
plus strict `!== null` exactly where snap index 0 is valid) ·
`components/MigrationSending/MigrationSending.tsx:55` ·
`app/LoadedApp/LoadedApp.tsx:1205` (checkMeetIronwood parameter).

The price-snap sentinel `priceRowH > 0 ? 0 : null` with its strict guard
appears three times, correctly each time:
`components/Send/Send.tsx:299,311`,
`components/History/History.tsx:367,378`,
`components/Receive/Receive.tsx:231,242`.

### Guards over context data (strict, load-bearing)

`components/History/History.tsx:417,484` ·
`components/Messages/MessageList.tsx:156` ·
`app/LoadedApp/LoadedApp.tsx:1337,2294,2402` ·
`app/LoadedApp/LoadedAppOptionsPanelHost.tsx:111,127` (the model for the
tri-state: a still-loading wallet is not treated as empty) ·
`components/Receive/Receive.tsx:392,404` (the correct index-guard pattern that
HIGH finding 3's six sites should copy) ·
`app/selectingServer.ts:9,33` (strict producer/consumer pair; undone upstream
per HIGH 2) · `app/selectingServer.ts:21,25,26` (15 s timeout sentinel;
"all failed" and "timed out" intentionally collapse) ·
`app/LoadedApp/LoadedApp.tsx:1016` (defensive null check on a payload typed
plain `string`; imagines a null the API never produces — harmless) ·
`app/LoadedApp/LoadedApp.tsx:1763,1779` (local `openError` accumulator, every
assignment guarantees a non-empty string) ·
`components/LoadingApp` fresh-install dispatch `LoadingApp.tsx:207` is listed
under MEDIUM 8.

### Arg-skip sentinel (`updateToField`) — full site list

Signature and strict per-slot guards: `components/Send/Send.tsx:627,628,629,630,631`
and `633,677,695,713,717`. Call sites (each null = "leave that field alone"):
`Send.tsx:509,511,512,513` (propose-response amount write, MEDIUM 6) ·
`1092` (QR scan) · `1369` (address input) · `1385` (address clear) ·
`1572,1574,1575,1576` (ZEC amount) · `1602,1603,1605,1606` (USD amount) ·
`1617,1618` (the near-miss clear pair, MEDIUM 5) · `1637` (send-max) ·
`2031` (memo clear) · `1960,1961,1962,1964,1971,1972,1973,1975` (memo +
auto-seed amount, MEDIUM 7) · `2180` (pre-send refresh) ·
`2194,2196,2197` (donation minimum) · `2227` (transparent-address memo scrub) ·
`2300` (donation prefill) · `2394,2397,2403` (address-book select/revert).
Per-slot the meaning is unambiguous under strict TS; the risk lives in the
five-way positional convention itself (see MEDIUM 5-7).

### Render-guards (render nothing)

`components/Send/Send.tsx:1447,1628` ·
`components/Send/components/Memo.tsx:124` ·
`components/Send/components/SendErrorSheet.tsx:163` ·
`components/History/History.tsx:920` ·
`components/AddressBook/components/AbDetail.tsx:334` ·
`components/MigrationStrategy/MigrationStrategy.tsx:76,140` ·
`components/ErrorBoundary/AppErrorBoundary.tsx:96,103` ·
`components/Components/ChainSelect.tsx:202` ·
`components/Components/CurrencyAmount.tsx:102` ·
`components/Components/Address/Address.tsx:25` ·
`components/Header/components/PriceRow.tsx:58` ·
`app/BiometricBlankingOverlay.tsx:31` ·
`app/hooks/useBottomSheetBackHandler.tsx:34` (headless component).
All operate on strings or booleans where truthiness is exact.

### Boundary crossings handled correctly

`components/MigrationSending/MigrationSending.tsx:139` — `JSON.parse(statusStr)
as RPCDrainStatusType | null`; the parsed-null "no snapshot yet" is skipped and
the poll retries. `app/uris/fetchServerList.ts:79` — registry ping missing →
null latency; ranking happens on the raw ping, nulls sort last.
`app/walletBackend/types/RPCInfoType.ts:17` — null vs absent assigned distinct
documented meanings; their collapse downstream is explicit (MEDIUM 11).

## Test and mock nulls

All eight verified faithful to the production value they stand in for; none can
green-light a production bug.

| Location | Verdict |
|---|---|
| `__tests__/IronwoodActivation.unit.test.ts:13` | Helper parameter mirrors `InfoType.ironwoodActivationHeight: number \| null` exactly |
| `__tests__/IronwoodActivation.unit.test.ts:29,30` | Null stands in for an old-lib `undefined`; behaviorally faithful because the production guard is falsiness-based |
| `__tests__/IronwoodActivation.unit.test.ts:37` | `isIronwoodActive(null)` is a legitimate production input per the declared union |
| `__tests__/History.ValueTransferDetail.unit.tsx:60,99` | `queryByText` returning null is the testing-library contract, not a stand-in |
| `__tests__/MeetIronwood.trigger.unit.tsx:175` | Null is exactly what `this.state.totalBalance` supplies before the first balance poll |
| `__tests__/Filters.snapshot.tsx:28` | `filterKind={null}` is the exact production "no filter" value |

## Observations beyond individual nulls

1. **The TransparentWarning flow is dead code.** `show('TW')` is never called
   anywhere, and `SingleAddress` accepts `hasTransparent` without using it
   (`components/Components/SingleAddress.tsx:42`). This is what narrows HIGH
   finding 3's trigger today; resurrecting the flow without fixing the index
   guards would widen it.
2. **Two timer refs are never re-nulled after firing**
   (`components/Components/priceFetcherStore.ts:40`,
   `components/AddressList/AddressList.tsx:69` callback path), so "null" and
   "stale fired handle" both mean "nothing pending". Harmless today because
   the only consumer is `clearTimeout`, which tolerates fired ids; a hygiene
   cleanup if these files are touched.
3. **`ConfirmBottomSheet` never resets `options` to null after a dialog
   closes** (`components/Components/ConfirmBottomSheet.tsx:27`), so null stops
   meaning "idle" after first use; `resolvedRef` carries that duty instead.
4. **The codebase's strict-null discipline is genuinely good.** Every site
   where 0-vs-null or ''-vs-null matters and the code uses strict comparison
   was found correct; all four HIGH findings arise where truthiness or a
   missing second conjunct undoes that discipline, which is a useful review
   heuristic for future changes: *the bug is never the null declaration, it is
   the loose read.*

## Suggested remediation order

Work the HIGH findings first (1: fetchWallet result type; 2: three latency
truthiness reads; 3: Receive index encoding; 4: VerifyAddress field
validation) — each is a small, local fix. Then MEDIUM 5-7 (the `updateToField`
protocol) as one refactor to a single options-object parameter, which
eliminates 17 call sites' transposition risk at once and removes roughly a
quarter of the file's nulls. The remaining MEDIUMs are judgment calls best
taken when their files are next touched.
