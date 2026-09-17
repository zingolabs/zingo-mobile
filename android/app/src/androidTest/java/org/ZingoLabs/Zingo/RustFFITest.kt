package org.ZingoLabs.Zingo

import androidx.test.platform.app.InstrumentationRegistry
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap
import com.google.common.truth.Truth.assertThat
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertThrows
import org.junit.Test
import uniffi.zingo.AddressScope
import uniffi.zingo.Chain
import uniffi.zingo.Connection
import uniffi.zingo.ParsedAddress
import uniffi.zingo.Pool
import uniffi.zingo.Receiver
import uniffi.zingo.SyncResult
import uniffi.zingo.TransferKind
import uniffi.zingo.TransferStatus
import uniffi.zingo.Wallet
import uniffi.zingo.WalletEvent
import uniffi.zingo.ZingoException
import uniffi.zingo.parseAddress
import uniffi.zingo.version

// The regtest chain hint for the wallet under test. The host harness reads
// the launched chain's activation heights back from the running validator
// and forwards them as the `activation_heights` instrumentation argument
// (see scripts/android_integration_tests.sh); the extended hint hands them
// to the FFI so the wallet's schedule is the chain's, never a guess. With
// no argument (a chain whose provisioner cannot report a schedule) the
// bare hint keeps the FFI's historical default.
fun regtestChainHint(): String {
    val heights = InstrumentationRegistry.getArguments().getString("activation_heights")
    return if (heights.isNullOrEmpty()) "regtest" else "regtest:$heights"
}

const val REGTEST_SERVER = "http://10.0.2.2:20000"

fun regtestConnection(): Connection = walletConnection(REGTEST_SERVER, regtestChainHint(), "Medium", 1u)

fun offlineConnection(): Connection = walletConnection("", "main", "Medium", 1u)

/** Opens the HOSPITAL seed against the regtest server from birthday 1. */
suspend fun regtestWallet(): Wallet = Wallet.openFromSeed(regtestConnection(), Seeds.HOSPITAL, 1u)

/** The export of an offline mainnet wallet from the HOSPITAL seed. */
suspend fun offlineWalletBytes(birthday: UInt = 2000000u): ByteArray =
    Wallet.openFromSeed(offlineConnection(), Seeds.HOSPITAL, birthday).saveWalletBytes()!!

/** Starts a sync and reads its events until it completes, rethrowing a sync failure. */
suspend fun Wallet.syncToCompletion(): SyncResult {
    val events = events()
    startSync()
    try {
        var complete: SyncResult? = null
        while (complete == null) {
            when (val event = events.next()) {
                is WalletEvent.SyncComplete -> complete = event.result
                is WalletEvent.SyncFailed -> throw event.error
                is WalletEvent.SyncProgress -> println("Sync status: ${event.status.percentageTotalOutputsScanned}")
                null -> throw AssertionError("the event stream ended before the sync completed")
                else -> Unit
            }
        }
        return complete
    } finally {
        events.cancel()
    }
}

/** Records how a bridge promise settles and waits for it. */
class SettledPromise : Promise {
    val resolved = mutableListOf<Any?>()
    val rejections = mutableListOf<Triple<String?, String?, Throwable?>>()
    private val latch = CountDownLatch(1)

    fun await(): SettledPromise {
        assertThat(latch.await(60, TimeUnit.SECONDS)).isTrue()
        return this
    }

    private fun record(code: String?, message: String?, throwable: Throwable?) {
        rejections.add(Triple(code, message, throwable))
        latch.countDown()
    }

    override fun resolve(value: Any?) {
        resolved.add(value)
        latch.countDown()
    }

    override fun reject(code: String, message: String?) = record(code, message, null)
    override fun reject(code: String, throwable: Throwable?) = record(code, null, throwable)
    override fun reject(code: String, message: String?, throwable: Throwable?) = record(code, message, throwable)
    override fun reject(throwable: Throwable) = record(null, null, throwable)
    override fun reject(throwable: Throwable, userInfo: WritableMap) = record(null, null, throwable)
    override fun reject(code: String, userInfo: WritableMap) = record(code, null, null)
    override fun reject(code: String, throwable: Throwable?, userInfo: WritableMap) = record(code, null, throwable)
    override fun reject(code: String, message: String?, userInfo: WritableMap) = record(code, message, null)
    override fun reject(code: String?, message: String?, throwable: Throwable?, userInfo: WritableMap?) =
        record(code, message, throwable)
    @Deprecated("Deprecated in the React Native Promise interface")
    override fun reject(message: String) = record(null, message, null)
}

object Seeds {
    const val HOSPITAL = "hospital museum valve antique skate museum unfold vocal weird milk scale social vessel identify crowd hospital control album rib bulb path oven civil tank"
}

object Ufvk {
    const val HOSPITAL = "uviewregtest1zd5hsn447739jr5pk879pn06wan8gewam949xjqvwgfc7zec29x2ezqyeq6vmtwkcmn0kkfl447caqsccg582dp50ax972dfm4eh5f4mqj730fgr7hygvjeqxlgpwynrmcu57fjjqlns95chfjfq4xg7v977x603un9fuw73zvn2t32pfcfewrh67tzv04wstjg0yx4r3lpmpaea9nsyll6juu9jtyc0fstdwde06l4tvzlerytyutfd3yptq5r5csfck9c5ks8rzaj5r9tgltarejfdxu8h79sxmc6knxtnglp0pa7y3kw708rueg984ty6lhyrlzmk2swyqqfe0q2nmzhcxme9rsvprcw50ms463twx4suldhm0p94lem8ryan4e4y8fpp8grr5kmlygm70h2zhl0d7mfra5qs78jq9wqctvk8fhdu9cv78q00v7qzl9w50j242xr0945pmsu2vrh6jcvq8fxad420m8kxpd3cgyd6wxy6"
}

const val HOSPITAL_UNIFIED_ADDRESS = "uregtest1ue949txhf9t2z6ldg8wc6s5t439t2hu55yh9l58gc23cmxthths836nxtpyvhpkrftsp2jnnp9eadtqy2nefxn04eyxeu8l0x5kk8ct9"
const val HOSPITAL_TRANSPARENT_ADDRESS = "tmFLszfkjgim4zoUMAXpuohnFBAKy99rr2i"

val context = MainApplication.getAppContext()!!

class ExecuteAddressesFromSeed {
    @Test
    fun executeAddressesFromSeed() {
        runBlocking {
            val wallet = regtestWallet()

            val seed = wallet.seed()
            println("\nSeed: $seed")
            assertThat(seed.seedPhrase).isEqualTo(Seeds.HOSPITAL)
            assertThat(seed.birthday.toLong()).isEqualTo(1L)

            val info = wallet.serverInfo()
            println("\nInfo: $info")
            assertThat(info.latestBlockHeight.toLong()).isGreaterThan(0L)

            println("\nExport Ufvk: ${wallet.viewingKey()}")

            val addresses = wallet.unifiedAddresses()
            println("\nAddresses: $addresses")
            assertThat(addresses[0].encodedAddress).isEqualTo(HOSPITAL_UNIFIED_ADDRESS)
            assertThat(addresses[0].hasOrchard).isTrue()
            assertThat(addresses[0].hasSapling).isFalse()
            assertThat(addresses[0].hasTransparent).isFalse()

            val taddresses = wallet.transparentAddresses()
            println("\nT Addresses: $taddresses")
            assertThat(taddresses[0].encodedAddress).isEqualTo(HOSPITAL_TRANSPARENT_ADDRESS)
            assertThat(taddresses[0].scope).isEqualTo(AddressScope.EXTERNAL)
        }
    }
}

class ExecuteAddressesFromUfvk {
    @Test
    fun executeAddressFromUfvk() {
        runBlocking {
            val wallet = Wallet.openFromUfvk(regtestConnection(), Ufvk.HOSPITAL, 1u)

            val info = wallet.serverInfo()
            println("\nInfo: $info")
            assertThat(info.latestBlockHeight.toLong()).isGreaterThan(0L)

            val exported = wallet.viewingKey()
            println("\nExport Ufvk: $exported")
            assertThat(exported.ufvk).isEqualTo(Ufvk.HOSPITAL)
            assertThat(exported.birthday.toLong()).isEqualTo(1L)

            val addresses = wallet.unifiedAddresses()
            println("\nAddresses: $addresses")
            assertThat(addresses[0].encodedAddress).isEqualTo(HOSPITAL_UNIFIED_ADDRESS)
            assertThat(addresses[0].hasOrchard).isTrue()
            assertThat(addresses[0].hasSapling).isFalse()
            assertThat(addresses[0].hasTransparent).isFalse()

            val taddresses = wallet.transparentAddresses()
            println("\nT Addresses: $taddresses")
            assertThat(taddresses[0].encodedAddress).isEqualTo(HOSPITAL_TRANSPARENT_ADDRESS)
            assertThat(taddresses[0].scope).isEqualTo(AddressScope.EXTERNAL)
        }
    }
}

class ExecuteVersionFromSeed {
    @Test
    fun executeVersionFromSeed() {
        runBlocking {
            val wallet = regtestWallet()

            val info = wallet.serverInfo()
            println("\nInfo: $info")
            assertThat(info.latestBlockHeight.toLong()).isGreaterThan(0L)

            val build = version()
            println("\nVersion: $build")
            assertThat(build).isNotEmpty()
        }
    }
}

class ExecuteSyncFromSeed {
    @Test
    fun executeSyncFromSeed() {
        runBlocking {
            val wallet = regtestWallet()

            val info = wallet.serverInfo()
            println("\nInfo: $info")
            assertThat(info.latestBlockHeight.toLong()).isGreaterThan(0L)

            val heightPreSync = wallet.latestBlockWallet()
            println("\nHeight pre-sync: $heightPreSync")
            assertThat(heightPreSync.toLong()).isEqualTo(0L)

            println("\nSync: ${wallet.syncToCompletion()}")

            val heightPostSync = wallet.latestBlockWallet()
            println("\nHeight post-sync: $heightPostSync")
            assertThat(heightPostSync.toLong()).isEqualTo(info.latestBlockHeight.toLong())
        }
    }
}

class ExecuteSendFromOrchard {
    @Test
    fun executeSendFromOrchard() {
        runBlocking {
            val wallet = regtestWallet()

            val info = wallet.serverInfo()
            println("\nInfo: $info")
            assertThat(info.latestBlockHeight.toLong()).isGreaterThan(0L)

            println("\nSync: ${wallet.syncToCompletion()}")

            val balancePreSend = wallet.balance()
            println("\nBalance pre-send: $balancePreSend")
            assertThat(balancePreSend.confirmedOrchardBalance?.toLong()).isEqualTo(1000000L)
            assertThat(balancePreSend.confirmedTransparentBalance?.toLong()).isEqualTo(0L)

            val taddress = wallet.transparentAddresses()[0].encodedAddress
            val proposal = wallet.proposeSend(listOf(Receiver(taddress, 100000uL, null)))
            println("\nPropose: $proposal")

            // The transmission rides the mixnet or does not happen (ADR 0011).
            // This wallet never attached one, so the confirm must refuse. A txid
            // here would mean the transaction reached an indexer over clearnet,
            // which is the leak the mixnet-only rule exists to prevent.
            val refusal = assertThrows(ZingoException.MixnetUnattached::class.java) {
                runBlocking { wallet.confirm() }
            }
            println("\nTransmission refused without a mixnet: ${refusal.detail}")

            // The refusal consumed the stored proposal. A confirm takes the
            // proposal before it attempts the transmission, so a refusal discards
            // it exactly as any other failure does. A retry therefore reports no
            // stored proposal rather than repeating the refusal, and an app that
            // wants the send after the user enables Mixnet Mode must propose it
            // again.
            assertThrows(ZingoException.NoStoredProposal::class.java) {
                runBlocking { wallet.confirm() }
            }
            println("\nRetry after the refusal reported no stored proposal")

            println("\nSync: ${wallet.syncToCompletion()}")

            val balancePostRefusal = wallet.balance()
            println("\nBalance post-refusal: $balancePostRefusal")
            // Nothing reached the chain, so the transparent recipient holds no
            // confirmed funds. The unconfirmed side is deliberately unasserted:
            // the proposal is still Calculated, and a Calculated transaction
            // counts as pending whether or not it was ever transmitted.
            assertThat(balancePostRefusal.confirmedTransparentBalance?.toLong()).isEqualTo(0L)
        }
    }
}

class UpdateCurrentPriceAndValueTransfersFromSeed {
    @Test
    fun updateCurrentPriceAndValueTransfersFromSeed() {
        runBlocking {
            val wallet = regtestWallet()

            val info = wallet.serverInfo()
            println("\nInfo: $info")
            assertThat(info.latestBlockHeight.toLong()).isGreaterThan(0L)

            // Price rides the mixnet or does not happen (ADR 0011). This wallet
            // never attached one, so the fetch must refuse. A price here would
            // mean the wallet reached an oracle over clearnet, which is the
            // leak the mixnet-only rule exists to prevent.
            val refusal = assertThrows(ZingoException.MixnetUnattached::class.java) {
                runBlocking { wallet.zecPrice() }
            }
            println("\nPrice refused without a mixnet: ${refusal.detail}")

            println("\nSync: ${wallet.syncToCompletion()}")

            val recipientAddress = "uregtest1az7w9w3tdegf0srnsgqyqfhyfrpx2h6u4pkc2yq3ja552vzhwkjqgy4fu6a6kcu9280ppajamj2gcq9lx9x0zxdrsns94ml3e443a7t2dm50382mhtkleydrq74q5xlh6sel5u0qlrvflf20qgljzszd2ht9jmerwwahct9rtuc3nqdk"

            val transfers = wallet.valueTransfers()
            println("\nValue Transfers: $transfers")
            // the value transfers have 3 items for 3 different txs
            // 1. Received - 1_000_000 - orchard (1 item)
            // 2. Sent - 110_000 - uregtest1az7w9w3t... (1 item)
            // 3. memoToSelf - 870_000 (1 item)
            assertThat(transfers).hasSize(3)
            // third item have to be a `fee` from the last `Sent` with the same txid
            assertThat(transfers[0].kind).isEqualTo(TransferKind.MEMO_TO_SELF)
            assertThat(transfers[0].status).isEqualTo(TransferStatus.CONFIRMED)
            assertThat(transfers[0].value.toLong()).isEqualTo(870000L)
            assertThat(transfers[0].transactionFee?.toLong()).isEqualTo(20000L)
            // second item have to be a `Sent`
            assertThat(transfers[1].kind).isEqualTo(TransferKind.SENT)
            assertThat(transfers[1].recipientAddress).isEqualTo(recipientAddress)
            assertThat(transfers[1].status).isEqualTo(TransferStatus.CONFIRMED)
            assertThat(transfers[1].value.toLong()).isEqualTo(100000L)
            assertThat(transfers[1].transactionFee?.toLong()).isEqualTo(10000L)
            // first item have to be a `Received`
            assertThat(transfers[2].kind).isEqualTo(TransferKind.RECEIVED)
            assertThat(transfers[2].poolsReceived).isEqualTo(listOf(Pool.ORCHARD))
            assertThat(transfers[2].status).isEqualTo(TransferStatus.CONFIRMED)
            assertThat(transfers[2].value.toLong()).isEqualTo(1000000L)
        }
    }
}

class ExecuteSaplingBalanceFromSeed {
    @Test
    fun executeSaplingBalanceFromSeed() {
        runBlocking {
            val rpcModule = RPCModule(MainApplication.getAppReactContext())
            val wallet = regtestWallet()

            val info = wallet.serverInfo()
            println("\nInfo: $info")
            assertThat(info.latestBlockHeight.toLong()).isGreaterThan(0L)

            println("\nSync: ${wallet.syncToCompletion()}")

            println("\nValue Transfers: ${wallet.valueTransfers()}")

            // Value Transfers, on the ironwood-activated regtest chain. Shield
            // and self-send outputs prefer the Ironwood pool (confirmed policy),
            // so part of the orchard change and the shielded transparent funds
            // land in Ironwood rather than Orchard.
            // 1. Received in orchard pool =         +500_000
            // 2. Received in sapling pool =         +250_000
            // 3. Received in transparent pool =     +250_000
            // 4. Send - 100_000 + 20_000fee =       -120_000
            // 5. MemoToSelf orchard pool =           -20_000 fee,
            //    100_000 of orchard change lands in ironwood
            // 6. MemoToSelf sapling pool =           -10_000 fee
            // 7. MemoToSelf sapling->transparent =   -15_000 fee,
            //    100_000 moves to transparent
            // 8. Shield transparent->ironwood =      -20_000 fee,
            //    330_000 lands in ironwood
            //
            // ironwood pool    = 430_000
            // orchard pool     = 260_000
            // sapling pool     = 125_000
            // transparent pool = 0

            val balance = wallet.balance()
            println("\nBalance: $balance")

            assertThat(balance.totalIronwoodBalance?.toLong()).isEqualTo(430000L)
            assertThat(balance.confirmedIronwoodBalance?.toLong()).isEqualTo(430000L)
            assertThat(balance.totalOrchardBalance?.toLong()).isEqualTo(260000L)
            assertThat(balance.confirmedOrchardBalance?.toLong()).isEqualTo(260000L)
            assertThat(balance.totalSaplingBalance?.toLong()).isEqualTo(125000L)
            assertThat(balance.confirmedSaplingBalance?.toLong()).isEqualTo(125000L)
            assertThat(balance.confirmedTransparentBalance?.toLong()).isEqualTo(0L)

            RPCModule.walletFileClosed = false
            assertThat(rpcModule.saveWalletFile()).isTrue()
        }
    }
}

class ExecuteParseAddressForTex {
    @Test
    fun executeParseAddressForTex() {
        val parsed = parseAddress("texregtest1z754rp9kk9vdewx4wm7pstvm0u2rwlgy4zp82v")
        println("\nParsed Address: $parsed")
        assertThat(parsed).isEqualTo(ParsedAddress.Tex(Chain.REGTEST))
    }
}

class ExecuteParseAddressInvalid {
    @Test
    fun executeParseAddressInvalid() {
        val parsed = parseAddress("thiswontwork")
        println("\nWrong Address: $parsed")
        assertThat(parsed).isEqualTo(ParsedAddress.Invalid)
    }
}
