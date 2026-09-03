package org.ZingoLabs.Zingo

import org.junit.Assert.assertEquals
import org.junit.Test
import uniffi.zingo.ZingolibException

/**
 * The bridge-outcome contract for every migrated FFI
 * (zingo-mobile#1151): whether a call succeeded is knowable from the
 * channel of its result — Resolved versus Rejected — never from its
 * content. The rejection code is the ZingolibError variant name, read
 * off the thrown exception's subclass; the message crosses verbatim,
 * and the call name rides the outcome only for diagnostics. One case
 * per FFI, exercising a typed
 * exception family the Rust side throws for it and pinning the code
 * that family must reject under.
 */
class FfiOutcomeTest {
    private val ffiFailures: Map<String, Pair<Exception, String>> = mapOf(
        "init_new" to (ZingolibException.Init("boom") to "Init"),
        "init_from_seed" to (ZingolibException.Init("boom") to "Init"),
        "init_from_ufvk" to (ZingolibException.Init("boom") to "Init"),
        "load_wallet_file" to (ZingolibException.Init("boom") to "Init"),
        "run_sync" to (ZingolibException.Sync("boom") to "Sync"),
        "pause_sync" to (ZingolibException.Sync("boom") to "Sync"),
        "status_sync" to (ZingolibException.Sync("boom") to "Sync"),
        "poll_sync" to (ZingolibException.Sync("boom") to "Sync"),
        "run_rescan" to (ZingolibException.Rescan("boom") to "Rescan"),
        // The read getters' Rust sides are prose-free; their one typed
        // failure family is the uninitialized client.
        "get_latest_block_wallet" to (ZingolibException.LightclientNotInitialized("boom") to "LightclientNotInitialized"),
        "get_version" to (ZingolibException.LightclientNotInitialized("boom") to "LightclientNotInitialized"),
        "get_unified_addresses" to (ZingolibException.LightclientNotInitialized("boom") to "LightclientNotInitialized"),
        "get_transparent_addresses" to (ZingolibException.LightclientNotInitialized("boom") to "LightclientNotInitialized"),
        "get_wallet_save_required" to (ZingolibException.LightclientNotInitialized("boom") to "LightclientNotInitialized"),
        "get_config_wallet_performance" to (ZingolibException.LightclientNotInitialized("boom") to "LightclientNotInitialized"),
        "get_wallet_version" to (ZingolibException.LightclientNotInitialized("boom") to "LightclientNotInitialized"),
        "get_developer_donation_address" to (ZingolibException.LightclientNotInitialized("boom") to "LightclientNotInitialized"),
        "get_zennies_for_zingo_donation_address" to (ZingolibException.LightclientNotInitialized("boom") to "LightclientNotInitialized"),
        // The save shells resolve their helpers' contained boolean; what
        // rejects is an escaping exception, FFI-typed or platform I/O —
        // the latter is outside the typed family, hence "Unknown".
        "save_wallet_file" to (ZingolibException.Save("boom") to "Save"),
        "save_wallet_backup" to (java.io.IOException("boom") to "Unknown"),
        // The wallet-read getters whose domain failures are the typed
        // Read variant.
        "get_balance" to (ZingolibException.Read("boom") to "Read"),
        "get_spendable_balance_total" to (ZingolibException.Read("boom") to "Read"),
        "get_value_transfers" to (ZingolibException.Read("boom") to "Read"),
        "get_messages" to (ZingolibException.Read("boom") to "Read"),
        "get_latest_block_server" to (ZingolibException.Read("boom") to "Read"),
        "get_seed" to (ZingolibException.Read("boom") to "Read"),
        "get_ufvk" to (ZingolibException.Read("boom") to "Read"),
        "wallet_kind" to (ZingolibException.Read("boom") to "Read"),
        "get_total_memobytes_to_address" to (ZingolibException.Read("boom") to "Read"),
        "get_total_value_to_address" to (ZingolibException.Read("boom") to "Read"),
        "get_total_spends_to_address" to (ZingolibException.Read("boom") to "Read"),
        "get_spendable_balance_with_address" to (ZingolibException.Read("boom") to "Read"),
        "get_option_wallet" to (ZingolibException.Read("boom") to "Read"),
        "set_crypto_default_provider_to_ring" to (ZingolibException.Panic("boom") to "Panic"),
        // Server-facing calls fail as the Indexer variant.
        "info_server" to (ZingolibException.Indexer("boom") to "Indexer"),
        "change_server" to (ZingolibException.Indexer("boom") to "Indexer"),
        "zec_price" to (ZingolibException.Indexer("boom") to "Indexer"),
        // Argument-validation failures are the InvalidInput variant.
        "parse_address" to (ZingolibException.InvalidInput("boom") to "InvalidInput"),
        "parse_ufvk" to (ZingolibException.InvalidInput("boom") to "InvalidInput"),
        "check_my_address" to (ZingolibException.InvalidInput("boom") to "InvalidInput"),
        "remove_transaction" to (ZingolibException.Wallet("boom") to "Wallet"),
        "set_option_wallet" to (ZingolibException.Wallet("boom") to "Wallet"),
        "create_new_unified_address" to (ZingolibException.Wallet("boom") to "Wallet"),
        "create_new_transparent_address" to (ZingolibException.Wallet("boom") to "Wallet"),
        "set_config_wallet_to_prod" to (ZingolibException.Wallet("boom") to "Wallet"),
        "send" to (ZingolibException.Send("boom") to "Send"),
        "confirm" to (ZingolibException.Send("boom") to "Send"),
        "shield" to (ZingolibException.Shield("boom") to "Shield"),
        "plan_orchard_drain" to (ZingolibException.Shield("boom") to "Shield"),
        "drain_orchard_to_ironwood" to (ZingolibException.Shield("boom") to "Shield"),
        // The side-channel polls map a poisoned progress lock to the
        // SideChannelPoisoned variant, never the lightclient lock's.
        "drain_status" to (ZingolibException.SideChannelPoisoned("boom") to "SideChannelPoisoned"),
        "execute_due_parts_status" to (ZingolibException.SideChannelPoisoned("boom") to "SideChannelPoisoned"),
        // The ZIP-318 migration family, one variant per call.
        "plan_ironwood_migration" to (ZingolibException.Migration("boom") to "Migration"),
        "start_ironwood_migration" to (ZingolibException.MigrationConsentStale("boom") to "MigrationConsentStale"),
        "continue_note_splitting" to (ZingolibException.MigrationSplit("boom") to "MigrationSplit"),
        "reschedule_parts" to (ZingolibException.MigrationCadenceFixed("boom") to "MigrationCadenceFixed"),
        "migration_status" to (ZingolibException.MigrationNotInProgress("boom") to "MigrationNotInProgress"),
        "reconcile_migration" to (ZingolibException.MigrationAlreadyInProgress("boom") to "MigrationAlreadyInProgress"),
        "execute_due_parts" to (ZingolibException.Offline("boom") to "Offline"),
        "cancel_ironwood_migration" to (ZingolibException.MigrationNotInProgress("boom") to "MigrationNotInProgress"),
    )

    @Test
    fun resolvedValuesPassThroughUnclassified() {
        // The value deliberately wears the historical error sentinel:
        // classification must be by channel, never by content.
        val proseLikeData = "Error: looks like prose but is legitimate data"

        for ((call, _) in ffiFailures) {
            assertEquals(
                "FFI $call must resolve its value verbatim",
                FfiOutcome.Resolved(proseLikeData),
                FfiOutcome.of(call) { proseLikeData },
            )
        }
    }

    @Test
    fun thrownFfiErrorsRejectUnderTheirVariantName() {
        for ((call, case) in ffiFailures) {
            val (failure, code) = case
            assertEquals(
                "FFI $call must reject under the thrown variant's name",
                FfiOutcome.Rejected(code, call, failure),
                FfiOutcome.of(call) { throw failure },
            )
        }
    }

    @Test
    fun migrationVariantRejectsUnderItsVariantName() {
        val failure = ZingolibException.MigrationConsentStale("plan hash moved")
        assertEquals(
            FfiOutcome.Rejected("MigrationConsentStale", "start_ironwood_migration", failure),
            FfiOutcome.of("start_ironwood_migration") { throw failure },
        )
    }

    @Test
    fun lockPoisonedRejectsUnderItsVariantName() {
        // Completes the 21/21 variant matrix: the one code the table above
        // does not carry, thrown by any lightclient call whose lock a
        // panicking thread poisoned.
        val failure = ZingolibException.LightclientLockPoisoned("boom")
        assertEquals(
            FfiOutcome.Rejected("LightclientLockPoisoned", "get_balance", failure),
            FfiOutcome.of("get_balance") { throw failure },
        )
    }

    @Test
    fun unknownThrowableRejectsAsUnknown() {
        // The derivation is total: anything outside the typed FFI family
        // crosses under "Unknown", never under a class name of its own.
        val failure = IllegalStateException("not from the FFI")
        assertEquals(
            FfiOutcome.Rejected("Unknown", "get_version", failure),
            FfiOutcome.of("get_version") { throw failure },
        )
    }
}
