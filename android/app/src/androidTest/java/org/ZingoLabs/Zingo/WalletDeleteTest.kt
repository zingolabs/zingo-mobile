package org.ZingoLabs.Zingo

import androidx.test.platform.app.InstrumentationRegistry
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.runBlocking
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

    private fun file(name: String) = File(context.filesDir, name)

    private fun deleteWallet(): Any? {
        val promise = SettledPromise()
        rpcModule.deleteExistingWallet(promise)
        return promise.await().resolved.single()
    }

    private fun walletExists(): Any? {
        val promise = SettledPromise()
        rpcModule.walletExists(promise)
        return promise.await().resolved.single()
    }

    @Before
    fun aRealWalletOnDisk() {
        val suffixes = listOf("", ".migrating", ".write.tmp", ".plain.tmp", ".prerepair", ".broken")
        for (name in listOf(mainName, backupName)) {
            for (suffix in suffixes) file("$name$suffix").delete()
        }
        file(swapName).delete()
        RPCModule.walletFileClosed = false
        plainWallet = runBlocking { offlineWalletBytes() }
        file(mainName).writeBytes(plainWallet)
    }

    @Test
    fun aSaveAfterDeleteIsRefusedUntilTheNextLoad() {
        assertThat(deleteWallet()).isEqualTo(true)

        assertThat(runBlocking { rpcModule.saveWalletFile() }).isFalse()
        assertThat(file(mainName).exists()).isFalse()

        file(mainName).writeBytes(plainWallet)
        runBlocking { rpcModule.openWalletFile(offlineConnection()) }
        assertThat(runBlocking { rpcModule.saveWalletFile() }).isTrue()
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

        val promise = SettledPromise()
        rpcModule.deleteExistingWalletBackup(promise)
        assertThat(promise.await().resolved).containsExactly(true)

        val exists = SettledPromise()
        rpcModule.walletBackupExists(exists)
        assertThat(exists.await().resolved).containsExactly(false)
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
