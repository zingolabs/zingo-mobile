# zingo-mobile: why the app shell architecture fails

A review of `LoadingApp`, `LoadedApp`, the shared context, and the path from the Rust wallet to the screen. Written for an engineer who has not worked in React Native. Line numbers refer to the `dev` branch at commit `807d985`.
**Summary.** The app puts one 2,000-line [class component](https://react.dev/reference/react/Component) in charge of the wallet backend lifecycle, OS events, deep links, network state, security gating, settings persistence, notifications, translation, and a 26-route navigation tree. That class publishes its whole state, 58 keys of data and functions, through one [React context](https://react.dev/learn/passing-data-deeply-with-context). Every change to any key re-renders the class and all 47 screens and widgets that subscribe. The app's boot flow is a state machine that nobody wrote down: its state is spread across a route name, a bag of route parameters, four booleans, one enum, and a manual re-call of [`componentDidMount`](https://react.dev/reference/react/Component#componentdidmount). The result is code that is slow to render, hard to test, and expensive to extend.

## 1. Vocabulary for readers who do not work in React

React builds the screen from a tree of *components*. You need six terms to follow the rest of this document. Each term links to the page in the React, React Native, or React Navigation documentation that defines it.

- **[Component](https://react.dev/learn/your-first-component)** A function (or a class) that receives inputs and returns a description of the UI. React calls it to produce the screen.
- **[Props](https://react.dev/learn/passing-props-to-a-component)** The inputs a parent passes to a child component. They flow down only.
- **[State](https://react.dev/learn/state-a-components-memory)** Data a component owns. When state changes, React calls the component again. This is a *render*.
- **[Re-render](https://react.dev/learn/render-and-commit)** React calls a component again because its props, state, or a context it reads changed. React then calls all of its children too, unless a child is wrapped in [`React.memo`](https://react.dev/reference/react/memo) and received identical props. A render runs on the [JavaScript thread](https://reactnative.dev/docs/performance). While it runs, that thread does nothing else: no touch handling, no animation callbacks, no timers.
- **[Context](https://react.dev/learn/passing-data-deeply-with-context)** A broadcast channel. A *Provider* high in the tree publishes one value. Any component below it can call [`useContext`](https://react.dev/reference/react/useContext) to read that value. When the published value changes identity, React re-renders every subscriber. There is no way to subscribe to one field of the value. It is all or nothing.
- **[Class](https://react.dev/reference/react/Component) vs [function component](https://react.dev/reference/react/hooks)** Two ways to write a component. Class components hold state in `this.state` and change it with [`this.setState`](https://react.dev/reference/react/Component#setstate). Function components use hooks such as [`useState`](https://react.dev/reference/react/useState). Modern React code uses functions. This codebase uses both, stacked on top of each other.
- **[Native module](https://reactnative.dev/docs/legacy/native-modules-intro) / FFI** React Native runs JavaScript in a separate thread from the platform UI. A native module is Kotlin or Swift code that JavaScript can call across the bridge. Here the native module calls into Rust through [UniFFI](https://mozilla.github.io/uniffi-rs/). Every call is asynchronous and returns a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) of a string.

## 2. The layers, from Rust to the screen

A wallet value travels through eight layers before a screen can show it.

- **Rust: `rust/lib/src/lib.rs`** zingolib behind one global [`static LIGHTCLIENT: RwLock<Option<LightClient>>`](https://doc.rust-lang.org/std/sync/struct.RwLock.html). Every exported function takes the lock, runs an async block on a shared runtime, and returns `Result<String, ZingolibError>`. The string is JSON.
- ↓ [UniFFI](https://mozilla.github.io/uniffi-rs/), `zingo.udl`, 71 functions
- **Kotlin `RPCModule.kt` (1,245 lines) and Swift `RPCModule.swift`** One [`@ReactMethod`](https://reactnative.dev/docs/legacy/native-modules-android) per Rust function. Each wraps the Rust call in a Promise. Each call also runs `initLogging()` first.
- ↓ React Native bridge, strings only
- **`app/RPCModule/RPCModule.ts`** A TypeScript interface that mirrors the native methods. About 80 methods. All return `Promise<string>`.
- ↓ `callFfi` maps rejections to typed errors
- **`app/walletBackend/`: `WalletBackend`, `SyncCoordinator`, `DataService`** A [`setInterval`](https://developer.mozilla.org/en-US/docs/Web/API/Window/setInterval) fires every 5 s. Each tick can run 8 FFI calls plus a wallet save. Each call parses JSON, transforms it, and fires a callback.
- ↓ `WalletBackendConfig` callbacks: `onBalanceChanged`, `onSyncStatusChanged`, …
- **`LoadedAppClass` (`app/LoadedApp/LoadedApp.tsx:763`, ~2,030 lines)** Each callback is a class method that deep-compares and calls `this.setState`. 52 `setState` call sites. The class also owns OS lifecycle, deep links, network events, security gating, settings, notifications, and the navigation tree.
- ↓ `render()` builds a 58-key object and hands it to one Provider
- **`ContextAppLoaded` (`app/context/contextAppLoaded.tsx`)** One context for balances, addresses, transaction lists, sync status, settings, translation, and 15 callback functions.
- ↓ [`useContext(ContextAppLoaded)`](https://react.dev/reference/react/useContext)
- **47 screens and widgets** Each subscribes to the whole object. `Send.tsx` reads 29 keys, `Settings.tsx` 27, `Header.tsx` 12. Fifteen consumers read two keys or fewer and still re-render on every change.

Two properties of the bottom layer drive everything above it. First, Rust hands JavaScript strings, never structured data. Every layer above parses, sniffs, or transforms text. `SyncCoordinator.fetchSyncPoll` branches on `returnPoll.toLowerCase().startsWith('sync task has not been launched')`. Second, Rust has no way to push. The lightclient sits behind a lock and answers questions. The app must ask, on a timer, forever.

## 3. The two shells: LoadingApp and LoadedApp

The root [stack navigator](https://reactnavigation.org/docs/stack-navigator) has two main routes. `LoadingApp` boots the wallet. `LoadedApp` runs it. Each route is a *sandwich*: a function component on top, a class component underneath. The function component loads settings from disk with about twenty [`useState`](https://react.dev/reference/react/useState) hooks, then mounts the class and passes every setting down as a prop. The class copies each prop into `this.state` in its constructor.

![Figure 1](app-shell-architecture-review/figure-1.svg)

*Both routes repeat the same settings-loading code. The transition between them is a [navigator reset](https://reactnavigation.org/docs/navigation-actions#reset) that unmounts one sandwich and mounts the other, with a parameter bag as the only shared memory.*

### Why the sandwich exists

The class components predate hooks. Someone later needed [hooks](https://react.dev/reference/react/hooks) (`useTheme`, [`useMemo`](https://react.dev/reference/react/useMemo) for translation) and wrapped each class in a function to get them. Now each setting lives in three places: the function's `useState`, the class's prop, and the class's `this.state`. A change in one does not reach the others unless someone writes glue. The glue exists and is fragile. [`componentDidUpdate`](https://react.dev/reference/react/Component#componentdidupdate) at line 1086 copies `props.translate` into `state.translate` on every prop change. `setLanguageOption` at line 1917 writes the file, sets class state, then calls back up into the function wrapper to bump its state, which rebuilds `translate`, which flows back down as a prop, which the class copies into state again. The comments around these lines are longer than the code. That is the signal of an architecture that fights itself.

### Duplicated boot logic

Both function wrappers read `settings.json` and validate the same fields with the same `if` chains. Both wrappers build an `I18n` instance from the same five JSON files. The app therefore parses the translation catalog twice per launch and twice again on every wallet change, because a wallet change resets the navigator back to `LoadingApp`.

## 4. The state machine nobody wrote down

A wallet app has a clear lifecycle: locked, booting, no wallet, creating, restoring, running, changing wallet. A good design writes this as one type with one variable, and every transition as a named function. zingo-mobile has the same lifecycle, but its current state is the product of at least nine independent variables in four different places.

| Variable | Where it lives | Type |
|---|---|---|
| Current route | [React Navigation stack](https://reactnavigation.org/docs/stack-navigator) | `LoadingApp \| LoadedApp \| ScannerAddress \| ScannerUfvk` |
| Route params | [Navigation params bag](https://reactnavigation.org/docs/params) | `LoadingAppNavigationState` (4 optional fields) or `LoadedAppNavigationState` (7 fields) |
| `loading` | Function wrapper `useState` | boolean |
| `screen` | `LoadingAppClass.state` | `Launching \| StartMenu \| NewSeed \| ImportUfvk` |
| `startingApp` | `LoadingAppClass.state`, seeded from params | boolean |
| `biometricGate` | `LoadingAppClass.state`, seeded from params | `{kind:'passed'} \| {kind:'declined', failure}` |
| `walletExists`, `hasBackupWallet` | `LoadingAppClass.state` | boolean |
| `actionButtonsDisabled` | `LoadingAppClass.state` | boolean, doubles as "boot in progress" |
| `serverErrorTries` | `LoadingAppClass.state` | number |
| `unmounted` | Instance field on the class | boolean, exists to detect a boot chain that outlived its component |

![Figure 2](app-shell-architecture-review/figure-2.svg)

*The boot lifecycle as it actually runs. The states are inferred from reading the code. No single file, type, or function declares them.*

### What makes it implicit, and why that hurts

1. **The transition mechanism is navigator reset with a params bag.** To go from running to locked, `LoadedAppClass` calls [`navigationApp.reset`](https://reactnavigation.org/docs/navigation-actions#reset) with `{ startingApp: true, biometricGate }`. To go from booted to running, `LoadingAppClass` calls reset with seven positional booleans. The parameters are all optional on one side. A caller can pass any combination. The receiving constructor patches defaults with chains of `!!props.route.params && props.route.params.x !== undefined ? … : …`. Nothing forbids `{startingApp: false, biometricGate: declined}`, which is a state the app cannot render.
2. **Re-entry is a manual lifecycle call.** `this.componentDidMount()` is called by hand at four sites in `LoadingApp.tsx` (lines 1464, 2105, 2130, 2211). React calls that method [once per mount](https://react.dev/reference/react/Component#componentdidmount). Calling it again re-runs a 250-line async chain that fetches network state, runs the biometric gate, picks a server, checks for a wallet, and attaches OS listeners. The author knew it was dangerous: the code calls `detachListeners()` first to avoid stacking subscriptions, and checks an `unmounted` flag at the end because the chain can outlive the component.
3. **Boot is a 250-line async function with state writes in the middle.** `componentDidMount` in `LoadingAppClass` calls `setState` at least eleven times while awaiting FFI calls between them. Each write renders. Each await yields to OS events that can also write. The order of arrival decides what the user sees.
4. **Invalid states are representable.** `walletExists=true` with `screen=StartMenu` is legal. `loading=false` in the wrapper with the class not yet mounted is legal for one frame. `actionButtonsDisabled` means both "buttons disabled" and "boot in progress". A reviewer cannot tell which meaning a given write intends.
5. **Switching wallets tears the world down.** Changing the server, restoring a backup, or changing the wallet resets the navigator to `LoadingApp`. That unmounts `LoadedAppClass`, destroys the `WalletBackend` instance and its timers, re-reads settings from disk, re-parses translations, re-runs the biometric gate, and rebuilds the whole tree. A lighter design would swap the wallet handle and keep the shell.

## 5. The god context

`AppContextLoaded` has 58 keys. They fall into four unrelated groups.

| Group | Examples | Change rate |
|---|---|---|
| Live wallet data | `totalBalance`, `addresses`, `valueTransfers`, `messages`, `syncingStatus`, `info`, `birthday` | Up to every 5 s while syncing |
| Persisted settings | `server`, `currency`, `language`, `mode`, `security`, `privacy`, `nym`, 10 more | Rare, on user action |
| UI scratch state | `sendPageState`, `shieldingAmount`, `showSwipeableIcons`, `somePending`, `foregroundEpoch` | On every keystroke in the Send form |
| Callbacks | `setSendPageState`, `addLastSnackbar`, `restartApp`, `doRefresh`, `launchAddTagModal`, 10 more | Stable identity, but stored in state anyway |

Two structural mistakes compound here.

**Functions live in state.** The constructor writes `setSendPageState: this.setSendPageState` into `this.state`. Functions do not change. Storing them in state means every deep comparison and every shallow memo walks over them, and every reader of the type sees actions and data as the same kind of thing.

**One channel for four change rates.** [React context cannot deliver a subset](https://react.dev/reference/react/useContext#caveats). When `syncingStatus` changes, a widget that only reads `translate` re-renders. When the user types one character in the Send form, `setSendPageState` writes to the class, the class renders, the context object is rebuilt, and every one of 47 subscribers renders again. The `useShallowMemo` helper in `contextAppLoaded.tsx` only prevents a re-render when *no* key changed. Its purpose is to defeat the fact that `render()` creates a fresh object literal on every call.

## 6. The re-render cascade

This is the concrete cost. Follow one 5-second tick while the wallet syncs.

![Figure 3](app-shell-architecture-review/figure-3.svg)

*One tick. During initial sync this repeats twelve times per minute for as long as the scan runs, which on a fresh restore is minutes to hours.*

### Why the mitigations do not fix it

- **[`isEqual`](https://lodash.com/docs/#isEqual) before `setState`** avoids a render when the data is identical. Sync status is never identical between ticks during a scan. The comparison itself walks the full value-transfer array on every tick, on the thread that handles touches.
- **`useShallowMemo` on the Provider** keeps the context identity when nothing changed. One changed key, of 58, defeats it.
- **[`React.memo`](https://react.dev/reference/react/memo) on 25 of 109 UI files** is defeated by the inline closures the class passes as props on every render.
- **[`detachInactiveScreens`](https://reactnavigation.org/docs/bottom-tab-navigator#detachinactivescreens)** on the [tab navigator](https://reactnavigation.org/docs/bottom-tab-navigator) reduces the cost of hidden tabs. It does nothing for the 47 context subscribers, which include shared widgets such as `Header` that are mounted on every screen.

**How a non-React engineer should think about this.** Imagine a service where every field of a large struct is behind one condition variable. Any write to any field signals every waiter. Each waiter then re-runs its whole work function and re-runs its children's work functions. Now put the writer on a 5-second timer. That is this app during sync.

## 7. The logic chunk

`LoadedAppClass` owns these responsibilities. Each one is a reason to change the file.

- Constructs and owns the `WalletBackend` instance and its polling timers (constructor, lines 864–884).
- Handles OS foreground and background transitions ([AppState](https://reactnative.dev/docs/appstate)) with platform-specific branches for iOS and Android (lines 910–1010).
- Runs the foreground biometric gate and locks the app (lines 1097–1142).
- Parses deep links ([Linking](https://reactnative.dev/docs/linking)) and jumps to the Send tab (lines 1020–1055, 1174).
- Watches network state ([NetInfo](https://github.com/react-native-netinfo/react-native-netinfo)) and restarts polling on reconnect (lines 1057–1083).
- Persists every setting to `settings.json` in fourteen `set*Option` methods (lines 1727–2052).
- Switches servers with a 15-second race, with wallet backup on chain change (lines 2119–2188).
- Formats and shows notifications for new transactions, in five languages, with mode-dependent seed-screen redirection (lines 1292–1500).
- Patches missing fields on the info payload with fallbacks from server and wallet chain (lines 1563–1596).
- Declares 26 routes and three tabs, with conditional tab visibility computed from balance fields inline in JSX (lines 2367–2416).
- Hosts two bottom-sheet modals and a toast.

### Testability

The only test for this file is `__tests__/LoadedApp.snapshot.tsx`. It mounts the whole component with two mocks and compares a snapshot. There is no way to test "on reconnect, polling restarts" or "a declined foreground gate locks the app" without mounting the navigator, the theme, the backend, and every screen. Each behavior above should be a function that takes inputs and returns outputs. Here each one is a method that reads `this.state`, calls the FFI, and writes `this.state`.

### Extensibility: adding one field

Suppose a screen needs a new value from the wallet, such as a note count. The change touches seven places, in order.

1. `rust/lib/src/zingo.udl` and `lib.rs`: export a function that returns a JSON string.
2. `RPCModule.kt` and `RPCModule.swift`: add a `@ReactMethod` wrapper.
3. `app/RPCModule/RPCModule.ts`: add the method to the interface.
4. `app/walletBackend/config/WalletBackendConfig.ts`: add an `onNoteCountChanged` callback.
5. `DataService.ts` and `SyncCoordinator.ts`: add a fetch and push it into the tick.
6. `AppContextLoaded.ts`, `contextAppLoaded.tsx` defaults, the class constructor, the class `render()` context literal, and a new setter with `isEqual`: five edits in three files.
7. The screen: read it from context.

Steps 1 to 3 are the unavoidable cost of an FFI. Steps 4 to 6 exist only because the class is the single owner of all state. In a design where the backend publishes typed events and screens subscribe to a store slice, steps 4 to 6 collapse to one line in a store definition.

## 8. FFI coupling in detail

The Rust boundary is better than the React side. It has typed errors (`FfiResult`, ADR 0002) and a single funnel (`callFfi`). The remaining problems are in how the app uses it.

- **Polling instead of events.** Rust cannot call back into JavaScript here. The app asks eight questions every 5 seconds whether or not anything changed. A native event emitter, or a single "what changed since sequence N" call, would let Rust say when a render is needed.
- **Prose in the data channel.** `pollSyncInfo` returns either JSON or a sentence. The coordinator sniffs the sentence with `startsWith`. ADR 0003 forbids this and the code is mid-migration.
- **One global lock.** Rust keeps the client in a `RwLock`. Long write operations (drain, split, batch send) hold it for minutes. The poll then blocks. The workaround was to add side channels (`DRAIN_PROGRESS`, `SPLIT_PROGRESS`) outside the lock, each with its own poll method and its own status type. Each new long operation will need another.
- **The backend reaches into the UI.** `WalletBackendConfig` carries `keepAwake`, a screen-wake function, into the sync layer. The backend decides when the screen may sleep. That is a UI policy in a data module.
- **Shared mutable config.** `WalletBackend.setServer` mutates one config object that every sub-service holds by reference. Sub-services read it mid-operation. A server change while a fetch is in flight uses the new URI for the second half of the fetch.
- **`initLogging()` before every call.** Each of the 71 native methods calls it. It is idempotent, and it is still a lock and a check per call, twelve times per minute per fetch.

## 9. Bugs this architecture produces

These are not hypothetical. Each one has a comment in the code that explains the workaround.

| Symptom | Root cause | Location |
|---|---|---|
| Language switch left labels in the old language | `translate` identity captured in three places (wrapper memo, class prop, class state). i18n mutates in place | `LoadedApp.tsx:1086`, `:1917`, wrapper `:258` |
| A sensitive screen could be shown after resume without a fresh auth | Screens cannot observe the app-level gate, so a `foregroundEpoch` counter was added to the context for them to watch | `AppContextLoaded.ts:161`, `LoadedApp.tsx:980` |
| Duplicate OS listeners after retry | Manual `componentDidMount()` re-entry | `LoadingApp.tsx:826`, `:2095` |
| Boot chain writes state into an unmounted component | 250-line async mount chain with no cancellation | `LoadingApp.tsx:833`, `:727` |
| Bottom tab flicker on new transaction | Tab visibility is derived in `render()` from balance. Patched with a 250 ms `setTimeout` before `setState` | `LoadedApp.tsx:1490` |
| Stale read after write | `onClickOKServerWallet` calls `setState({newServer: {}})` then reads `this.state.newServer` on the next line. It works only because [the write has not landed yet](https://react.dev/learn/queueing-a-series-of-state-updates). | `LoadedApp.tsx:2159` |
| Server change with a failing server blocked for minutes | The 15 s timeout race was written around an FFI call with no cancellation | `LoadedApp.tsx:2121` |
| Offline wallet showed the wrong currency name | `setInfo` patches empty fields from three fallback sources in the UI class | `LoadedApp.tsx:1563` |

## 10. What a sound version looks like

The fix is a direction, not a rewrite in one pull request. Four moves, in dependency order.

1. **Name the lifecycle.** One [discriminated union](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions): `{kind:'locked', failure} | {kind:'booting'} | {kind:'noWallet', hasBackup} | {kind:'running', wallet} | …`. One reducer or one small class outside React owns it. Screens render from it. Transitions are functions with names. Invalid states become type errors.
2. **Split the context by change rate.** Settings, wallet data, and UI scratch state are three stores with three change rates. A store with selectors ([Zustand](https://zustand.docs.pmnd.rs/), [Jotai](https://jotai.org/), or a hand-written [`useSyncExternalStore`](https://react.dev/reference/react/useSyncExternalStore)) lets `Header` subscribe to `totalBalance` alone. A change to `syncingStatus` then renders `SyncReport` and nothing else. Callbacks leave state and become module functions.
3. **Make the backend publish.** `WalletBackend` emits typed events onto the store. Nothing in `WalletBackendConfig` points at a component. `keepAwake` moves to a UI effect that watches sync state. The polling loop can then be replaced by a [native event emitter](https://reactnative.dev/docs/legacy/native-modules-android#sending-events-to-javascript) without touching a screen.
4. **Keep the shell across wallet changes.** Boot, lock, and wallet switch become state transitions inside one mounted tree. The navigator reset with a params bag goes away, and with it the duplicated settings loader and the double i18n parse.
The Rust boundary already has the parts these moves need: typed errors, one funnel, pure wrappers. The work is on the JavaScript side, and it can proceed one store at a time while the class keeps running.

## Appendix: the numbers

| Measure | Value |
|---|---|
| `LoadedApp.tsx` lines | 2,793 |
| `LoadedAppClass` lines (763 to end) | ~2,030 |
| `this.setState` sites in `LoadedAppClass` | 52 |
| `LoadingApp.tsx` lines | 2,377 |
| `this.setState` sites in `LoadingAppClass` | 66 |
| Manual `componentDidMount()` calls | 4 |
| Keys in `AppContextLoaded` | 58 |
| Of which functions | 15 |
| Files calling `useContext(ContextAppLoaded)` | 47 |
| Consumers reading two keys or fewer | 15 |
| Most keys read by one consumer (`Send.tsx`) | 29 |
| UI files using `React.memo` / total | 25 / 109 |
| Poll interval | 5 s |
| FFI calls per tick (save required) | 8 + save |
| Native methods in `RPCModule.ts` | ~80 |
| Functions in `zingo.udl` | 71 |
| Routes declared in `LoadedAppClass.render()` | 26 + 3 tabs |
| `useState` hooks in each function wrapper | 19 / 20 |
| Tests that exercise `LoadedApp` | 1 snapshot |

Counts come from `grep` and a small Perl pass over the destructuring sites on 2026-09-18. Line numbers move as the file is edited.
