package org.ZingoLabs.Zingo

import androidx.test.platform.app.InstrumentationRegistry
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap
import com.google.common.truth.Truth.assertThat
import org.junit.Before
import org.junit.Test
import java.io.File

/**
 * Wallet deletion removes every sidecar that the startup recovery paths
 * could rename or copy back onto the wallet path.
 *
 * Run: ./gradlew :app:connectedProdDebugAndroidTest \
 *   -Pandroid.testInstrumentationRunnerArguments.class=org.ZingoLabs.Zingo.WalletDeleteTest
 */
class WalletDeleteTest {
    private val mainName = Constants.WalletFileName.value
    private val backupName = Constants.WalletBackupFileName.value
    private val swapName = Constants.WalletTempSwapFileName.value
    private val context = InstrumentationRegistry.getInstrumentation().targetContext
    private val rpcModule = RPCModule(MainApplication.getAppReactContext())

    private lateinit var plainWallet: ByteArray

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

    private fun deleteWallet(): Any? {
        val promise = CapturingPromise()
        rpcModule.deleteExistingWallet(promise)
        return promise.resolved.single()
    }

    private fun walletExists(): Any? {
        val promise = CapturingPromise()
        rpcModule.walletExists(promise)
        return promise.resolved.single()
    }

    @Before
    fun aRealWalletOnDisk() {
        val suffixes = listOf("", ".migrating", ".write.tmp", ".plain.tmp", ".prerepair", ".broken")
        for (name in listOf(mainName, backupName)) {
            for (suffix in suffixes) file("$name$suffix").delete()
        }
        file(swapName).delete()
        RPCModule.walletFileClosed = false
        uniffi.zingo.initLogging()
        uniffi.zingo.setCryptoDefaultProviderToRing()
        uniffi.zingo.initFromSeed(Seeds.HOSPITAL, 2000000u, "", "main", "Medium", 1u)
        plainWallet = WalletFixtures.savedWalletBytes(context)
        file(mainName).writeBytes(plainWallet)
    }

    @Test
    fun aSaveAfterDeleteIsRefusedUntilTheNextLoad() {
        assertThat(deleteWallet()).isEqualTo(true)

        assertThat(rpcModule.saveWalletFile()).isFalse()
        assertThat(file(mainName).exists()).isFalse()

        file(mainName).writeBytes(plainWallet)
        rpcModule.loadExistingWalletNative("", "main", "Medium", "1")
        assertThat(rpcModule.saveWalletFile()).isTrue()
    }

    @Test
    fun aMigratingSidecarDoesNotResurrectTheDeletedWallet() {
        file("$mainName.migrating").writeBytes(plainWallet)

        assertThat(deleteWallet()).isEqualTo(true)

        assertThat(walletExists()).isEqualTo(false)
        assertThat(file(mainName).exists()).isFalse()
        assertThat(file("$mainName.migrating").exists()).isFalse()
    }

    @Test
    fun aWriteTempSidecarDoesNotResurrectTheDeletedWallet() {
        file("$mainName.write.tmp").writeBytes(plainWallet)

        assertThat(deleteWallet()).isEqualTo(true)

        assertThat(walletExists()).isEqualTo(false)
        assertThat(file("$mainName.write.tmp").exists()).isFalse()
    }

    @Test
    fun aSwapTempDoesNotResurrectTheDeletedBackup() {
        file(backupName).writeBytes(plainWallet)
        file(swapName).writeBytes(plainWallet)

        val promise = CapturingPromise()
        rpcModule.deleteExistingWalletBackup(promise)
        assertThat(promise.resolved).containsExactly(true)

        val exists = CapturingPromise()
        rpcModule.walletBackupExists(exists)
        assertThat(exists.resolved).containsExactly(false)
        assertThat(file(swapName).exists()).isFalse()
    }

    @Test
    fun anUnconsumedSwapTempSurvivesTheDelete() {
        file(swapName).writeBytes(ByteArray(64) { i -> if (i == 0) 0x28 else (i * 13).toByte() })

        assertThat(deleteWallet()).isEqualTo(true)

        assertThat(file(mainName).exists()).isFalse()
        assertThat(file(swapName).exists()).isTrue()
        file(swapName).delete()
    }

    @Test
    fun theEvidenceCopiesGoWithTheWallet() {
        for (suffix in listOf(".broken", ".prerepair", ".plain.tmp")) {
            file("$mainName$suffix").writeBytes(plainWallet)
        }
        file(swapName).writeBytes(plainWallet)

        assertThat(deleteWallet()).isEqualTo(true)

        for (suffix in listOf(".broken", ".prerepair", ".plain.tmp")) {
            assertThat(file("$mainName$suffix").exists()).isFalse()
        }
        assertThat(file(swapName).exists()).isFalse()
    }
}
