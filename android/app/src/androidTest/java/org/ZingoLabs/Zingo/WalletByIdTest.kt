package org.ZingoLabs.Zingo

import androidx.test.platform.app.InstrumentationRegistry
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap
import com.google.common.truth.Truth.assertThat
import org.json.JSONObject
import org.junit.Assert.assertThrows
import org.junit.Before
import org.junit.Test
import java.io.File
import java.io.FileNotFoundException

/**
 * The bridge methods that name a wallet by id: open, meta patch and delete.
 *
 * Run: ./gradlew :app:connectedProdDebugAndroidTest \
 *   -Pandroid.testInstrumentationRunnerArguments.class=org.ZingoLabs.Zingo.WalletByIdTest
 */
@OfflineDeviceTest
class WalletByIdTest {
    private val context = InstrumentationRegistry.getInstrumentation().targetContext
    private val base: File get() = context.filesDir
    private val rpcModule = RPCModule(MainApplication.getAppReactContext())

    private lateinit var plainWallet: ByteArray

    private class CapturingPromise : Promise {
        val resolved = mutableListOf<Any?>()
        val rejected = mutableListOf<String>()
        override fun resolve(value: Any?) { resolved.add(value) }
        override fun reject(code: String, message: String?) { rejected.add(code) }
        override fun reject(code: String, throwable: Throwable?) { rejected.add(code) }
        override fun reject(code: String, message: String?, throwable: Throwable?) { rejected.add(code) }
        override fun reject(throwable: Throwable) {}
        override fun reject(throwable: Throwable, userInfo: WritableMap) {}
        override fun reject(code: String, userInfo: WritableMap) { rejected.add(code) }
        override fun reject(code: String, throwable: Throwable?, userInfo: WritableMap) { rejected.add(code) }
        override fun reject(code: String, message: String?, userInfo: WritableMap) { rejected.add(code) }
        override fun reject(code: String?, message: String?, throwable: Throwable?, userInfo: WritableMap?) {}
        @Deprecated("Deprecated in the React Native Promise interface")
        override fun reject(message: String) {}
    }

    private fun aWallet(name: String): String {
        val id = WalletStore.allocate(base)
        PlainWalletFile.write(WalletStore.dir(base, id), WalletStore.WALLET, plainWallet)
        WalletStore.writeMeta(base, id, WalletStore.newMeta(base, id, name, "main", ""))
        return id
    }

    private fun load(id: String) = rpcModule.loadWalletNative(id, "", "main", "Medium", "1")

    private fun walletFile(id: String) = File(WalletStore.dir(base, id), WalletStore.WALLET)

    @Before
    fun twoWalletsOnDisk() {
        for (name in listOf(Constants.WalletFileName.value, Constants.WalletBackupFileName.value)) {
            File(base, name).delete()
        }
        WalletStore.root(base).deleteRecursively()
        RPCModule.openWalletId = null
        RPCModule.pendingMeta = null
        uniffi.zingo.initLogging()
        uniffi.zingo.initFromSeed(seed = Seeds.HOSPITAL, birthday = 2000000u, connection = testConnection("", "main"))
        plainWallet = uniffi.zingo.saveWalletBytes()!!
    }

    @Test
    fun loadingAWalletByIdMakesItTheActiveOne() {
        val first = aWallet("Wallet 1")
        val second = aWallet("Wallet 2")
        WalletStore.setActive(base, first)

        load(second)

        assertThat(WalletStore.active(base)).isEqualTo(second)
        assertThat(RPCModule.openWalletId).isEqualTo(second)
        assertThat(walletFile(first).exists()).isTrue()
    }

    @Test
    fun aFailedLoadLeavesTheActiveWallet() {
        val first = aWallet("Wallet 1")
        val broken = aWallet("Wallet 2")
        WalletStore.setActive(base, first)
        walletFile(broken).writeBytes(ByteArray(64) { 0x7f })

        assertThrows(Exception::class.java) { load(broken) }
        assertThrows(FileNotFoundException::class.java) { load("not-a-wallet") }

        assertThat(WalletStore.active(base)).isEqualTo(first)
    }

    @Test
    fun deletingAnotherWalletKeepsTheOpenOneSaving() {
        val open = aWallet("Wallet 1")
        val other = aWallet("Wallet 2")
        load(open)

        val promise = CapturingPromise()
        rpcModule.deleteWalletProcess(other, promise)

        assertThat(promise.resolved.single()).isEqualTo(true)
        assertThat(WalletStore.dir(base, other).exists()).isFalse()
        assertThat(rpcModule.saveWalletFile()).isTrue()
        assertThat(WalletStore.active(base)).isEqualTo(open)
    }

    @Test
    fun deletingTheOpenWalletClosesIt() {
        val open = aWallet("Wallet 1")
        load(open)

        val promise = CapturingPromise()
        rpcModule.deleteWalletProcess(open, promise)

        assertThat(promise.resolved.single()).isEqualTo(true)
        assertThat(rpcModule.saveWalletFile()).isFalse()
        assertThat(WalletStore.active(base)).isNull()
    }

    @Test
    fun aMetaPatchIsWrittenAndListed() {
        val id = aWallet("Wallet 1")

        val promise = CapturingPromise()
        rpcModule.updateWalletMetaProcess(id, JSONObject().put("name", "Savings").put("category", 3).toString(), promise)

        assertThat(JSONObject(promise.resolved.single() as String).getString("name")).isEqualTo("Savings")
        val listed = CapturingPromise()
        rpcModule.walletsInfo(listed)
        val meta = JSONObject(listed.resolved.single() as String).getJSONArray("wallets").getJSONObject(0).getJSONObject("meta")
        assertThat(meta.getString("name")).isEqualTo("Savings")
        assertThat(meta.getInt("category")).isEqualTo(3)
    }

    @Test
    fun aMetaPatchOnAnUnknownWalletRejects() {
        val promise = CapturingPromise()
        rpcModule.updateWalletMetaProcess("not-a-wallet", "{}", promise)

        assertThat(promise.resolved).isEmpty()
        assertThat(promise.rejected.single()).isEqualTo("Unknown")
    }

    @Test
    fun theDiskSpaceReportsTheLargestWallet() {
        aWallet("Wallet 1")

        val promise = CapturingPromise()
        rpcModule.diskSpaceInfo(promise)

        val info = JSONObject(promise.resolved.single() as String)
        assertThat(info.getLong("largest")).isEqualTo(plainWallet.size.toLong())
        assertThat(info.getLong("free")).isGreaterThan(0L)
    }
}
