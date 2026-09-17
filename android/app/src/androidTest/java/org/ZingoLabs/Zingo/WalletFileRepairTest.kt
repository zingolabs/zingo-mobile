package org.ZingoLabs.Zingo

import android.util.Base64
import androidx.security.crypto.EncryptedFile
import androidx.security.crypto.MasterKeys
import androidx.test.platform.app.InstrumentationRegistry
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap
import com.google.common.truth.Truth.assertThat
import org.junit.Before
import org.junit.Test
import java.io.File

/**
 * Diagnosis and repair against the real Keystore under the Step 1 plain
 * format: raw plain bytes diagnose healthy, a legacy envelope diagnoses
 * `encryptedLegacy`, the double wrap repairs back to plain bytes, and a
 * restore over an undecryptable main keeps the raw evidence aside.
 */
class WalletFileRepairTest {
    private val fileName = Constants.WalletFileName.value
    private val backupName = Constants.WalletBackupFileName.value
    private val swapName = Constants.WalletTempSwapFileName.value
    private val context = InstrumentationRegistry.getInstrumentation().targetContext
    private val rpcModule = RPCModule(MainApplication.getAppReactContext())

    // Captures the single resolve the restore path settles with.
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

    // A real offline zingolib wallet: the recovery writes run the full
    // parse.
    private lateinit var plainWallet: ByteArray

    // A Tink-looking header the keyset cannot open.
    private val undecryptableBytes = ByteArray(64) { i -> if (i == 0) 0x28 else (i * 13).toByte() }

    private fun walletFile() = File(context.filesDir, fileName)

    private fun encryptedFile(file: File): EncryptedFile {
        val alias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)
        return EncryptedFile.Builder(file, context, alias, EncryptedFile.FileEncryptionScheme.AES256_GCM_HKDF_4KB).build()
    }

    // The 2.0.21 storage format: base64 of the current bytes inside the
    // envelope. From plain bytes one call yields a legacy encrypted file,
    // a second call the double wrap.
    private fun wrapAgain(file: File = walletFile()) {
        val current = file.readBytes()
        file.delete()
        encryptedFile(file).openFileOutput().use {
            it.write(Base64.encodeToString(current, Base64.NO_WRAP).toByteArray(Charsets.UTF_8))
        }
    }

    private fun state(name: String): String =
        rpcModule.diagnoseWalletFile(name).getString("state")

    @Before
    fun freshPlainWallet() {
        for (suffix in listOf("", ".write.tmp", ".prerepair", ".migrating", ".broken")) {
            File(context.filesDir, "$fileName$suffix").delete()
        }
        File(context.filesDir, backupName).delete()
        File(context.filesDir, swapName).delete()
        uniffi.zingo.initLogging()
        uniffi.zingo.setCryptoDefaultProviderToRing()
        uniffi.zingo.initFromSeed(Seeds.HOSPITAL, 2000000u, "", "main", "Medium", 1u)
        plainWallet = uniffi.zingo.saveWalletBytes()!!
        walletFile().writeBytes(plainWallet)
        assertThat(state(fileName)).isEqualTo("plainWallet")
    }

    @Test
    fun aLegacyEnvelopeDiagnosesEncryptedLegacy() {
        wrapAgain()
        assertThat(state(fileName)).isEqualTo("encryptedLegacy")
    }

    @Test
    fun doubleWrappedWalletIsDiagnosedAndRepairedToPlainBytes() {
        wrapAgain()
        wrapAgain()

        val before = rpcModule.diagnoseWalletFile(fileName)
        assertThat(before.getString("state")).isEqualTo("doubleWrapped")
        assertThat(before.getBoolean("repairable")).isTrue()
        assertThat(before.getInt("depth")).isEqualTo(1)

        assertThat(rpcModule.repairDoubleWrappedFile(fileName)).isEqualTo("repaired")

        assertThat(state(fileName)).isEqualTo("plainWallet")
        assertThat(walletFile().readBytes()).isEqualTo(plainWallet)
        assertThat(File(context.filesDir, "$fileName.prerepair").exists()).isTrue()
    }

    @Test
    fun tripleWrappedWalletIsRepaired() {
        repeat(3) { wrapAgain() }
        assertThat(rpcModule.diagnoseWalletFile(fileName).getInt("depth")).isEqualTo(2)
        assertThat(rpcModule.repairDoubleWrappedFile(fileName)).isEqualTo("repaired")
        assertThat(walletFile().readBytes()).isEqualTo(plainWallet)
    }

    @Test
    fun envelopesBeyondTheDepthLimitAreNotRepaired() {
        // Five envelopes leave four to unwrap, one past MAX_UNWRAP_DEPTH.
        repeat(5) { wrapAgain() }
        val diagnosis = rpcModule.diagnoseWalletFile(fileName)
        assertThat(diagnosis.getString("state")).isEqualTo("doubleWrapped")
        assertThat(diagnosis.getBoolean("repairable")).isFalse()
        assertThat(diagnosis.getJSONArray("unwrapErrors").toString())
            .contains("still an envelope")
        assertThat(rpcModule.repairDoubleWrappedFile(fileName)).isEqualTo("failed")
    }

    @Test
    fun restoreBackupSucceedsWhenMainIsUndecryptable() {
        // A healthy legacy encrypted backup, as a fleet device would hold.
        File(context.filesDir, backupName).writeBytes(plainWallet)
        wrapAgain(File(context.filesDir, backupName))
        walletFile().delete()
        walletFile().writeBytes(undecryptableBytes)

        val promise = CapturingPromise()
        rpcModule.restoreExistingWalletBackup(promise)

        assertThat(promise.resolved).containsExactly(true)
        assertThat(walletFile().readBytes()).isEqualTo(plainWallet)
        assertThat(File(context.filesDir, "$fileName.broken").exists()).isTrue()
    }

    @Test
    fun diagnosisCarriesTheSupportReportFields() {
        val healthy = rpcModule.diagnoseWalletFile(fileName)
        assertThat(healthy.getLong("mtime")).isGreaterThan(0L)
        assertThat(healthy.getString("head")).isNotEmpty()

        wrapAgain()
        wrapAgain()
        val doubleWrapped = rpcModule.diagnoseWalletFile(fileName)
        assertThat(doubleWrapped.getJSONArray("unwrapErrors").length()).isEqualTo(0)

        val garbageName = "$fileName.garbagediag"
        try {
            File(context.filesDir, garbageName).writeBytes(undecryptableBytes)
            val undecryptable = rpcModule.diagnoseWalletFile(garbageName)
            assertThat(undecryptable.getString("state")).isEqualTo("undecryptable")
            assertThat(undecryptable.getString("readError")).isNotEmpty()
        } finally {
            File(context.filesDir, garbageName).delete()
        }
    }

    @Test
    fun repairSkipsAHealthyPlainWallet() {
        assertThat(rpcModule.repairDoubleWrappedFile(fileName)).isEqualTo("skipped")
        assertThat(walletFile().readBytes()).isEqualTo(plainWallet)
    }

    @Test
    fun anUndecryptableFileStaysUntouched() {
        walletFile().delete()
        walletFile().writeBytes(undecryptableBytes)
        assertThat(rpcModule.repairDoubleWrappedFile(fileName)).isEqualTo("skipped")
        assertThat(walletFile().readBytes()).isEqualTo(undecryptableBytes)
        assertThat(state(fileName)).isEqualTo("undecryptable")
    }
}
