package org.ZingoLabs.Zingo

import androidx.test.platform.app.InstrumentationRegistry
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap
import com.google.common.truth.Truth.assertThat
import org.junit.Before
import org.junit.Test
import java.io.File

/**
 * Wallet deletion removes the active wallet's folder with every sidecar
 * the recovery paths could rename or copy back onto the wallet file.
 *
 * Run: ./gradlew :app:connectedProdDebugAndroidTest \
 *   -Pandroid.testInstrumentationRunnerArguments.class=org.ZingoLabs.Zingo.WalletDeleteTest
 */
@OfflineDeviceTest
class WalletDeleteTest {
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

    private fun folder() = rpcModule.activeWalletDir()

    private fun deleteWallet(): Any? {
        val promise = CapturingPromise()
        rpcModule.deleteWalletProcess(WalletStore.active(context.filesDir) ?: "", promise)
        return promise.resolved.single()
    }

    private fun walletExists(): Any? {
        val promise = CapturingPromise()
        rpcModule.walletExists(promise)
        return promise.resolved.single()
    }

    private fun anActiveWallet(): File {
        val base = context.filesDir
        val id = WalletStore.allocate(base)
        PlainWalletFile.write(WalletStore.dir(base, id), WalletStore.WALLET, plainWallet)
        WalletStore.writeMeta(base, id, WalletStore.newMeta(base, id, "Wallet 1", "main", ""))
        WalletStore.setActive(base, id)
        return WalletStore.dir(base, id)
    }

    @Before
    fun aRealWalletOnDisk() {
        val suffixes = listOf("", ".migrating", ".write.tmp", ".plain.tmp", ".prerepair", ".broken")
        for (name in listOf(Constants.WalletFileName.value, Constants.WalletBackupFileName.value)) {
            for (suffix in suffixes) file("$name$suffix").delete()
        }
        file(swapName).delete()
        WalletStore.root(context.filesDir).deleteRecursively()
        RPCModule.openWalletId = null
        uniffi.zingo.initLogging()
        uniffi.zingo.initFromSeed(seed = Seeds.HOSPITAL, birthday = 2000000u, connection = testConnection("", "main"))
        plainWallet = uniffi.zingo.saveWalletBytes()!!
        anActiveWallet()
    }

    @Test
    fun aSaveAfterDeleteIsRefusedUntilTheNextLoad() {
        rpcModule.loadExistingWalletNative("", "main", "Medium", "1")
        val deleted = folder()

        assertThat(deleteWallet()).isEqualTo(true)

        assertThat(rpcModule.saveWalletFile()).isFalse()
        assertThat(deleted.exists()).isFalse()

        anActiveWallet()
        rpcModule.loadExistingWalletNative("", "main", "Medium", "1")
        assertThat(rpcModule.saveWalletFile()).isTrue()
    }

    @Test
    fun theSidecarsInTheFolderDoNotResurrectTheDeletedWallet() {
        for (suffix in listOf(".migrating", ".write.tmp")) {
            File(folder(), WalletStore.WALLET + suffix).writeBytes(plainWallet)
        }

        assertThat(deleteWallet()).isEqualTo(true)

        assertThat(walletExists()).isEqualTo(false)
        assertThat(WalletStore.list(context.filesDir)).isEmpty()
    }

    @Test
    fun anUnconsumedSwapTempSurvivesTheDelete() {
        file(swapName).writeBytes(ByteArray(64) { i -> if (i == 0) 0x28 else (i * 13).toByte() })

        assertThat(deleteWallet()).isEqualTo(true)

        assertThat(file(swapName).exists()).isTrue()
        file(swapName).delete()
    }

    @Test
    fun theEvidenceCopiesGoWithTheWallet() {
        val deleted = folder()
        for (suffix in listOf(".broken", ".prerepair", ".plain.tmp")) {
            File(deleted, WalletStore.WALLET + suffix).writeBytes(plainWallet)
        }

        assertThat(deleteWallet()).isEqualTo(true)

        assertThat(deleted.exists()).isFalse()
    }

    @Test
    fun deletingTheActiveWalletLeavesTheFirstOneActive() {
        // deleteWallet() deletes the active one: the second, just made active.
        val first = folder()
        val second = anActiveWallet()

        assertThat(deleteWallet()).isEqualTo(true)

        assertThat(first.exists()).isTrue()
        assertThat(second.exists()).isFalse()
        assertThat(walletExists()).isEqualTo(true)
        assertThat(WalletStore.active(context.filesDir)).isEqualTo(first.name)
    }
}
