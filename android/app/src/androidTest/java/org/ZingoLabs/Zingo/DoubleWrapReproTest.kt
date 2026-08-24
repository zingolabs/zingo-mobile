package org.ZingoLabs.Zingo

import android.util.Base64
import androidx.security.crypto.EncryptedFile
import androidx.security.crypto.MasterKeys
import androidx.test.platform.app.InstrumentationRegistry
import com.google.common.truth.Truth.assertThat
import org.junit.After
import org.junit.Before
import org.junit.Test
import java.io.File
import java.io.IOException

/**
 * The 2.0.21 double-wrap (#965) replayed against the real Keystore, the real
 * EncryptedFile and a real zingolib wallet: migrated once with a working
 * Keystore, then launches whose trial decrypt fails transiently. On the
 * unguarded migration each such launch wraps the envelope again and zingolib
 * then reads the inner Tink header as the wallet version, so these tests FAIL
 * while the #965 bug is present and pass once the plain-wallet guard (#1301)
 * lands.
 *
 * Run: ./gradlew :app:connectedProdDebugAndroidTest \
 *   -Pandroid.testInstrumentationRunnerArguments.class=org.ZingoLabs.Zingo.DoubleWrapReproTest
 */
class DoubleWrapReproTest {
    private val fileName = Constants.WalletFileName.value
    private val context = InstrumentationRegistry.getInstrumentation().targetContext
    private val rpcModule = RPCModule(MainApplication.getAppReactContext())
    private val defaultTrialDecrypt = rpcModule.migrationTrialDecrypt

    // Offline wallet: empty server uri, a post-Sapling birthday. No network needed.
    private val chainHint = "main"
    private lateinit var plainWallet: ByteArray

    private fun walletFile() = File(context.filesDir, fileName)
    private fun migratingFile() = File(context.filesDir, "$fileName.migrating")

    private fun encryptedFile(): EncryptedFile {
        val alias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)
        return EncryptedFile.Builder(walletFile(), context, alias, EncryptedFile.FileEncryptionScheme.AES256_GCM_HKDF_4KB).build()
    }

    // What the app stores: base64 text inside the envelope. Decoded here.
    private fun storedPayload(): ByteArray {
        val text = encryptedFile().openFileInput().use { it.readBytes() }
        return Base64.decode(text, Base64.NO_WRAP)
    }

    // What zingolib does first with the bytes it receives: read a u64-LE version.
    private fun versionAsZingolibReadsIt(bytes: ByteArray): ULong {
        var v = 0UL
        for (i in 7 downTo 0) v = (v shl 8) or (bytes[i].toULong() and 0xFFUL)
        return v
    }

    // Tink 1.5.0 wording for the transient path the reported devices hit.
    private val transientKeystoreFailure: (String) -> Unit = {
        throw IOException("Keystore temporarily unavailable")
    }

    private fun loadError(): String? = try {
        rpcModule.loadExistingWalletNative("", chainHint, "Medium", "1")
        null
    } catch (e: Exception) {
        e.message ?: e.toString()
    }

    @Before
    fun plainWalletMigratedOnceWithAWorkingKeystore() {
        for (suffix in listOf("", ".write.tmp", ".migrating")) {
            File(context.filesDir, "$fileName$suffix").delete()
        }
        uniffi.zingo.initLogging()
        uniffi.zingo.setCryptoDefaultProviderToRing()
        uniffi.zingo.initFromSeed(Seeds.HOSPITAL, 2000000u, "", chainHint, "Medium", 1u)
        plainWallet = uniffi.zingo.saveWalletBytes()!!
        assertThat(versionAsZingolibReadsIt(plainWallet)).isAtMost(1000UL)

        // A ≤2.0.20 plain wallet on disk, then the 2.0.21 migration.
        walletFile().writeBytes(plainWallet)
        rpcModule.migrateFileIfNeeded(fileName)
        assertThat(storedPayload()).isEqualTo(plainWallet)
        assertThat(loadError()).isNull()
    }

    @After
    fun restoreTrialDecrypt() {
        rpcModule.migrationTrialDecrypt = defaultTrialDecrypt
    }

    @Test
    fun oneTransientTrialDecryptFailureLeavesTheWalletSingleWrapped() {
        val fileBefore = walletFile().readBytes()
        rpcModule.migrationTrialDecrypt = transientKeystoreFailure
        rpcModule.migrateFileIfNeeded(fileName)
        rpcModule.migrationTrialDecrypt = defaultTrialDecrypt

        // The guard reads the raw file, sees a Tink envelope rather than a
        // plain wallet, and refuses to migrate: bytes on disk are unchanged.
        assertThat(walletFile().readBytes()).isEqualTo(fileBefore)
        assertThat(migratingFile().exists()).isFalse()
        val payload = storedPayload()
        assertThat(payload).isEqualTo(plainWallet)
        assertThat(versionAsZingolibReadsIt(payload)).isAtMost(1000UL)
        assertThat(loadError()).isNull()
    }

    @Test
    fun repeatedFailingLaunchesLeaveTheWalletAlone() {
        val fileBefore = walletFile().readBytes()
        rpcModule.migrationTrialDecrypt = transientKeystoreFailure
        rpcModule.migrateFileIfNeeded(fileName)
        rpcModule.migrateFileIfNeeded(fileName)
        rpcModule.migrateFileIfNeeded(fileName)
        assertThat(walletFile().readBytes()).isEqualTo(fileBefore)
        assertThat(storedPayload()).isEqualTo(plainWallet)
    }

    @Test
    fun aWorkingTrialDecryptLeavesTheWalletAlone() {
        rpcModule.migrateFileIfNeeded(fileName)
        assertThat(storedPayload()).isEqualTo(plainWallet)
        assertThat(loadError()).isNull()
    }
}
