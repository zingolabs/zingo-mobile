package org.ZingoLabs.Zingo

import android.util.Base64
import androidx.security.crypto.EncryptedFile
import androidx.security.crypto.MasterKeys
import androidx.test.platform.app.InstrumentationRegistry
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap
import com.google.common.truth.Truth.assertThat
import org.json.JSONObject
import org.junit.Before
import org.junit.Test
import java.io.File

/**
 * Adversarial scenarios against the path-based wallet persistence. Each
 * test states a rule the load, save, restore, or delete path must keep
 * and fails when the code breaks it.
 *
 * Run: ./gradlew :app:connectedProdDebugAndroidTest \
 *   -Pandroid.testInstrumentationRunnerArguments.class=org.ZingoLabs.Zingo.WalletAdversarialTest
 */
class WalletAdversarialTest {
    private val mainName = Constants.WalletFileName.value
    private val backupName = Constants.WalletBackupFileName.value
    private val swapName = Constants.WalletTempSwapFileName.value
    private val context = InstrumentationRegistry.getInstrumentation().targetContext
    private val rpcModule = RPCModule(MainApplication.getAppReactContext())

    private lateinit var walletA: ByteArray
    private lateinit var walletB: ByteArray
    private lateinit var walletC: ByteArray

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
        return WalletFixtures.savedWalletBytes(context)
    }

    // The 2.0.21 storage format: base64 text of the plain bytes inside a
    // Tink envelope whose AAD is the file name.
    private fun writeLegacyEncrypted(target: File, payload: ByteArray) {
        target.delete()
        val alias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)
        EncryptedFile.Builder(target, context, alias, EncryptedFile.FileEncryptionScheme.AES256_GCM_HKDF_4KB)
            .build()
            .openFileOutput()
            .use { it.write(Base64.encodeToString(payload, Base64.NO_WRAP).toByteArray(Charsets.UTF_8)) }
    }

    private fun restore(): List<Any?> {
        val promise = CapturingPromise()
        rpcModule.restoreExistingWalletBackup(promise)
        return promise.resolved
    }

    private fun exists(call: (Promise) -> Unit): Any? {
        val promise = CapturingPromise()
        call(promise)
        return promise.resolved.single()
    }

    @Before
    fun threeDistinctWallets() {
        val suffixes = listOf("", ".migrating", ".write.tmp", ".plain.tmp", ".prerepair", ".broken")
        for (name in listOf(mainName, backupName, swapName)) {
            for (suffix in suffixes) file("$name$suffix").deleteRecursively()
            PlainWalletFile.deleteTemps(context.filesDir, name)
        }
        context.filesDir.listFiles()?.filter { it.name.startsWith("$swapName.orphan.") }?.forEach { it.delete() }
        RPCModule.walletFileClosed = false
        uniffi.zingo.initLogging()
        uniffi.zingo.setCryptoDefaultProviderToRing()
        walletA = offlineWallet(2000000u)
        walletB = offlineWallet(2100000u)
        walletC = offlineWallet(2200000u)
    }

    private fun orphans(): List<File> =
        context.filesDir.listFiles()?.filter { it.name.startsWith("$swapName.orphan.") } ?: emptyList()

    // Rule: a restore installs the wallet it validated, and an orphan swap
    // temp from an earlier crash is kept as evidence instead of being
    // swapped in or overwritten.
    @Test
    fun aRestoreInstallsTheWalletItValidatedAndKeepsTheOrphan() {
        file(swapName).writeBytes(walletA)
        file(mainName).writeBytes(walletC)
        file(backupName).writeBytes(walletB)

        assertThat(restore()).containsExactly(true)

        assertThat(file(mainName).readBytes()).isEqualTo(walletB)
        assertThat(file(backupName).readBytes()).isEqualTo(walletC)
        assertThat(orphans().map { it.readBytes().toList() }).containsExactly(walletA.toList())
    }

    // Rule: a legacy swap temp is judged by its wallet content, so a copy of
    // the deleted wallet goes with it whatever its on-disk format.
    @Test
    fun aLegacyEncryptedSwapTempDoesNotResurrectTheDeletedWallet() {
        file(mainName).writeBytes(walletA)
        writeLegacyEncrypted(file(swapName), walletA)

        assertThat(exists(rpcModule::deleteExistingWallet)).isEqualTo(true)

        assertThat(exists(rpcModule::walletBackupExists)).isEqualTo(false)
        assertThat(file(swapName).exists()).isFalse()
    }

    // Rule: deleting the retained wallet is not undone by an orphan swap
    // temp at the next launch.
    @Test
    fun deletingTheRetainedWalletIsNotUndoneByAnOrphanSwapTemp() {
        file(mainName).writeBytes(walletC)
        file(backupName).writeBytes(walletB)
        file(swapName).writeBytes(walletA)

        assertThat(exists(rpcModule::deleteExistingWalletBackup)).isEqualTo(true)

        assertThat(exists(rpcModule::walletBackupExists)).isEqualTo(false)
        assertThat(file(mainName).readBytes()).isEqualTo(walletC)
    }

    // Rule: a sink that fails after the bytes landed is reported as a
    // storage problem, never as Keystore loss.
    @Test
    fun aSinkFailureAfterTheBytesLandIsReportedAsStorage() {
        writeLegacyEncrypted(file(mainName), walletA)
        val defaultDecrypt = rpcModule.legacyDecrypt
        rpcModule.legacyDecrypt = { _, sink -> sink.write(walletA); throw java.io.IOException("ENOSPC at close") }
        val message = try {
            rpcModule.loadExistingWalletNative("", "main", "Medium", "1")
            ""
        } catch (e: Exception) {
            e.message.orEmpty()
        } finally {
            rpcModule.legacyDecrypt = defaultDecrypt
        }

        // The bytes landed and the decrypt itself reported the failure, so
        // the diagnosis names neither storage nor the Keystore as certain.
        assertThat(message).isNotEmpty()
        assertThat(file(mainName).readBytes()).isNotEqualTo(walletA)
    }

    // Rule: a backup that fails the full parse is refused and both slots
    // stay as they were.
    @Test
    fun aTruncatedBackupIsRefusedAndTouchesNothing() {
        file(mainName).writeBytes(walletA)
        file(backupName).writeBytes(walletB.copyOf(walletB.size / 2))

        assertThat(restore()).containsExactly(false)

        assertThat(file(mainName).readBytes()).isEqualTo(walletA)
        assertThat(file(backupName).readBytes()).isEqualTo(walletB.copyOf(walletB.size / 2))
        assertThat(file(swapName).exists()).isFalse()
    }

    // Rule: deleting the wallet leaves no copy of it in the retained slot.
    @Test
    fun aSwapTempDoesNotResurrectTheDeletedWalletAsTheRetainedOne() {
        file(mainName).writeBytes(walletA)
        file(swapName).writeBytes(walletA)

        assertThat(exists(rpcModule::deleteExistingWallet)).isEqualTo(true)

        assertThat(exists(rpcModule::walletBackupExists)).isEqualTo(false)
    }

    // Rule: deleting the wallet with a swap temp the recovery refuses to
    // consume must not bring the wallet back at the next launch.
    @Test
    fun anUnconsumedSwapTempDoesNotResurrectTheDeletedWalletAtTheNextLaunch() {
        file(swapName).writeBytes(walletA)
        file(mainName).writeBytes(walletC)
        file(backupName).writeBytes(walletB)

        assertThat(exists(rpcModule::deleteExistingWallet)).isEqualTo(true)

        assertThat(exists(rpcModule::walletExists)).isEqualTo(false)
    }

    // Rule: a restore that reports failure is not completed later by the
    // startup recovery, and saves stay possible.
    @Test
    fun aRestoreThatReportsFailureIsNotCompletedByTheNextExistsCheck() {
        file(mainName).writeBytes(walletA)
        file(backupName).writeBytes(walletB)
        rpcModule.restoreStepHook = { step -> if (step == 2) throw java.io.IOException("disk full") }
        try {
            assertThat(restore()).containsExactly(false)
        } finally {
            rpcModule.restoreStepHook = {}
        }

        exists(rpcModule::walletExists)

        assertThat(file(mainName).readBytes()).isEqualTo(walletA)
        assertThat(file(backupName).readBytes()).isEqualTo(walletB)
        assertThat(file(swapName).exists()).isFalse()
        assertThat(RPCModule.walletFileClosed).isFalse()
    }

    // Rule: a restore interrupted after main was rewritten reports success,
    // since the main slot holds the backup, and the retained copy completes
    // at the next launch, the crash case the swap temp exists for.
    @Test
    fun aRestoreInterruptedAfterMainWasRewrittenCompletesAtTheNextLaunch() {
        file(mainName).writeBytes(walletA)
        file(backupName).writeBytes(walletB)
        rpcModule.restoreStepHook = { step -> if (step == 3) throw java.io.IOException("killed") }
        try {
            assertThat(restore()).containsExactly(true)
        } finally {
            rpcModule.restoreStepHook = {}
        }
        assertThat(RPCModule.walletFileClosed).isTrue()

        exists(rpcModule::walletExists)

        assertThat(file(mainName).readBytes()).isEqualTo(walletB)
        assertThat(file(backupName).readBytes()).isEqualTo(walletA)
        assertThat(file(swapName).exists()).isFalse()
    }

    // Rule: a directory left at the old fixed temp name blocks nothing and
    // is swept by the migration's install.
    @Test
    fun aStaleDirectoryAtTheTempNameDoesNotBlockAMigration() {
        writeLegacyEncrypted(file(mainName), walletA)
        val stale = file("$mainName.plain.tmp")
        stale.mkdir()
        File(stale, "occupied").writeBytes(ByteArray(1))

        assertThat(rpcModule.loadExistingWalletNative("", "main", "Medium", "1")).contains(Seeds.HOSPITAL)

        assertThat(file(mainName).readBytes()).isEqualTo(walletA)
        assertThat(stale.exists()).isFalse()
    }

    // Rule: zingolib clears the save flag on every read, so a save right
    // after a load is a no-op until the wallet changes. A benchmark or a
    // test that loads then saves must dirty the wallet first.
    @Test
    fun aSaveRightAfterALoadIsANoOpUntilTheWalletChanges() {
        file(mainName).writeBytes(walletA)
        rpcModule.loadExistingWalletNative("", "main", "Medium", "1")
        val before = file(mainName).lastModified()
        Thread.sleep(20)

        assertThat(JSONObject(uniffi.zingo.getWalletSaveRequired()).getBoolean("save_required")).isFalse()
        assertThat(rpcModule.saveWalletFile()).isTrue()
        assertThat(file(mainName).lastModified()).isEqualTo(before)

        uniffi.zingo.createNewUnifiedAddress("o")
        assertThat(JSONObject(uniffi.zingo.getWalletSaveRequired()).getBoolean("save_required")).isTrue()
        assertThat(rpcModule.saveWalletFile()).isTrue()
        assertThat(file(mainName).lastModified()).isGreaterThan(before)
    }
}
