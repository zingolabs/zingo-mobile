package org.ZingoLabs.Zingo

import androidx.test.platform.app.InstrumentationRegistry
import com.google.common.truth.Truth.assertThat
import org.junit.Assume.assumeTrue
import org.junit.Test
import org.junit.experimental.categories.Category
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.DeserializationFeature
import com.fasterxml.jackson.core.type.TypeReference

// Standard ObjectMapper with no Kotlin module — avoids kotlin-reflect dependency
// that breaks under R8 in the release test APK. Data classes use var+defaults so
// Jackson can use the no-arg constructor + setter injection.
fun testMapper(): ObjectMapper = ObjectMapper()
    .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)

/** The server URI of an offline wallet, which names no server. */
const val OFFLINE_SERVER_URI = ""

/** The chain hint of an offline wallet, which selects regtest parameters and launches no chain. */
const val OFFLINE_CHAIN_HINT = "regtest"

/** The zingo-mobile part of a build descriptor that received no descriptor from the build. */
const val UNDESCRIBED_BUILD = "zm_unknown"

/** Creates an offline wallet from [seed] and returns what the Binding Layer reports of it. */
fun initOfflineWalletFromSeed(mapper: ObjectMapper, seed: String): InitFromSeed {
    val initFromSeedJson: String =
        uniffi.zingo.initFromSeed(seed, 1u, OFFLINE_SERVER_URI, OFFLINE_CHAIN_HINT, "Medium", 1u)
    println("\nInit from seed:")
    println(initFromSeedJson)
    val initFromSeed: InitFromSeed = mapper.readValue(initFromSeedJson)
    assertThat(initFromSeed.seed_phrase).isEqualTo(seed)
    return initFromSeed
}

inline fun <reified T> ObjectMapper.readValue(src: String): T =
    readValue(src, object : TypeReference<T>() {})

/** Returns the mixnet refusal [attempt] raises, and fails the test if it answers instead. */
fun <T> refusedWithoutMixnet(what: String, attempt: () -> T): String? =
    try {
        val answered = attempt()
        throw AssertionError("the $what answered without a mixnet: $answered")
    } catch (e: uniffi.zingo.ZingolibException.Mixnet) {
        e.message
    }

object Seeds {
    const val HOSPITAL = "hospital museum valve antique skate museum unfold vocal weird milk scale social vessel identify crowd hospital control album rib bulb path oven civil tank"
}

object MainnetServers {
    const val PRIMARY = "https://zec.rocks:443"
    const val FALLBACK = "https://na.zec.rocks:443"
}

/** The shared testnet fixture wallet, which is zingolib's GloryGoddess example wallet. */
object TestnetFixture {
    const val SEED = "glory goddess cargo action guilt ball coral employ phone baby oxygen flavor solid climb situate frequent blade pet enough milk access try swift benefit"
    const val BIRTHDAY = 4_431_500L
    val SERVERS = listOf("https://testnet.zec.rocks:443", "https://zaino.testnet.unsafe.zec.rocks:443")
    const val CHAIN_HINT = "test"
    const val UNIFIED_ADDRESS = "utest1dmu08vg5wt5m9w0ejwgeqdndzzkfka7c94heuz5llxv5vx4lhcethmm6p5ean3wcj8l0m6tf8k8cau9r636gq7sxq3wa6zey2sysfteh"
    const val TRANSPARENT_ADDRESS = "tmF7QpuKsLF7nsMvThu4wQBpiKVGJXGCSJF"

    const val CONSOLIDATION_TXID = "256fc8dcb3dd730439157301a027f7b243d69aa30e31fc7a9b619e726321d19f"
    const val CONSOLIDATION_HEIGHT = 4_431_582L
    const val CONSOLIDATION_KIND = "memo-to-self"
    const val CONSOLIDATION_VALUE = 3_995_811_890L
    const val CONSOLIDATION_FEE = 285_000L

    const val DEADLINE_SECONDS = 5 * 60
    const val TIP_SKEW_BLOCKS = 10L
}

/** The testnet fixture wallet that nobody spends from, whose pool balances the pool-balance test checks exactly. */
object PoolBalanceFixture {
    const val SEED = "away win exhibit affair resource basic film radio bomb bone protect gentle logic pelican wreck air buyer nominee baby raw panic witness hair cream"
    const val BIRTHDAY = 4_431_742L
    const val UNIFIED_ADDRESS = "utest1d3awxkkpft8c2arx6g443wp97uhvh7uyuk58ghk35tnlx37fdg8mtwf2l7shtaacrj6gnhhxr647uq2yzwtszwn22z8xlghmwv4dzfyu"
    const val TRANSPARENT_ADDRESS = "tmVqqboEGhqUDoVnDRk1vVumKPrieJz6btY"

    const val IRONWOOD_BALANCE = 1_210_000L
    const val ORCHARD_BALANCE = 0L
    const val SAPLING_BALANCE = 115_000L
    const val TRANSPARENT_BALANCE = 0L

    const val RECEIPT_TXID = "5875d2ef17dcd8010e09e63942c901478fdfa93e5e5883f4c01b96cfda9bf669"
    const val SHIELD_TXID = "40c75700d939ed5b0ee7e2b65bbb55dbd632689cb070171fa0d8be88b037c7cc"
    const val SHIELD_HEIGHT = 4_432_065L
    const val VALUE_TRANSFER_COUNT = 9
}

/** Skips the test while the fixture names no consolidation transaction. */
fun assumeConsolidationPublished() =
    assumeTrue(
        "TestnetFixture names no consolidation transaction yet",
        TestnetFixture.CONSOLIDATION_TXID.isNotEmpty(),
    )

/** Returns the first of [servers] that reports its tip, paired with that tip, and fails with every refusal when no [chain] server answers. */
fun firstAnsweringServer(chain: String, servers: List<String>): Pair<String, Long> {
    val refusals = mutableMapOf<String, Exception>()
    val answer = servers.firstNotNullOfOrNull { uri ->
        try {
            uri to uniffi.zingo.getLatestBlockServer(uri).toLong()
        } catch (e: Exception) {
            refusals[uri] = e
            null
        }
    } ?: throw AssertionError("no $chain server answered: $refusals", refusals.values.last())
    println("\nTip of ${answer.first}: ${answer.second}")
    return answer
}

/** Returns the sync status of the open wallet, or the reason it is unavailable. */
fun syncStatusOrReason(): String =
    runCatching { uniffi.zingo.statusSync() }
        .getOrElse { "status unavailable: ${it.message}" }

/** Launches a sync of [what] and polls it each second to completion, failing with the elapsed time and the sync status at the deadline or on a sync error. */
fun syncToCompletion(what: String, deadlineSeconds: Int, elapsedSeconds: () -> Double) {
    val syncJson: String = uniffi.zingo.runSync()
    println("\nSync:")
    println(syncJson)

    val syncStart = System.nanoTime()
    try {
        while (!uniffi.zingo.pollSync().contains("sync_complete")) {
            if (elapsedSeconds() > deadlineSeconds) {
                throw AssertionError("the test passed its $deadlineSeconds s deadline after ${elapsedSeconds()} s while syncing $what: ${syncStatusOrReason()}")
            }
            Thread.sleep(1000)
        }
    } catch (e: uniffi.zingo.ZingolibException) {
        throw AssertionError("the sync of $what failed after ${elapsedSeconds()} s: ${e.message}: ${syncStatusOrReason()}", e)
    }
    println("\nSynced $what in ${(System.nanoTime() - syncStart) / 1e9} s")
}

/** Syncs every 20 seconds until the spendable shielded balance reaches [minimum], failing at the deadline with the balance the wallet holds. */
fun syncUntilSpendable(mapper: ObjectMapper, minimum: Long, deadlineSeconds: Int, elapsedSeconds: () -> Double) {
    while (true) {
        val spendable: SpendableBalance = mapper.readValue(uniffi.zingo.getSpendableBalanceTotal())
        if (spendable.spendable_balance >= minimum) {
            return
        }
        if (elapsedSeconds() > deadlineSeconds) {
            throw AssertionError("the fixture wallet held ${spendable.spendable_balance} spendable zatoshis of the $minimum the test needs at its $deadlineSeconds s deadline: ${uniffi.zingo.getBalance()}")
        }
        Thread.sleep(20_000)
        syncToCompletion("the blocks mined while a spend from the published seed confirms", deadlineSeconds, elapsedSeconds)
    }
}

object Ufvk {
    const val HOSPITAL = "uviewregtest1zd5hsn447739jr5pk879pn06wan8gewam949xjqvwgfc7zec29x2ezqyeq6vmtwkcmn0kkfl447caqsccg582dp50ax972dfm4eh5f4mqj730fgr7hygvjeqxlgpwynrmcu57fjjqlns95chfjfq4xg7v977x603un9fuw73zvn2t32pfcfewrh67tzv04wstjg0yx4r3lpmpaea9nsyll6juu9jtyc0fstdwde06l4tvzlerytyutfd3yptq5r5csfck9c5ks8rzaj5r9tgltarejfdxu8h79sxmc6knxtnglp0pa7y3kw708rueg984ty6lhyrlzmk2swyqqfe0q2nmzhcxme9rsvprcw50ms463twx4suldhm0p94lem8ryan4e4y8fpp8grr5kmlygm70h2zhl0d7mfra5qs78jq9wqctvk8fhdu9cv78q00v7qzl9w50j242xr0945pmsu2vrh6jcvq8fxad420m8kxpd3cgyd6wxy6"
}

data class InitFromSeed (
    var seed_phrase : String = "",
    var birthday : Long = 0L,
    var no_of_accounts: Long = 0L
)

data class InitFromUfvk (
    var ufvk : String = "",
    var birthday : Long = 0L
)

data class ExportUfvk (
    var ufvk : String = "",
    var birthday : Long = 0L
)

data class UnifiedAddress (
    var account : Long? = null,
    var address_index : Long? = null,
    var has_orchard : Boolean? = null,
    var has_sapling : Boolean? = null,
    var has_transparent : Boolean? = null,
    var encoded_address : String? = null,
    var error : String? = null
)

data class TransparentAddress (
    var account : Long? = null,
    var address_index : Long? = null,
    var scope : String? = null,
    var encoded_address : String? = null,
    var error : String? = null
)

data class Info (
    var version : String = "",
    var git_commit : String = "",
    var server_uri : String = "",
    var vendor : String = "",
    var taddr_support : Boolean = false,
    var chain_name : String = "",
    var sapling_activation_height : Long = 0L,
    var consensus_branch_id : String = "",
    var latest_block_height : Long = 0L
)

data class Height (
    var height : Long = 0L
)

data class ScanRanges (
    var priority : String = "",
    var start_block : String = "",
    var end_block : String = ""
)

data class SyncStatus (
    var scan_ranges : List<ScanRanges> = emptyList(),
    var sync_start_height : Long = 0L,
    var session_blocks_scanned : Long = 0L,
    var total_blocks_scanned : Long = 0L,
    var percentage_session_blocks_scanned : Double = 0.0,
    var percentage_total_blocks_scanned : Double = 0.0,
    var session_sapling_outputs_scanned : Long = 0L,
    var total_sapling_outputs_scanned : Long = 0L,
    var session_orchard_outputs_scanned : Long = 0L,
    var total_orchard_outputs_scanned : Long = 0L,
    var session_ironwood_outputs_scanned : Long = 0L,
    var total_ironwood_outputs_scanned : Long = 0L,
    var percentage_session_outputs_scanned : Double = 0.0,
    var percentage_total_outputs_scanned : Double = 0.0,
    var total_outputs_scanned : Long = 0L,
    var total_outputs : Long = 0L
)

data class Balance (
    var total_ironwood_balance : Long = 0L,
    var confirmed_ironwood_balance : Long = 0L,
    var unconfirmed_ironwood_balance : Long = 0L,
    var total_sapling_balance : Long = 0L,
    var confirmed_sapling_balance : Long = 0L,
    var unconfirmed_sapling_balance : Long = 0L,
    var total_orchard_balance : Long = 0L,
    var confirmed_orchard_balance : Long = 0L,
    var unconfirmed_orchard_balance : Long = 0L,
    var total_transparent_balance : Long = 0L,
    var confirmed_transparent_balance : Long = 0L,
    var unconfirmed_transparent_balance : Long = 0L
)

data class SpendableBalance (
    var spendable_balance : Long = 0L
)

data class Send (
    var address : String = "",
    var amount : Long = 0L,
    var memo : String? = null
)

data class ValueTransfer (
    var txid : String = "",
    var datetime : Long = 0L,
    var status: String = "",
    var blockheight : Long = 0L,
    var transaction_fee : Long? = null,
    var zec_price : Long? = null,
    var kind : String = "",
    var value : Long = 0L,
    var recipient_address : String? = null,
    var pools_sent_from : List<String>? = null,
    var pools_received : List<String>? = null,
    var memos : List<String>? = null,
)

data class ValueTransfers (
    var value_transfers : List<ValueTransfer> = emptyList(),
    var total : Long = 0L,
)

data class ParseResult (
    var status: String = "",
    var chain_name: String? = null,
    var address_kind: String? = null
)

val context = MainApplication.getAppContext()!!

@OfflineDeviceTest
class ExecuteAddressesFromSeed {
    @Test
    fun executeAddressesFromSeed() {
        val mapper = testMapper()

        val seed = Seeds.HOSPITAL

        val initFromSeed: InitFromSeed = initOfflineWalletFromSeed(mapper, seed)
        assertThat(initFromSeed.birthday).isEqualTo(1)

        val exportUfvkJson: String = uniffi.zingo.getUfvk()
        println("\nExport Ufvk:")
        println(exportUfvkJson)

        val addressesJson: String = uniffi.zingo.getUnifiedAddresses()
        println("\nAddresses:")
        println(addressesJson)
        val addresses: List<UnifiedAddress> = mapper.readValue(addressesJson)
        assertThat(addresses[0].encoded_address).isEqualTo("uregtest1ue949txhf9t2z6ldg8wc6s5t439t2hu55yh9l58gc23cmxthths836nxtpyvhpkrftsp2jnnp9eadtqy2nefxn04eyxeu8l0x5kk8ct9")
        assertThat(addresses[0].has_orchard).isEqualTo(true)
        assertThat(addresses[0].has_sapling).isEqualTo(false)
        assertThat(addresses[0].has_transparent).isEqualTo(false)

        val taddressesJson: String = uniffi.zingo.getTransparentAddresses()
        println("\nT Addresses:")
        println(taddressesJson)
        val taddresses: List<TransparentAddress> = mapper.readValue(taddressesJson)
        assertThat(taddresses[0].encoded_address).isEqualTo("tmFLszfkjgim4zoUMAXpuohnFBAKy99rr2i")
        assertThat(taddresses[0].scope).isEqualTo("external")
    }
}

@OfflineDeviceTest
class ExecuteAddressesFromUfvk {
    @Test
    fun executeAddressFromUfvk() {
        val mapper = testMapper()

        val ufvk = Ufvk.HOSPITAL

        val initFromUfvkJson: String = uniffi.zingo.initFromUfvk(ufvk, 1u, OFFLINE_SERVER_URI, OFFLINE_CHAIN_HINT, "Medium", 1u)
        println("\nInit From UFVK:")
        println(initFromUfvkJson)
        val initFromUfvk: InitFromUfvk = mapper.readValue(initFromUfvkJson)

        assertThat(initFromUfvk.ufvk).isEqualTo(ufvk)
        assertThat(initFromUfvk.birthday).isEqualTo(1)

        val exportUfvkJson: String = uniffi.zingo.getUfvk()
        println("\nExport Ufvk:")
        println(exportUfvkJson)
        val exportUfvk: ExportUfvk = mapper.readValue(exportUfvkJson)
        assertThat(exportUfvk.ufvk).isEqualTo(ufvk)
        assertThat(exportUfvk.birthday).isEqualTo(1)

        val addressesJson: String = uniffi.zingo.getUnifiedAddresses()
        println("\nAddresses:")
        println(addressesJson)
        val addresses: List<UnifiedAddress> = mapper.readValue(addressesJson)
        assertThat(addresses[0].encoded_address).isEqualTo("uregtest1ue949txhf9t2z6ldg8wc6s5t439t2hu55yh9l58gc23cmxthths836nxtpyvhpkrftsp2jnnp9eadtqy2nefxn04eyxeu8l0x5kk8ct9")
        assertThat(addresses[0].has_orchard).isEqualTo(true)
        assertThat(addresses[0].has_sapling).isEqualTo(false)
        assertThat(addresses[0].has_transparent).isEqualTo(false)

        val taddressesJson: String = uniffi.zingo.getTransparentAddresses()
        println("\nT Addresses:")
        println(taddressesJson)
        val taddresses: List<TransparentAddress> = mapper.readValue(taddressesJson)
        assertThat(taddresses[0].encoded_address).isEqualTo("tmFLszfkjgim4zoUMAXpuohnFBAKy99rr2i")
        assertThat(taddresses[0].scope).isEqualTo("external")
    }    
}

@OfflineDeviceTest
class BuildDescriptorTest {
    @Test
    fun buildDescriptorNamesBothRepositories() {
        val zingolib: String = uniffi.zingo.getVersion()
        val mobile: String = InstrumentationRegistry.getInstrumentation()
            .targetContext.getString(R.string.zm_descriptor)
        println("\nBuild descriptor:")
        println("$zingolib-$mobile")
        val part = """[0-9A-Za-z.+-]+(_[0-9a-f]{5})?(_dirty)?"""
        assertThat(zingolib).matches("zl_$part")
        assertThat(mobile).matches("zm_$part")
        assertThat(mobile).isNotEqualTo(UNDESCRIBED_BUILD)
    }
}

@PublicChainTest
class ExecuteSyncFromSeed {
    @Test
    fun executeSyncFromSeed() {
        val mapper = testMapper()

        val window = 10_000L
        val deadlineSeconds = 5 * 60
        val tipSkewBlocks = 1L
        val seed = Seeds.HOSPITAL
        val servers = listOf(MainnetServers.PRIMARY, MainnetServers.FALLBACK)
        val start = System.nanoTime()
        val elapsedSeconds = { (System.nanoTime() - start) / 1e9 }

        val (serveruri, tip) = firstAnsweringServer("mainnet", servers)

        val birthday = tip - window
        val initFromSeedJson: String = uniffi.zingo.initFromSeed(seed, birthday.toUInt(), serveruri, "main", "Medium", 1u)
        println("\nInit from seed:")
        println(initFromSeedJson)
        val initFromSeed: InitFromSeed = mapper.readValue(initFromSeedJson)

        assertThat(initFromSeed.seed_phrase).isEqualTo(seed)
        assertThat(initFromSeed.birthday).isEqualTo(birthday)

        val infoJson: String = uniffi.zingo.infoServer()
        println("\nInfo:")
        println(infoJson)
        val info: Info = mapper.readValue(infoJson)
        assertThat(info.latest_block_height).isAtLeast(tip - tipSkewBlocks)

        var heightJson: String = uniffi.zingo.getLatestBlockWallet()
        println("\nHeight pre-sync:")
        println(heightJson)
        val heightPreSync: Height = mapper.readValue(heightJson)
        assertThat(heightPreSync.height).isEqualTo(0)

        syncToCompletion("$window mainnet blocks", deadlineSeconds, elapsedSeconds)

        heightJson = uniffi.zingo.getLatestBlockWallet()
        println("\nHeight post-sync:")
        println(heightJson)
        val heightPostSync: Height = mapper.readValue(heightJson)
        assertThat(heightPostSync.height).isAtLeast(info.latest_block_height)
    }
}

@PublicChainTest
class ConfirmRefusesWithoutMixnet {
    @Test
    fun confirmRefusesWithoutMixnet() {
        assumeConsolidationPublished()
        val mapper = testMapper()

        val amount = 100_000L
        val fee = 20_000L
        val start = System.nanoTime()
        val elapsedSeconds = { (System.nanoTime() - start) / 1e9 }

        val (serveruri, tip) = firstAnsweringServer("testnet", TestnetFixture.SERVERS)

        val initFromSeedJson: String = uniffi.zingo.initFromSeed(TestnetFixture.SEED, TestnetFixture.BIRTHDAY.toUInt(), serveruri, TestnetFixture.CHAIN_HINT, "Medium", 1u)
        println("\nInit from seed:")
        println(initFromSeedJson)
        val initFromSeed: InitFromSeed = mapper.readValue(initFromSeedJson)

        assertThat(initFromSeed.seed_phrase).isEqualTo(TestnetFixture.SEED)
        assertThat(initFromSeed.birthday).isEqualTo(TestnetFixture.BIRTHDAY)

        val infoJson: String = uniffi.zingo.infoServer()
        println("\nInfo:")
        println(infoJson)
        val info: Info = mapper.readValue(infoJson)
        assertThat(info.latest_block_height).isAtLeast(tip - TestnetFixture.TIP_SKEW_BLOCKS)

        val addressesJson: String = uniffi.zingo.getUnifiedAddresses()
        println("\nAddresses:")
        println(addressesJson)
        val addresses: List<UnifiedAddress> = mapper.readValue(addressesJson)
        assertThat(addresses[0].encoded_address).isEqualTo(TestnetFixture.UNIFIED_ADDRESS)

        val taddressesJson: String = uniffi.zingo.getTransparentAddresses()
        println("\nT Addresses:")
        println(taddressesJson)
        val taddresses: List<TransparentAddress> = mapper.readValue(taddressesJson)
        assertThat(taddresses[0].encoded_address).isEqualTo(TestnetFixture.TRANSPARENT_ADDRESS)

        syncToCompletion("${tip - TestnetFixture.BIRTHDAY} testnet blocks", TestnetFixture.DEADLINE_SECONDS, elapsedSeconds)

        val heightJson: String = uniffi.zingo.getLatestBlockWallet()
        println("\nHeight post-sync:")
        println(heightJson)
        val heightPostSync: Height = mapper.readValue(heightJson)
        assertThat(heightPostSync.height).isAtLeast(tip - TestnetFixture.TIP_SKEW_BLOCKS)

        val valueTransfersJson: String = uniffi.zingo.getValueTransfers()
        val valueTransfers: ValueTransfers = mapper.readValue(valueTransfersJson)
        assertThat(valueTransfers.value_transfers.map { it.txid }).contains(TestnetFixture.CONSOLIDATION_TXID)

        syncUntilSpendable(mapper, amount + fee, TestnetFixture.DEADLINE_SECONDS, elapsedSeconds)

        var balanceJson: String = uniffi.zingo.getBalance()
        println("\nBalance pre-send:")
        println(balanceJson)
        val balancePreSend: Balance = mapper.readValue(balanceJson)

        val send = Send(TestnetFixture.TRANSPARENT_ADDRESS, amount, null)

        val proposeJson: String = uniffi.zingo.send(mapper.writeValueAsString(listOf(send)))
        println("\nPropose:")
        println(proposeJson)

        val refusal: String? = refusedWithoutMixnet("transmission") { uniffi.zingo.confirm() }
        println("\nTransmission refused without a mixnet:")
        println(refusal)
        assertThat(refusal).contains("the Nym mixnet is not enabled")

        val retry: String? = try {
            val txid = uniffi.zingo.confirm()
            throw AssertionError("a consumed proposal confirmed on retry: $txid")
        } catch (e: uniffi.zingo.ZingolibException.Send) {
            e.message
        }
        println("\nRetry after the refusal:")
        println(retry)

        syncToCompletion("the blocks mined since the first sync", TestnetFixture.DEADLINE_SECONDS, elapsedSeconds)

        balanceJson = uniffi.zingo.getBalance()
        println("\nBalance post-refusal:")
        println(balanceJson)
        val balancePostRefusal: Balance = mapper.readValue(balanceJson)
        assertThat(balancePostRefusal.confirmed_transparent_balance).isEqualTo(balancePreSend.confirmed_transparent_balance)
    }
}

@PublicChainTest
class RecoversConsolidationTransfer {
    @Test
    fun recoversConsolidationTransfer() {
        assumeConsolidationPublished()
        val mapper = testMapper()

        val start = System.nanoTime()
        val elapsedSeconds = { (System.nanoTime() - start) / 1e9 }

        val (serveruri, tip) = firstAnsweringServer("testnet", TestnetFixture.SERVERS)

        val initFromSeedJson: String = uniffi.zingo.initFromSeed(TestnetFixture.SEED, TestnetFixture.BIRTHDAY.toUInt(), serveruri, TestnetFixture.CHAIN_HINT, "Medium", 1u)
        println("\nInit from seed:")
        println(initFromSeedJson)
        val initFromSeed: InitFromSeed = mapper.readValue(initFromSeedJson)

        assertThat(initFromSeed.seed_phrase).isEqualTo(TestnetFixture.SEED)
        assertThat(initFromSeed.birthday).isEqualTo(TestnetFixture.BIRTHDAY)

        val infoJson: String = uniffi.zingo.infoServer()
        println("\nInfo:")
        println(infoJson)
        val info: Info = mapper.readValue(infoJson)
        assertThat(info.latest_block_height).isAtLeast(tip - TestnetFixture.TIP_SKEW_BLOCKS)

        syncToCompletion("${tip - TestnetFixture.BIRTHDAY} testnet blocks", TestnetFixture.DEADLINE_SECONDS, elapsedSeconds)

        val valueTransfersJson: String = uniffi.zingo.getValueTransfers()
        println("\nValue Transfers:")
        println(valueTransfersJson)
        val valueTransfers: ValueTransfers = mapper.readValue(valueTransfersJson)

        val consolidations = valueTransfers.value_transfers.filter {
            it.txid == TestnetFixture.CONSOLIDATION_TXID && it.kind == TestnetFixture.CONSOLIDATION_KIND
        }
        assertThat(consolidations).hasSize(1)
        val consolidation = consolidations[0]
        assertThat(consolidation.status).isEqualTo("confirmed")
        assertThat(consolidation.blockheight).isEqualTo(TestnetFixture.CONSOLIDATION_HEIGHT)
        assertThat(consolidation.value).isEqualTo(TestnetFixture.CONSOLIDATION_VALUE)
        assertThat(consolidation.transaction_fee).isEqualTo(TestnetFixture.CONSOLIDATION_FEE)
    }
}

@OfflineDeviceTest
class PriceRefusedWithoutMixnet {
    @Test
    fun priceRefusedWithoutMixnet() {
        val mapper = testMapper()

        initOfflineWalletFromSeed(mapper, Seeds.HOSPITAL)

        val refusal: String? = refusedWithoutMixnet("price fetch") { uniffi.zingo.zecPrice() }
        println("\nPrice refused without a mixnet:")
        println(refusal)
    }
}

@PublicChainTest
class RecoversPoolBalances {
    @Test
    fun recoversPoolBalances() {
        val mapper = testMapper()

        val start = System.nanoTime()
        val elapsedSeconds = { (System.nanoTime() - start) / 1e9 }

        val (serveruri, tip) = firstAnsweringServer("testnet", TestnetFixture.SERVERS)

        val initFromSeedJson: String = uniffi.zingo.initFromSeed(PoolBalanceFixture.SEED, PoolBalanceFixture.BIRTHDAY.toUInt(), serveruri, TestnetFixture.CHAIN_HINT, "Medium", 1u)
        println("\nInit from seed:")
        println(initFromSeedJson)
        val initFromSeed: InitFromSeed = mapper.readValue(initFromSeedJson)

        assertThat(initFromSeed.seed_phrase).isEqualTo(PoolBalanceFixture.SEED)
        assertThat(initFromSeed.birthday).isEqualTo(PoolBalanceFixture.BIRTHDAY)

        val infoJson: String = uniffi.zingo.infoServer()
        println("\nInfo:")
        println(infoJson)
        val info: Info = mapper.readValue(infoJson)
        assertThat(info.latest_block_height).isAtLeast(tip - TestnetFixture.TIP_SKEW_BLOCKS)

        val addressesJson: String = uniffi.zingo.getUnifiedAddresses()
        println("\nAddresses:")
        println(addressesJson)
        val addresses: List<UnifiedAddress> = mapper.readValue(addressesJson)
        assertThat(addresses[0].encoded_address).isEqualTo(PoolBalanceFixture.UNIFIED_ADDRESS)

        val taddressesJson: String = uniffi.zingo.getTransparentAddresses()
        println("\nT Addresses:")
        println(taddressesJson)
        val taddresses: List<TransparentAddress> = mapper.readValue(taddressesJson)
        assertThat(taddresses[0].encoded_address).isEqualTo(PoolBalanceFixture.TRANSPARENT_ADDRESS)

        syncToCompletion("${tip - PoolBalanceFixture.BIRTHDAY} testnet blocks", TestnetFixture.DEADLINE_SECONDS, elapsedSeconds)

        val heightJson: String = uniffi.zingo.getLatestBlockWallet()
        println("\nHeight post-sync:")
        println(heightJson)
        val heightPostSync: Height = mapper.readValue(heightJson)
        assertThat(heightPostSync.height).isAtLeast(tip - TestnetFixture.TIP_SKEW_BLOCKS)

        val valueTransfersJson: String = uniffi.zingo.getValueTransfers()
        println("\nValue Transfers:")
        println(valueTransfersJson)
        val valueTransfers: ValueTransfers = mapper.readValue(valueTransfersJson)
        assertThat(valueTransfers.value_transfers).hasSize(PoolBalanceFixture.VALUE_TRANSFER_COUNT)
        assertThat(valueTransfers.value_transfers.map { it.status }.toSet()).containsExactly("confirmed")
        assertThat(valueTransfers.value_transfers.last().txid).isEqualTo(PoolBalanceFixture.RECEIPT_TXID)
        val shield = valueTransfers.value_transfers.first()
        assertThat(shield.txid).isEqualTo(PoolBalanceFixture.SHIELD_TXID)
        assertThat(shield.kind).isEqualTo("shield")
        assertThat(shield.blockheight).isEqualTo(PoolBalanceFixture.SHIELD_HEIGHT)

        val balanceJson: String = uniffi.zingo.getBalance()
        println("\nBalance:")
        println(balanceJson)
        val balance: Balance = mapper.readValue(balanceJson)

        assertThat(balance.total_ironwood_balance).isEqualTo(PoolBalanceFixture.IRONWOOD_BALANCE)
        assertThat(balance.confirmed_ironwood_balance).isEqualTo(PoolBalanceFixture.IRONWOOD_BALANCE)
        assertThat(balance.total_orchard_balance).isEqualTo(PoolBalanceFixture.ORCHARD_BALANCE)
        assertThat(balance.confirmed_orchard_balance).isEqualTo(PoolBalanceFixture.ORCHARD_BALANCE)
        assertThat(balance.total_sapling_balance).isEqualTo(PoolBalanceFixture.SAPLING_BALANCE)
        assertThat(balance.confirmed_sapling_balance).isEqualTo(PoolBalanceFixture.SAPLING_BALANCE)
        assertThat(balance.total_transparent_balance).isEqualTo(PoolBalanceFixture.TRANSPARENT_BALANCE)
        assertThat(balance.confirmed_transparent_balance).isEqualTo(PoolBalanceFixture.TRANSPARENT_BALANCE)
    }
}

@OfflineDeviceTest
class ExecuteParseAddressForTex {
    @Test
    fun executeParseAddressForTex() {
        val mapper = testMapper()

        val resultJson: String = uniffi.zingo.parseAddress("texregtest1z754rp9kk9vdewx4wm7pstvm0u2rwlgy4zp82v")
        val result: ParseResult = mapper.readValue(resultJson)
        println("\nParsed Address:")
        println(result)

        assertThat(result).isNotNull()

        val expectedResult = ParseResult(
            status = "success",
            chain_name = "regtest",
            address_kind = "tex"
        )

        assertThat(result).isEqualTo(expectedResult)
    }
}

@OfflineDeviceTest
class ExecuteParseAddressInvalid {
    @Test
    fun executeParseAddressInvalid() {
        val mapper = testMapper()

        val wrongResultJson: String = uniffi.zingo.parseAddress("thiswontwork")
        val wrongResult: ParseResult = mapper.readValue(wrongResultJson)
        println("\nWrong Address:")
        println(wrongResult)

        assertThat(wrongResult).isNotNull()

        val expectedWrongResult = ParseResult(
            status = "Invalid address",
            chain_name = null,
            address_kind = null
        )

        assertThat(wrongResult).isEqualTo(expectedWrongResult)
    }
}