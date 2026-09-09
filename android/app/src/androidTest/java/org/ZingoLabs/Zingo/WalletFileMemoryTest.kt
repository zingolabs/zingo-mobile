package org.ZingoLabs.Zingo

import android.util.Base64
import android.util.Log
import androidx.test.platform.app.InstrumentationRegistry
import com.google.common.truth.Truth.assertThat
import org.junit.Before
import org.junit.Test
import java.io.File

/**
 * What each wallet-file path allocates on top of the wallet it already
 * holds. Every guarded path must stay flat as the wallet grows, so its
 * budget is a fixed byte count rather than a multiple of the file.
 *
 * Each measurement prints a `[memory]` line that
 * `scripts/wallet_memory_bench.mts` reads to compare against the recorded
 * baseline.
 *
 * Run: ./gradlew :app:connectedProdDebugAndroidTest \
 *   -Pandroid.testInstrumentationRunnerArguments.class=org.ZingoLabs.Zingo.WalletFileMemoryTest
 */
class WalletFileMemoryTest {
    private val context = InstrumentationRegistry.getInstrumentation().targetContext
    private val dir get() = context.filesDir
    private val mainName = Constants.WalletFileName.value
    private val backupName = Constants.WalletBackupFileName.value
    private val swapName = Constants.WalletTempSwapFileName.value

    private val megabyte = 1024 * 1024
    private val walletSize = 8 * megabyte

    // A streamed path holds its I/O buffer and nothing else. The ceiling
    // leaves room for device noise while staying far below the smallest
    // copy a regression could reintroduce.
    private val streamedBudget = megabyte.toLong()

    private fun wallet(size: Int, fill: Byte): ByteArray =
        ByteArray(size).also {
            it[0] = 42
            java.util.Arrays.fill(it, 8, size, fill)
        }

    // The peak heap a block adds above the heap it starts with.
    private fun peakGrowth(block: () -> Unit): Long {
        val runtime = Runtime.getRuntime()
        fun used() = runtime.totalMemory() - runtime.freeMemory()
        System.gc()
        Thread.sleep(150)
        val baseline = used()
        var peak = baseline
        val sampler = Thread {
            try {
                while (true) {
                    peak = maxOf(peak, used())
                    Thread.sleep(1)
                }
            } catch (stop: InterruptedException) {
                peak = maxOf(peak, used())
            }
        }
        sampler.start()
        try {
            block()
        } finally {
            sampler.interrupt()
            sampler.join()
        }
        return maxOf(0L, peak - baseline)
    }

    private fun record(key: String, kind: String, growth: Long) {
        Log.i("MAIN", "[memory] key=$key kind=$kind bytes=$growth wallet=$walletSize")
    }

    // A guarded path is one this codebase promises to keep flat.
    private fun guarded(key: String, block: () -> Unit) {
        val growth = peakGrowth(block)
        record(key, "guarded", growth)
        assertThat(growth).isLessThan(streamedBudget)
    }

    // The technique each guarded path replaced, measured beside it. The
    // floor also proves the harness detects a copy at all, so a broken
    // sampler reporting zero everywhere cannot pass silently.
    private fun reference(key: String, floor: Long, block: () -> Unit) {
        val growth = peakGrowth(block)
        record(key, "reference", growth)
        assertThat(growth).isAtLeast(floor)
    }

    @Before
    fun cleanFiles() {
        for (name in listOf(mainName, backupName, swapName)) {
            for (suffix in listOf("", ".plain.tmp", ".migrating", ".write.tmp")) {
                File(dir, "$name$suffix").delete()
            }
        }
    }

    @Test
    fun theWriteVerifyHoldsNoSecondCopyOfTheWallet() {
        val bytes = wallet(walletSize, 7)

        guarded("write.verify") { PlainWalletFile.write(dir, mainName, bytes) }

        reference("write.verify.wholeFile", walletSize / 2L) {
            File(dir, mainName).readBytes().contentEquals(bytes)
        }
    }

    @Test
    fun theSwapDecisionHoldsNoCopyOfAnyWallet() {
        File(dir, mainName).writeBytes(wallet(walletSize, 3))
        File(dir, backupName).writeBytes(wallet(walletSize, 5))
        File(dir, swapName).writeBytes(wallet(walletSize, 7))

        guarded("swap.decision") {
            val temp = PlainWalletFile.digest(dir, swapName)
            assertThat(temp.contentEquals(PlainWalletFile.digest(dir, mainName))).isFalse()
            assertThat(temp.contentEquals(PlainWalletFile.digest(dir, backupName))).isFalse()
        }

        reference("swap.decision.base64", walletSize.toLong()) {
            val temp = Base64.encodeToString(File(dir, swapName).readBytes(), Base64.NO_WRAP)
            assertThat(temp == Base64.encodeToString(File(dir, mainName).readBytes(), Base64.NO_WRAP)).isFalse()
            assertThat(temp == Base64.encodeToString(File(dir, backupName).readBytes(), Base64.NO_WRAP)).isFalse()
        }
    }

    @Test
    fun theRetainedWalletCheckReadsOnlyTheHeader() {
        File(dir, backupName).writeBytes(wallet(walletSize, 11))

        guarded("retained.check") {
            assertThat(PlainWalletFile.readsPlain(dir, backupName)).isTrue()
        }
    }
}
