package org.ZingoLabs.Zingo

import androidx.test.platform.app.InstrumentationRegistry
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap
import com.google.common.truth.Truth.assertThat
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

    private class CapturingPromise : Promise {
        val resolved = mutableListOf<Any?>()
        override fun resolve(value: Any?) { resolved.add(value) }
        override fun reject(code: String, message: String?) {}
        override fun reject(code: String, throwable: Throwable?) {}
        override fun reject(code: String, message: String?, throwable: Throwable?) {}
        override fun reject(throwable: Throwable) {}
        override fun reject(throwable: Throwable, userInfo: WritableMap) {}
        override fun reject(code: String, userInfo: WritableMap) {}
        override fun reject(code: String, throwable: Throwable?, userInfo: WritableMap) {}
        override fun reject(code: String, message: String?, userInfo: WritableMap) {}
        override fun reject(code: String?, message: String?, throwable: Throwable?, userInfo: WritableMap?) {}
        @Deprecated("Deprecated in the React Native Promise interface")
        override fun reject(message: String) {}
    }

    private fun file(name: String) = File(context.filesDir, name)

    private fun offlineWallet(birthday: UInt): ByteArray {
        uniffi.zingo.initFromSeed(Seeds.HOSPITAL, birthday, "", "main", "Medium", 1u)
        return uniffi.zingo.saveWalletBytes()!!
    }

    @Before
    fun twoDistinctWallets() {
        val suffixes = listOf("", ".migrating", ".write.tmp", ".plain.tmp", ".prerepair", ".broken")
        for (name in listOf(mainName, backupName)) {
            for (suffix in suffixes) file("$name$suffix").delete()
        }
        file(swapName).delete()
        RPCModule.walletFileClosed = false
        uniffi.zingo.initLogging()
        uniffi.zingo.setCryptoDefaultProviderToRing()
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

        val promise = CapturingPromise()
        rpcModule.restoreExistingWalletBackup(promise)

        assertThat(promise.resolved).containsExactly(true)
        assertThat(file(mainName).readBytes()).isEqualTo(walletB)
        assertThat(file(backupName).readBytes()).isEqualTo(walletA)
        assertThat(file(swapName).exists()).isFalse()
    }
}
