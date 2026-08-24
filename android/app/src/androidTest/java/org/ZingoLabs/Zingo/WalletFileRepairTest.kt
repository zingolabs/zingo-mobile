package org.ZingoLabs.Zingo

import android.util.Base64
import androidx.security.crypto.EncryptedFile
import androidx.security.crypto.MasterKeys
import androidx.test.platform.app.InstrumentationRegistry
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
    private val context = InstrumentationRegistry.getInstrumentation().targetContext
    private val rpcModule = RPCModule(MainApplication.getAppReactContext())

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
        for (suffix in listOf("", ".write.tmp", ".prerepair", ".migrating")) {
            File(context.filesDir, "$fileName$suffix").delete()
        }
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
