# Testnet Fixture Wallets

A test that needs funds runs against testnet (#1498). It reads a fixture wallet,
a testnet wallet whose seed, birthday, and history are published in this
repository (`zingo-adrs zingo-mobile/0019`). This document is the procedure a
maintainer follows by hand to create the two fixture wallets and to refresh
them.

Values in angle brackets are values the maintainer supplies. Items marked
"(verify)" were not confirmed against source when this document was written.

## The two wallets

The shared fixture wallet holds a full history. These tests read it on Android
and iOS.

| Test                                                 | What it reads                                                                                                                                                                                          |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mixnet refusal test, `ConfirmRefusesWithoutMixnet`   | The published addresses, the consolidation txid, and a confirmed shielded balance above a minimum. The test proposes a send to the wallet's own transparent address and expects the confirm to refuse. |
| Value-transfer test, `RecoversConsolidationTransfer` | The consolidation entry, found by txid and kind, with its status, height, value, and fee.                                                                                                              |
| Pool-balance test, `ExecuteSaplingBalanceFromSeed`   | The exact total and confirmed balances of the Ironwood, Orchard, and Sapling pools, and a confirmed transparent balance of zero. This test still runs on regtest.                                      |
| Funded sync check                                    | A note the sync finds, and the pool balance after the sync. `ConfirmRefusesWithoutMixnet` carries it.                                                                                                  |

The transparent fixture wallet holds one transparent note that nobody shields.
The Maestro shield-offer flow (#1493) restores it and checks that the app offers
to shield the note. The flow stops before the send gate. A flow that shields the
note spends the fixture.

## Starting from zingolib's testnet wallet

zingolib already publishes a funded testnet wallet,
`TestnetSeedVersion::GloryGoddess` in
`zingolib/zingolib/src/wallet/disk/testing/examples.rs`. The file holds its
seed phrase, its transparent address `tmF7QpuKsLF7nsMvThu4wQBpiKVGJXGCSJF`, and
its unified address, which has no Sapling receiver. Its saved wallet file is
`zingolib/zingolib/src/wallet/disk/testing/examples/testnet/glory_goddess/latest/zingo-wallet.dat`.
The ignored networked tests of `zingolib/zingolib/src/lightclient/send.rs`
(`testnet_send_to_self_orchard_glory_goddess` and its siblings) spend from it.

Anyone who runs those tests changes the wallet's history. The shared fixture
wallet can start from it for the tests that tolerate a changing history. The
mixnet refusal test checks a minimum balance, and the funded sync check needs a
note to find. The value-transfer test fits when it reads the oldest entries,
which later transactions leave in place. Its expected values then come from
the oldest entries of this wallet.

The pool-balance test checks exact balances, and those need a wallet that
nobody else spends from. The maintainer chooses one of two paths. The test can
read its own wallet, created from a new seed with the history below. The test
can also relax its check to what a shared wallet can guarantee.

The shared fixture wallet started from this seed on 2026-10-02. The wallet sent
its whole balance to itself in one transaction, txid
`256fc8dcb3dd730439157301a027f7b243d69aa30e31fc7a9b619e726321d19f`, which
confirmed in block 4,431,582, and then shielded its transparent funds in block
4,431,584. The fixture birthday is 4,378,218, the block mined ten days before
the consolidation by block timestamp. A wallet restored from that birthday
holds one entry for the consolidation, kind `memo-to-self`, value 3,995,811,890
zatoshis, fee 285,000, and a confirmed Ironwood balance of 3,995,846,890
zatoshis. `TestnetFixture` in `RustFFITest.kt` holds those values. A later
spend from the seed by zingolib's tests adds entries after the consolidation
and lowers the balance, and the fixture tests tolerate both.

The birthday and the current history of this wallet come from one sync of the
saved wallet. Read them from that sync.
`zingolib/docs/testing/testnet.md` gives the command, run from the root of the
zingolib submodule.

```bash
cargo run -- -c=testnet --server="https://testnet.zec.rocks:9067" --data-dir=zingolib/src/wallet/disk/testing/examples/testnet/glory_goddess/latest
```

Three changes adapt it to the pinned CLI. The CLI aborts an online session that
finds no `nym-proxy` binary, and `makers run-cli` places one beside the CLI.
Port 9067 of `testnet.zec.rocks` gave no answer on 2026-10-02, and port 443
did. The command also writes the synced wallet back into the submodule, and a
copy outside the repository keeps the saved file unchanged.

```bash
# Copy the saved wallet out of the submodule.
cp --recursive \
  zingolib/zingolib/src/wallet/disk/testing/examples/testnet/glory_goddess/latest \
  "$HOME/fixture-wallets/glory-goddess"

# Sync the copy once, on testnet, through the mixnet-capable CLI.
cd zingolib
makers run-cli \
  --chain testnet \
  --server="https://testnet.zec.rocks:443" \
  --data-dir="$HOME/fixture-wallets/glory-goddess"
```

After the sync, `birthday` prints the birthday, and `value_transfers` and
`balance` print the history. The range from that birthday to the tip must fit
the budget under Refreshing. When the range passes the budget, the shared
fixture wallet takes a new seed and the history below.

## The history

The history reproduces the two regtest scenarios that the tests replace,
`funded_orchard_with_3_txs_mobileclient` and
`funded_orchard_sapling_transparent_shielded_mobileclient` in
`zingolib/zingolib_testutils/src/scenarios.rs`. Both scenarios ran with a value
of 1,000,000 zatoshis. The amounts below keep that value, and the Kotlin
expectations change as little as possible.

A third wallet, the funding wallet, sends every receipt. The maintainer holds
its seed and keeps it out of the repository. The spending wallet of the
broadcast tests (#1489) can serve as the funding wallet.

| Step | From           | To                                      | Zatoshis  | Memo                     | What the step gives the tests        |
| ---- | -------------- | --------------------------------------- | --------- | ------------------------ | ------------------------------------ |
| 1    | Funding wallet | Shared wallet, unified address          | 1,000,000 |                          | The receipt into Orchard             |
| 2    | Shared wallet  | Funding wallet, unified address         | 100,000   |                          | The send                             |
| 3    | Shared wallet  | Shared wallet, Sapling address          | 100,000   | `note-to-self test memo` | The memo-to-self                     |
| 4    | Funding wallet | Shared wallet, Sapling address          | 250,000   |                          | The receipt into Sapling             |
| 5    | Funding wallet | Shared wallet, transparent address      | 250,000   |                          | The receipt into transparent         |
| 6    | Shared wallet  | Shared wallet, unified address          | 100,000   |                          | The self-send to Orchard             |
| 7    | Shared wallet  | Shared wallet, Sapling address          | 100,000   |                          | The self-send to Sapling             |
| 8    | Shared wallet  | Shared wallet, transparent address      | 100,000   |                          | The self-send to transparent         |
| 9    | Shared wallet  | Shared wallet, shield                   | all       |                          | The shield of the transparent funds  |
| 10   | Funding wallet | Transparent wallet, transparent address | 250,000   |                          | The note the shield-offer flow reads |

Steps 1 to 3 come from the first scenario. Steps 4 to 9 come from the second
scenario. The second scenario's own receipt into Orchard and its send to the
faucet are steps 1 and 2 here.

Each step must confirm before the next step starts. One transaction per block
keeps the order of the value transfers fixed. The next spend also needs the
previous change to be spendable, which takes the number of confirmations the
wallet's `min_confirmations` setting names. The CLI's `settings` command prints
it.

Testnet activated NU6.3 at height 4,134,000. Fees and pool placement follow the
pinned zingolib. Change and shielded funds land in the Ironwood pool
(`zingo-adrs zingo-mobile/0001`), and fees follow ZIP 317. The pool that step 1
lands in follows the funding wallet's policy for a payment to a unified address
(verify). The regtest numbers in the Kotlin tests change on testnet.
The maintainer records the balances and value transfers that a fresh sync
reports, and those become the test constants.

## The tool

Every transmission goes through the mixnet. A wallet with no mixnet refuses to
transmit (`zingo-adrs zingolib/0011`). The zingo-cli of the pinned zingolib
submodule authors the history. Its default build carries the `nym` feature, and
an online session forces Mixnet Mode on at the go-online moment
(`zingolib/zingo-cli/src/lib.rs`, the `MixnetStartPolicy::ForcedOn` call). A
failure to start the proxy aborts the session.

The `run-cli` task of `zingolib/Makefile.toml` builds the CLI, places the
`nym-proxy` binary beside it, and launches it. It needs cargo-make.

```bash
# The CLI sources come from the zingolib submodule.
git submodule update --init zingolib
cargo install cargo-make
```

Each wallet needs its own data directory. The `--data-dir` option takes an
absolute path. A directory with no wallet file creates a wallet from a new seed
at the current tip. The `--server` option pins the indexer and also gives
consent to go online.

```bash
# Launch an interactive session on testnet for the shared wallet.
cd zingolib
makers run-cli \
  --chain testnet \
  --server https://testnet.zec.rocks:443 \
  --data-dir "$HOME/fixture-wallets/shared"
```

Launch the transparent wallet and the funding wallet the same way, each with its
own data directory. A funding wallet that already exists restores from its seed
through the `ZINGO_SEED` environment variable and the `--birthday` option.

These commands of the interactive session author and read the history.

| Command                              | What it does                                                       |
| ------------------------------------ | ------------------------------------------------------------------ |
| `network status`                     | Reports the mixnet indicator. Wait for `ready` before a send.      |
| `recovery_info`                      | Prints the seed phrase, the birthday, and the account count.       |
| `addresses`                          | Lists the unified addresses. Index 0 has an Orchard receiver.      |
| `new_address z`                      | Creates a unified address with only a Sapling receiver.            |
| `t_addresses`                        | Lists the transparent addresses.                                   |
| `send <address> <zatoshis> "<memo>"` | Proposes a transfer and shows the fee. The memo is optional.       |
| `shield`                             | Proposes a shield of the transparent funds into the Ironwood pool. |
| `confirm`                            | Builds and transmits the latest proposal, then resumes the sync.   |
| `balance`                            | Prints the balance of each pool.                                   |
| `spendable_balance`                  | Prints the spendable balance.                                      |
| `value_transfers`                    | Lists the value transfers, oldest first.                           |
| `quit`                               | Saves the wallet and ends the session.                             |

The `help` command lists every command, and `help <command>` describes one. The
commands are defined in `zingolib/zingo-cli/src/commands.rs`, and the session
options in `build_clap_app` of `zingolib/zingo-cli/src/lib.rs`.

The app can also author the history (verify). Mixnet Mode is always on in the
app. The header shows the indicator (`header.mixnet-status`), and the NYM
Mixnet row of Settings (`settings.mixnet`) opens the Mixnet Doctor. In
Settings, the Network row (`settings.server-chain`) selects testnet, and the
Custom row (`settings.custom-server`, `settings.custom-server-field`) takes
`https://testnet.zec.rocks:443`. The Save button is `settings.button.save`.

## Funding

The funding wallet receives testnet coins from a testnet faucet:
`<TESTNET_FAUCET_URL: the maintainer supplies it>`. Neither this repository nor
the zingolib submodule names a faucet.

The funding wallet sends 1,750,000 zatoshis in steps 1, 4, 5, and 10, plus four
fees. The shared wallet pays the fees of steps 2, 3, 6, 7, 8, and 9 from its own
receipts. The regtest scenarios paid between 10,000 and 20,000 zatoshis per
transaction. Request at least 0.02 TAZ for the funding wallet. Request 0.03 TAZ
when the faucet allows it, which leaves room to repeat a failed step.

## Authoring the shared wallet

1. Launch a session for the shared wallet with a new data directory, and wait
   for `network status` to report `ready`.
2. Run `addresses`, `new_address z`, and `t_addresses`. Keep the unified
   address at index 0, the new Sapling address, and the transparent address at
   index 0.
3. In the funding wallet session, send step 1 and confirm it.

   ```text
   send <shared unified address> 1000000
   confirm
   ```

4. In the shared wallet session, wait for step 1 to confirm and become
   spendable. Then send step 2 to the funding wallet's unified address, and
   step 3 to the shared wallet's own Sapling address.

   ```text
   send <funding unified address> 100000
   confirm
   send <shared Sapling address> 100000 "note-to-self test memo"
   confirm
   ```

5. From the funding wallet, send step 4 to the shared Sapling address and step
   5 to the shared transparent address.
6. From the shared wallet, send steps 6, 7, and 8 to its own unified, Sapling,
   and transparent addresses, 100,000 zatoshis each.
7. When step 8 has confirmed, run `shield` and then `confirm`.

Wait for each transaction to confirm before the next one.

## Authoring the transparent wallet

Launch a session for the transparent wallet with a new data directory. Run
`t_addresses`, and send step 10 from the funding wallet to the transparent
address at index 0. Never shield or spend from this wallet. The note must exceed
the shield fee for the app to offer the shield, and 250,000 zatoshis does.

## Recording

Record these values after the last step has confirmed and a fresh sync from the
birthday has finished.

- The seed phrase, from `recovery_info`.
- The birthday. For a new seed, it is the height of the block that holds step
  1, the `blockheight` of the oldest entry of `value_transfers`. The `birthday`
  command of a new wallet prints its creation height, which is lower.
- The testnet server, `https://testnet.zec.rocks:443`.
- The txid of each step.
- The value transfers as the Binding Layer reports them.
- The total and confirmed balances of the Ironwood, Orchard, Sapling, and
  transparent pools.
- The recipient address of step 2, which the value-transfer test checks.

The CLI lists value transfers oldest first (`value_transfers` in
`zingolib/zingo-cli/src/commands.rs`). The Binding Layer lists them newest
first and adds the migrated value to an Orchard to Ironwood migration
(`get_value_transfers` in `zingolib/zingo-ffi/lib/src/lib.rs`). Take the test
constants from the JSON that a device run of the fixture test prints, and check
them against the CLI.

For the transparent wallet, record the seed phrase, the birthday, the
transparent address, and the value of the note.

The constants of the shared wallet live in one Kotlin object, `TestnetFixture`,
in `android/app/src/androidTest/java/org/ZingoLabs/Zingo/RustFFITest.kt` beside
`Seeds` and `MainnetServers`. Its Swift twin, `enum TestnetFixture`, lives in
`ios/ZingoTests/ZingoTest.swift` beside `enum Seeds`. Each holds the seed, the
birthday, the server, and the expected values. A refresh edits one object on
each platform. The constants of the transparent wallet live in the shield-offer
flow (#1493). The Kotlin object exists. The Swift twin follows with #1497.

## Refreshing

A test syncs from the birthday to the tip, and that range grows by about 5,300
blocks each day. Testnet mined 53,390 blocks in the ten days before 2026-10-02,
one block every 16 seconds. Read the tip from the server with `grpcurl`.

```bash
# Ask the testnet indexer for its chain tip.
grpcurl -max-time 20 \
  testnet.zec.rocks:443 \
  cash.z.wallet.sdk.rpc.CompactTxStreamer/GetLightdInfo
```

On 2026-10-02 the server reported a `blockHeight` of `4430915`. The shared
wallet's birthday 4,378,218 passes a budget of 100,000 blocks at height
4,478,218, about nine days later.

Refresh the fixture wallets in these cases.

- The range from the birthday to the tip passes the budget. The budget is
  100,000 blocks for now, about 19 days. On 2026-10-02 the CI emulator synced
  the shared wallet over 53,500 blocks in under 90 seconds, inside a deadline of
  5 minutes, and a later run sets the final number.
- A deposit or a sweep breaks a fixture test.

A wallet that starts from `GloryGoddess` keeps its seed and its birthday. When
its range passes the budget, the refresh moves the shared fixture wallet to a
new seed with the history below.

A refresh repeats this procedure with a new seed and the same history. One pull
request replaces the values in `TestnetFixture` on both platforms and in the
shield-offer flow. After it merges, the maintainer can send what remains in the
old wallets back to the funding wallet.

A refund to the old seed adds a receipt at the top of the value-transfer list
and changes the pool balances. The pool-balance test then fails, and the sync
range keeps its old start. A refresh needs a new seed.

## Published seeds

Both seeds are public in this repository. Anyone can send coins to a fixture
address or sweep a fixture wallet.

A deposit into the shared wallet breaks the pool-balance test, which checks
exact values. The refusal test checks a minimum and passes. A sweep of the
shared wallet breaks the refusal test, the funded sync check, and the
pool-balance test. A shield or a spend of the transparent note breaks the
shield-offer flow. The remedy for each case is a refresh.

The `GloryGoddess` seed is also public, in zingolib. Its history changes each
time someone runs zingolib's networked testnet tests. A test that reads it
checks a minimum balance, a found note, or the oldest entries.

## Checklist

1. The maintainer reads the testnet tip and decides that a refresh is due.
2. The maintainer decides whether the shared fixture wallet starts from
   `GloryGoddess`, and whether the pool-balance test reads its own wallet or a
   relaxed check.
3. The maintainer launches zingo-cli on testnet with `makers run-cli` and
   waits for `network status` to report `ready`.
4. The maintainer funds the funding wallet from a testnet faucet with at least
   0.02 TAZ.
5. The maintainer creates each wallet that needs a new seed in a new data
   directory.
6. The maintainer sends the steps of the history that the chosen path needs,
   in order, and waits for each step to confirm.
7. The maintainer syncs each fixture wallet from its birthday and records the
   values listed under Recording.
8. The maintainer updates `TestnetFixture` in Kotlin and Swift and the
   shield-offer flow in one pull request.
9. The maintainer checks that the fixture tests pass in CI on that pull
   request.
