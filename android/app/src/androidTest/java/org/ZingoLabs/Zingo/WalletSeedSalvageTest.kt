package org.ZingoLabs.Zingo

import androidx.test.platform.app.InstrumentationRegistry
import com.google.common.truth.Truth.assertThat
import org.json.JSONObject
import org.junit.Assert.assertThrows
import org.junit.Before
import org.junit.Test
import java.io.File

/**
 * Seed salvage against a real zingolib wallet: a wallet file cut anywhere
 * past its stable prefix still yields the seed and birthday, the damaged
 * bytes go aside as `.broken`, and an unreadable file fails typed.
 *
 * Run: ./gradlew :app:connectedProdDebugAndroidTest \
 *   -Pandroid.testInstrumentationRunnerArguments.class=org.ZingoLabs.Zingo.WalletSeedSalvageTest
 */
class WalletSeedSalvageTest {
    private val fileName = Constants.WalletFileName.value
    private val context = InstrumentationRegistry.getInstrumentation().targetContext
    private val rpcModule = RPCModule(MainApplication.getAppReactContext())
    private lateinit var plainWallet: ByteArray

    private fun walletFile() = File(context.filesDir, fileName)
    private fun brokenFile() = File(context.filesDir, "$fileName.broken")

    @Before
    fun aRealOfflineWallet() {
        walletFile().delete()
        brokenFile().delete()
        uniffi.zingo.initLogging()
        uniffi.zingo.setCryptoDefaultProviderToRing()
        uniffi.zingo.initFromSeed(Seeds.HOSPITAL, 2000000u, "", "main", "Medium", 1u)
        plainWallet = WalletFixtures.savedWalletBytes(context)
    }

    @Test
    fun aTruncatedWalletFileSalvagesTheSeed() {
        val truncated = plainWallet.copyOf(plainWallet.size / 2)
        walletFile().writeBytes(truncated)

        val salvaged = JSONObject(rpcModule.walletFileRecoveryInfoNative())

        assertThat(salvaged.getString("seed_phrase")).isEqualTo(Seeds.HOSPITAL)
        assertThat(salvaged.getLong("birthday")).isEqualTo(2000000L)
        assertThat(walletFile().readBytes()).isEqualTo(truncated)
        assertThat(brokenFile().readBytes()).isEqualTo(truncated)
    }

    @Test
    fun anIntactWalletFileSalvagesTheSameSeed() {
        walletFile().writeBytes(plainWallet)
        val salvaged = JSONObject(rpcModule.walletFileRecoveryInfoNative())
        assertThat(salvaged.getString("seed_phrase")).isEqualTo(Seeds.HOSPITAL)
    }

    @Test
    fun anUnreadableFileFailsAndLeavesNoBrokenCopy() {
        for (garbage in listOf(ByteArray(47) { 0x20 }, ByteArray(64) { i -> if (i == 0) 0x28 else (i * 13).toByte() })) {
            walletFile().writeBytes(garbage)
            assertThrows(Exception::class.java) { rpcModule.walletFileRecoveryInfoNative() }
            assertThat(brokenFile().exists()).isFalse()
        }
    }
}
