package org.ZingoLabs.Zingo

import androidx.test.platform.app.InstrumentationRegistry
import com.google.common.truth.Truth.assertThat
import org.junit.Before
import org.junit.Test
import java.io.File

/**
 * The legacy wallet and backup swap recovered from every interruption
 * window, and the backup restore and replace on the folder layout, with
 * real zingolib wallets on both sides.
 *
 * Run: ./gradlew :app:connectedProdDebugAndroidTest \
 *   -Pandroid.testInstrumentationRunnerArguments.class=org.ZingoLabs.Zingo.WalletSwapRecoveryTest
 */
@OfflineDeviceTest
class WalletSwapRecoveryTest {
    private val mainName = Constants.WalletFileName.value
    private val backupName = Constants.WalletBackupFileName.value
    private val swapName = Constants.WalletTempSwapFileName.value
    private val context = InstrumentationRegistry.getInstrumentation().targetContext
    private val rpcModule = RPCModule(MainApplication.getAppReactContext())

    private lateinit var walletA: ByteArray
    private lateinit var walletB: ByteArray

    private fun file(name: String) = File(context.filesDir, name)

    private fun activeWallet() = File(rpcModule.activeWalletDir(), WalletStore.WALLET).readBytes()

    private fun offlineWallet(birthday: UInt): ByteArray {
        uniffi.zingo.initFromSeed(seed = Seeds.HOSPITAL, birthday = birthday, connection = testConnection("", "main"))
        return uniffi.zingo.saveWalletBytes()!!
    }

    @Before
    fun twoDistinctWallets() {
        val suffixes = listOf("", ".migrating", ".write.tmp", ".plain.tmp", ".prerepair", ".broken")
        for (name in listOf(mainName, backupName)) {
            for (suffix in suffixes) file("$name$suffix").delete()
        }
        file(swapName).delete()
        WalletStore.root(context.filesDir).deleteRecursively()
        RPCModule.openWalletId = null
        uniffi.zingo.initLogging()
        walletA = offlineWallet(2000000u)
        walletB = offlineWallet(2100000u)
        assertThat(walletA).isNotEqualTo(walletB)
    }

    @Test
    fun anInterruptionBeforeMainIsRewrittenCompletesTheSwap() {
        file(swapName).writeBytes(walletA)
        file(mainName).writeBytes(walletA)
        file(backupName).writeBytes(walletB)

        rpcModule.completePendingSwap()

        assertThat(file(mainName).readBytes()).isEqualTo(walletB)
        assertThat(file(backupName).readBytes()).isEqualTo(walletA)
        assertThat(file(swapName).exists()).isFalse()
    }

    @Test
    fun anInterruptionBeforeBackupIsRewrittenCompletesTheSwap() {
        file(swapName).writeBytes(walletA)
        file(mainName).writeBytes(walletB)
        file(backupName).writeBytes(walletB)

        rpcModule.completePendingSwap()

        assertThat(file(mainName).readBytes()).isEqualTo(walletB)
        assertThat(file(backupName).readBytes()).isEqualTo(walletA)
        assertThat(file(swapName).exists()).isFalse()
    }

    @Test
    fun aCompletedSwapOnlyDropsTheTemp() {
        file(swapName).writeBytes(walletA)
        file(mainName).writeBytes(walletB)
        file(backupName).writeBytes(walletA)

        rpcModule.completePendingSwap()

        assertThat(file(mainName).readBytes()).isEqualTo(walletB)
        assertThat(file(backupName).readBytes()).isEqualTo(walletA)
        assertThat(file(swapName).exists()).isFalse()
    }

    @Test
    fun aMissingMainIsRestoredFromTheTemp() {
        file(swapName).writeBytes(walletA)
        file(backupName).writeBytes(walletB)

        rpcModule.completePendingSwap()

        assertThat(file(mainName).readBytes()).isEqualTo(walletA)
        assertThat(file(backupName).readBytes()).isEqualTo(walletB)
        assertThat(file(swapName).exists()).isFalse()
    }

    @Test
    fun theMigratedBackupIsListedBesideTheActiveMainWallet() {
        file(mainName).writeBytes(walletA)
        file(backupName).writeBytes(walletB)

        rpcModule.prepareWallets()

        assertThat(activeWallet()).isEqualTo(walletA)
        assertThat(WalletStore.list(context.filesDir)).hasSize(2)
        assertThat(file(mainName).exists()).isFalse()
        assertThat(file(backupName).exists()).isFalse()
    }
}
