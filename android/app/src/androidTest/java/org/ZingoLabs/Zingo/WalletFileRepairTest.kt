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
 * Round trip of the double-wrap repair against the real Keystore: a plain
 * wallet is migrated once (correct), wrapped a second time the way the buggy
 * migration did it, then diagnosed and repaired back to a single envelope
 * whose payload is the original plain bytes.
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

    // Version 42 LE followed by filler, enough to look like a plain wallet.
    private val plainWallet = ByteArray(64) { i -> if (i == 0) 42 else if (i < 8) 0 else (i * 7).toByte() }

    private fun walletFile() = File(context.filesDir, fileName)

    private fun encryptedFile(file: File): EncryptedFile {
        val alias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)
        return EncryptedFile.Builder(file, context, alias, EncryptedFile.FileEncryptionScheme.AES256_GCM_HKDF_4KB).build()
    }

    // What the buggy migration did: base64 the envelope bytes and encrypt
    // them again under the same name.
    private fun wrapAgain() {
        val file = walletFile()
        val envelope = file.readBytes()
        file.delete()
        encryptedFile(file).openFileOutput().use {
            it.write(Base64.encodeToString(envelope, Base64.NO_WRAP).toByteArray(Charsets.UTF_8))
        }
    }

    @Before
    fun freshPlainWallet() {
        for (suffix in listOf("", ".write.tmp", ".prerepair", ".migrating", ".broken")) {
            File(context.filesDir, "$fileName$suffix").delete()
        }
        File(context.filesDir, backupName).delete()
        File(context.filesDir, swapName).delete()
        walletFile().writeBytes(plainWallet)
        rpcModule.migrateFileIfNeeded(fileName)
        assertThat(rpcModule.diagnoseWalletFile(fileName).getString("state")).isEqualTo("plainWallet")
    }

    @Test
    fun doubleWrappedWalletIsDiagnosedAndRepaired() {
        wrapAgain()

        val before = rpcModule.diagnoseWalletFile(fileName)
        assertThat(before.getString("state")).isEqualTo("doubleWrapped")
        assertThat(before.getBoolean("repairable")).isTrue()
        assertThat(before.getInt("depth")).isEqualTo(1)

        assertThat(rpcModule.repairDoubleWrappedFile(fileName)).isEqualTo("repaired")

        assertThat(rpcModule.diagnoseWalletFile(fileName).getString("state")).isEqualTo("plainWallet")
        assertThat(rpcModule.decryptedPayload(fileName)).isEqualTo(plainWallet)
        assertThat(File(context.filesDir, "$fileName.prerepair").exists()).isTrue()
    }

    @Test
    fun tripleWrappedWalletIsRepaired() {
        wrapAgain()
        wrapAgain()
        assertThat(rpcModule.diagnoseWalletFile(fileName).getInt("depth")).isEqualTo(2)
        assertThat(rpcModule.repairDoubleWrappedFile(fileName)).isEqualTo("repaired")
        assertThat(rpcModule.decryptedPayload(fileName)).isEqualTo(plainWallet)
    }

    @Test
    fun envelopesBeyondTheDepthLimitAreNotRepaired() {
        // Five envelopes leave four to unwrap, one past MAX_UNWRAP_DEPTH.
        repeat(4) { wrapAgain() }
        val diagnosis = rpcModule.diagnoseWalletFile(fileName)
        assertThat(diagnosis.getString("state")).isEqualTo("doubleWrapped")
        assertThat(diagnosis.getBoolean("repairable")).isFalse()
        assertThat(diagnosis.getJSONArray("unwrapErrors").toString())
            .contains("still an envelope")
        assertThat(rpcModule.repairDoubleWrappedFile(fileName)).isEqualTo("failed")
    }

    @Test
    fun restoreBackupSucceedsWhenMainIsUndecryptable() {
        // A healthy encrypted backup; its stored text is base64 of the wallet.
        encryptedFile(File(context.filesDir, backupName)).openFileOutput().use {
            it.write(Base64.encodeToString(plainWallet, Base64.NO_WRAP).toByteArray(Charsets.UTF_8))
        }
        // Main is undecryptable: a Tink-looking header the keyset cannot open.
        walletFile().writeBytes(ByteArray(64) { i -> if (i == 0) 0x28 else (i * 13).toByte() })

        val promise = CapturingPromise()
        rpcModule.restoreExistingWalletBackup(promise)

        assertThat(promise.resolved).containsExactly(true)
        assertThat(rpcModule.decryptedPayload(fileName)).isEqualTo(plainWallet)
        assertThat(File(context.filesDir, "$fileName.broken").exists()).isTrue()
    }

    @Test
    fun diagnosisCarriesTheSupportReportFields() {
        val healthy = rpcModule.diagnoseWalletFile(fileName)
        assertThat(healthy.getLong("mtime")).isGreaterThan(0L)
        assertThat(healthy.getString("head")).isNotEmpty()

        wrapAgain()
        val doubleWrapped = rpcModule.diagnoseWalletFile(fileName)
        assertThat(doubleWrapped.getJSONArray("unwrapErrors").length()).isEqualTo(0)

        val garbageName = "$fileName.garbagediag"
        try {
            val garbage = ByteArray(64) { i -> if (i == 0) 0x28 else (i * 13).toByte() }
            File(context.filesDir, garbageName).writeBytes(garbage)
            val undecryptable = rpcModule.diagnoseWalletFile(garbageName)
            assertThat(undecryptable.getString("state")).isEqualTo("undecryptable")
            assertThat(undecryptable.getString("readError")).isNotEmpty()
        } finally {
            File(context.filesDir, garbageName).delete()
        }
    }

    @Test
    fun repairSkipsAHealthyWallet() {
        assertThat(rpcModule.repairDoubleWrappedFile(fileName)).isEqualTo("skipped")
        assertThat(rpcModule.decryptedPayload(fileName)).isEqualTo(plainWallet)
    }

    @Test
    fun migrationRefusesAnEnvelopeItCannotDecrypt() {
        // A raw file that starts like a Tink envelope but is not one the
        // keyset can open must stay untouched instead of being wrapped.
        val garbage = ByteArray(64) { i -> if (i == 0) 0x28 else (i * 13).toByte() }
        walletFile().writeBytes(garbage)
        rpcModule.migrateFileIfNeeded(fileName)
        assertThat(walletFile().readBytes()).isEqualTo(garbage)
        assertThat(rpcModule.diagnoseWalletFile(fileName).getString("state")).isEqualTo("undecryptable")
    }
}
