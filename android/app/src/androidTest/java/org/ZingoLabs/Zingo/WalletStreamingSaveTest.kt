package org.ZingoLabs.Zingo

import androidx.test.platform.app.InstrumentationRegistry
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap
import com.google.common.truth.Truth.assertThat
import org.junit.Before
import org.junit.Test
import java.io.File

/**
 * The streaming save against a real zingolib wallet: Rust fills the plain
 * temp, verifies it by digest, and the rename is the only step that
 * touches the wallet path, so a kill anywhere before the rename leaves the
 * previous wallet file intact.
 *
 * Run: ./gradlew :app:connectedProdDebugAndroidTest \
 *   -Pandroid.testInstrumentationRunnerArguments.class=org.ZingoLabs.Zingo.WalletStreamingSaveTest
 */
class WalletStreamingSaveTest {
    private val fileName = Constants.WalletFileName.value
    private val context = InstrumentationRegistry.getInstrumentation().targetContext
    private val rpcModule = RPCModule(MainApplication.getAppReactContext())

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

    private fun walletFile() = File(context.filesDir, fileName)
    private fun tempFile() = File(context.filesDir, "$fileName.plain.tmp")

    private fun load(): String = rpcModule.loadExistingWalletNative("", "main", "Medium", "1")

    @Before
    fun aFreshOfflineWallet() {
        for (suffix in listOf("", ".plain.tmp", ".migrating", ".write.tmp", ".prerepair", ".broken")) {
            File(context.filesDir, "$fileName$suffix").delete()
        }
        RPCModule.walletFileClosed = false
        uniffi.zingo.initLogging()
        uniffi.zingo.setCryptoDefaultProviderToRing()
        uniffi.zingo.initFromSeed(Seeds.HOSPITAL, 2000000u, "", "main", "Medium", 1u)
    }

    @Test
    fun aSaveStreamsAFileTheFullParseAcceptsAndTheLoadOpens() {
        assertThat(rpcModule.saveWalletFile()).isTrue()

        assertThat(tempFile().exists()).isFalse()
        uniffi.zingo.validateWalletFile(walletFile().path)
        assertThat(load()).contains(Seeds.HOSPITAL)
    }

    @Test
    fun aStaleTempFromAKilledSaveNeitherLoadsNorSurvivesTheNextSave() {
        assertThat(rpcModule.saveWalletFile()).isTrue()
        val saved = walletFile().readBytes()
        tempFile().writeBytes(saved.copyOf(saved.size / 2))

        assertThat(load()).contains(Seeds.HOSPITAL)
        assertThat(walletFile().readBytes()).isEqualTo(saved)

        // A load clears zingolib's save flag, so the next save only writes
        // once the wallet changed again.
        uniffi.zingo.createNewUnifiedAddress("o")
        val before = walletFile().lastModified()
        Thread.sleep(20)
        assertThat(rpcModule.saveWalletFile()).isTrue()
        assertThat(walletFile().lastModified()).isGreaterThan(before)
        assertThat(tempFile().exists()).isFalse()
        assertThat(PlainWalletFile.staleTemps(context.filesDir, fileName)).isEmpty()
        uniffi.zingo.validateWalletFile(walletFile().path)
    }

    @Test
    fun aCompleteTempFromAKilledSaveLeavesTheOlderWalletInPlace() {
        assertThat(rpcModule.saveWalletFile()).isTrue()
        val older = walletFile().readBytes()
        uniffi.zingo.initFromSeed(Seeds.HOSPITAL, 2100000u, "", "main", "Medium", 1u)
        val newer = WalletFixtures.savedWalletBytes(context)
        assertThat(newer).isNotEqualTo(older)
        tempFile().writeBytes(newer)

        val exists = CapturingPromise()
        rpcModule.walletExists(exists)
        assertThat(exists.resolved).containsExactly(true)
        assertThat(walletFile().readBytes()).isEqualTo(older)
        assertThat(load()).contains(Seeds.HOSPITAL)
        assertThat(walletFile().readBytes()).isEqualTo(older)
    }

    @Test
    fun aDirectoryLeftAtTheTempNameNeitherBlocksNorSurvivesTheNextSave() {
        assertThat(rpcModule.saveWalletFile()).isTrue()
        val saved = walletFile().readBytes()
        tempFile().mkdir()
        File(tempFile(), "occupied").writeBytes(ByteArray(1))
        uniffi.zingo.createNewUnifiedAddress("o")

        assertThat(rpcModule.saveWalletFile()).isTrue()

        assertThat(walletFile().readBytes()).isNotEqualTo(saved)
        uniffi.zingo.validateWalletFile(walletFile().path)
        assertThat(tempFile().exists()).isFalse()
    }

    @Test
    fun aSaveWhoseTempCannotBeWrittenLeavesTheWalletFileUntouched() {
        assertThat(rpcModule.saveWalletFile()).isTrue()
        val saved = walletFile().readBytes()
        uniffi.zingo.createNewUnifiedAddress("o")

        // A directory at the temp's own name makes Rust's create fail.
        val failure = try {
            PlainWalletFile.write(context.filesDir, fileName) { temp ->
                temp.mkdir()
                try {
                    uniffi.zingo.saveWalletFile(temp.path)
                } finally {
                    temp.delete()
                }
            }
            null
        } catch (e: uniffi.zingo.ZingolibException.Save) {
            e
        }

        assertThat(failure).isNotNull()
        assertThat(walletFile().readBytes()).isEqualTo(saved)
        assertThat(PlainWalletFile.staleTemps(context.filesDir, fileName)).isEmpty()
    }

    @Test
    fun theSavedFileSalvagesItsSeedThroughTheStablePrefix() {
        assertThat(rpcModule.saveWalletFile()).isTrue()
        val salvaged = org.json.JSONObject(uniffi.zingo.readWalletRecoveryInfoFile(walletFile().path))
        assertThat(salvaged.getString("seed_phrase")).isEqualTo(Seeds.HOSPITAL)
    }
}
