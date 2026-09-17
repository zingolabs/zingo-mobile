package org.ZingoLabs.Zingo

import androidx.test.platform.app.InstrumentationRegistry
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Test
import java.io.File

/**
 * The wallet and retained-wallet swap recovered from every interruption
 * window, with real zingolib wallets on both sides.
 *
 * Run: ./gradlew :app:connectedProdDebugAndroidTest \
 *   -Pandroid.testInstrumentationRunnerArguments.class=org.ZingoLabs.Zingo.WalletSwapRecoveryTest
 */
class WalletSwapRecoveryTest {
    private val mainName = Constants.WalletFileName.value
    private val backupName = Constants.WalletBackupFileName.value
    private val swapName = Constants.WalletTempSwapFileName.value
    private val context = InstrumentationRegistry.getInstrumentation().targetContext
    private val rpcModule = RPCModule(MainApplication.getAppReactContext())

    private lateinit var walletA: ByteArray
    private lateinit var walletB: ByteArray

    private fun file(name: String) = File(context.filesDir, name)

    private fun offlineWallet(birthday: UInt): ByteArray = runBlocking { offlineWalletBytes(birthday) }

    @Before
    fun twoDistinctWallets() {
        val suffixes = listOf("", ".migrating", ".write.tmp", ".plain.tmp", ".prerepair", ".broken")
        for (name in listOf(mainName, backupName)) {
            for (suffix in suffixes) file("$name$suffix").delete()
        }
        file(swapName).delete()
        RPCModule.walletFileClosed = false
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
    fun theRestoreSwapExchangesMainAndBackup() {
        file(mainName).writeBytes(walletA)
        file(backupName).writeBytes(walletB)

        val promise = SettledPromise()
        rpcModule.restoreExistingWalletBackup(promise)

        assertThat(promise.await().rejections).isEmpty()
        assertThat(promise.resolved).hasSize(1)
        assertThat(file(mainName).readBytes()).isEqualTo(walletB)
        assertThat(file(backupName).readBytes()).isEqualTo(walletA)
        assertThat(file(swapName).exists()).isFalse()
    }
}
