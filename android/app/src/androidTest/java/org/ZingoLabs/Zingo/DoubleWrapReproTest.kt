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
 * The 2.0.21 double-wrap incident class replayed against the Step 1 load
 * path with the real Keystore and a real zingolib wallet.
 *
 * Run: ./gradlew :app:connectedProdDebugAndroidTest \
 *   -Pandroid.testInstrumentationRunnerArguments.class=org.ZingoLabs.Zingo.DoubleWrapReproTest
 */
class DoubleWrapReproTest {
    private val fileName = Constants.WalletFileName.value
    private val context = InstrumentationRegistry.getInstrumentation().targetContext
    private val rpcModule = RPCModule(MainApplication.getAppReactContext())
    private val defaultLegacyDecrypt = rpcModule.legacyDecrypt

    // Offline wallet: empty server uri, a post-Sapling birthday. No network needed.
    private val chainHint = "main"
    private lateinit var plainWallet: ByteArray

    private fun walletFile() = File(context.filesDir, fileName)

    private fun encryptedFile(file: File = walletFile()): EncryptedFile {
        val alias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)
        return EncryptedFile.Builder(file, context, alias, EncryptedFile.FileEncryptionScheme.AES256_GCM_HKDF_4KB).build()
    }

    // What the 2.0.21 save path stored: base64 text inside the envelope.
    private fun writeEncryptedLegacyFile(payload: ByteArray) {
        walletFile().delete()
        encryptedFile().openFileOutput().use {
            it.write(Base64.encodeToString(payload, Base64.NO_WRAP).toByteArray(Charsets.UTF_8))
        }
    }

    // What the buggy migration did: wrap the envelope bytes a second time.
    private fun wrapAgain() {
        val envelope = walletFile().readBytes()
        writeEncryptedLegacyFile(envelope)
    }

    // Tink 1.5.0 wording for the transient path the reported devices hit.
    private val transientKeystoreFailure: (String) -> String = {
        throw IOException("Keystore temporarily unavailable")
    }

    private fun loadError(): String? = try {
        rpcModule.loadExistingWalletNative("", chainHint, "Medium", "1")
        null
    } catch (e: Exception) {
        e.message ?: e.toString()
    }

    @Before
    fun aLegacyEncryptedWalletOnDisk() {
        for (suffix in listOf("", ".write.tmp", ".migrating", ".prerepair", ".broken")) {
            File(context.filesDir, "$fileName$suffix").delete()
        }
        uniffi.zingo.initLogging()
        uniffi.zingo.setCryptoDefaultProviderToRing()
        uniffi.zingo.initFromSeed(Seeds.HOSPITAL, 2000000u, "", chainHint, "Medium", 1u)
        plainWallet = uniffi.zingo.saveWalletBytes()!!
        assertThat(WalletFileEnvelope.looksLikePlainWallet(plainWallet)).isTrue()

        // A 2.0.21+ device: the wallet rests inside the Tink envelope.
        writeEncryptedLegacyFile(plainWallet)
    }

    @After
    fun restoreLegacyDecrypt() {
        rpcModule.legacyDecrypt = defaultLegacyDecrypt
    }

    @Test
    fun theFirstLoadMigratesTheEncryptedFileToPlainBytes() {
        assertThat(loadError()).isNull()
        assertThat(walletFile().readBytes()).isEqualTo(plainWallet)
    }

    @Test
    fun aPlainWalletLoadsWithADeadKeystore() {
        walletFile().delete()
        walletFile().writeBytes(plainWallet)
        rpcModule.legacyDecrypt = transientKeystoreFailure
        assertThat(loadError()).isNull()
        assertThat(walletFile().readBytes()).isEqualTo(plainWallet)
    }

    @Test
    fun aTransientKeystoreFailureFailsTheLoadAndTouchesNothing() {
        val fileBefore = walletFile().readBytes()
        rpcModule.legacyDecrypt = transientKeystoreFailure
        assertThat(loadError()).contains("seed")
        assertThat(walletFile().readBytes()).isEqualTo(fileBefore)

        rpcModule.legacyDecrypt = defaultLegacyDecrypt
        assertThat(loadError()).isNull()
        assertThat(walletFile().readBytes()).isEqualTo(plainWallet)
    }

    @Test
    fun repeatedFailingLoadsNeverGrowTheFile() {
        val fileBefore = walletFile().readBytes()
        rpcModule.legacyDecrypt = transientKeystoreFailure
        repeat(3) { assertThat(loadError()).isNotNull() }
        assertThat(walletFile().readBytes()).isEqualTo(fileBefore)
    }

    @Test
    fun aDoubleWrappedFileIsUnwrappedAndMigratedOnLoad() {
        wrapAgain()
        assertThat(loadError()).isNull()
        assertThat(walletFile().readBytes()).isEqualTo(plainWallet)
        assertThat(File(context.filesDir, "$fileName.prerepair").exists()).isTrue()
    }

    @Test
    fun theLoadAlsoMigratesTheRetainedWallet() {
        val backupFile = File(context.filesDir, Constants.WalletBackupFileName.value)
        backupFile.delete()
        encryptedFile(backupFile).openFileOutput().use {
            it.write(Base64.encodeToString(plainWallet, Base64.NO_WRAP).toByteArray(Charsets.UTF_8))
        }

        assertThat(loadError()).isNull()

        assertThat(walletFile().readBytes()).isEqualTo(plainWallet)
        assertThat(backupFile.readBytes()).isEqualTo(plainWallet)
        backupFile.delete()
    }

    @Test
    fun anInterruptedMigrationRestoresFromTheMigratingCopy() {
        walletFile().delete()
        File(context.filesDir, "$fileName.migrating").writeBytes(plainWallet)
        assertThat(loadError()).isNull()
        assertThat(walletFile().readBytes()).isEqualTo(plainWallet)
        assertThat(File(context.filesDir, "$fileName.migrating").exists()).isFalse()
    }

    @Test
    fun aTruncatedMainRestoresFromTheWriteTemp() {
        walletFile().delete()
        walletFile().writeBytes(plainWallet.copyOf(plainWallet.size / 2))
        File(context.filesDir, "$fileName.write.tmp").writeBytes(plainWallet)

        rpcModule.completePendingWrite()

        assertThat(walletFile().readBytes()).isEqualTo(plainWallet)
        assertThat(File(context.filesDir, "$fileName.write.tmp").exists()).isFalse()
    }

    @Test
    fun anIntactMainDropsTheWriteTempOrphan() {
        walletFile().delete()
        walletFile().writeBytes(plainWallet)
        File(context.filesDir, "$fileName.write.tmp").writeBytes(plainWallet.copyOf(plainWallet.size / 2))

        rpcModule.completePendingWrite()

        assertThat(walletFile().readBytes()).isEqualTo(plainWallet)
        assertThat(File(context.filesDir, "$fileName.write.tmp").exists()).isFalse()
    }

    @Test
    fun aTruncatedMainKeepsTheMigratingCopy() {
        walletFile().delete()
        walletFile().writeBytes(plainWallet.copyOf(plainWallet.size / 2))
        File(context.filesDir, "$fileName.migrating").writeBytes(plainWallet)

        assertThat(loadError()).isNotNull()

        assertThat(File(context.filesDir, "$fileName.migrating").readBytes()).isEqualTo(plainWallet)
    }
}
