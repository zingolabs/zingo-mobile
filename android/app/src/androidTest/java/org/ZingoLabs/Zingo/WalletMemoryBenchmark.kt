package org.ZingoLabs.Zingo

import android.os.Debug
import android.os.ParcelFileDescriptor
import android.system.Os
import android.system.OsConstants
import android.util.Log
import androidx.test.platform.app.InstrumentationRegistry
import com.google.common.truth.Truth.assertThat
import org.json.JSONObject
import org.junit.Assume.assumeTrue
import org.junit.Test
import java.io.File
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Peak memory of a load and a save against a synced wallet file pushed to
 * the device. One JSON line goes to logcat under the `WalletMemory` tag:
 * the file size and, for each operation, the peak growth over the level
 * at entry of the native heap, the Java heap, and the resident set. The
 * benchmark skips when no `fixture` runner argument is given.
 * `scripts/bench_wallet_memory.mts` drives it and records the rows.
 */
class WalletMemoryBenchmark {
    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private val context = instrumentation.targetContext
    private val rpcModule = RPCModule(MainApplication.getAppReactContext())
    private val walletFile = File(context.filesDir, Constants.WalletFileName.value)
    private val fixture: String? = InstrumentationRegistry.getArguments().getString("fixture")
    private val pageSize = Os.sysconf(OsConstants._SC_PAGESIZE)

    private class Peak(val nativeHeap: Long, val javaHeap: Long, val rss: Long) {
        fun json(): JSONObject = JSONObject()
            .put("nativeHeap", nativeHeap)
            .put("javaHeap", javaHeap)
            .put("rss", rss)
    }

    // Streams the fixture through the shell user, which can read
    // /data/local/tmp where the app cannot.
    private fun copyFixture(sink: File) {
        val shell = instrumentation.uiAutomation.executeShellCommand("cat $fixture")
        ParcelFileDescriptor.AutoCloseInputStream(shell).use { input ->
            sink.outputStream().use { out -> input.copyTo(out) }
        }
    }

    private fun residentBytes(): Long =
        File("/proc/self/statm").readText().split(' ')[1].toLong() * pageSize

    // Samples the three measures every millisecond while `operation`
    // runs and reports their peak growth over the level at entry.
    private fun peakDuring(operation: () -> Unit): Peak {
        System.gc()
        val runtime = Runtime.getRuntime()
        val nativeBase = Debug.getNativeHeapAllocatedSize()
        val javaBase = runtime.totalMemory() - runtime.freeMemory()
        val rssBase = residentBytes()
        var nativePeak = nativeBase
        var javaPeak = javaBase
        var rssPeak = rssBase
        val running = AtomicBoolean(true)
        val sampler = Thread {
            while (running.get()) {
                nativePeak = maxOf(nativePeak, Debug.getNativeHeapAllocatedSize())
                javaPeak = maxOf(javaPeak, runtime.totalMemory() - runtime.freeMemory())
                rssPeak = maxOf(rssPeak, residentBytes())
                Thread.sleep(1)
            }
        }
        sampler.start()
        try {
            operation()
        } finally {
            running.set(false)
            sampler.join()
        }
        return Peak(nativePeak - nativeBase, javaPeak - javaBase, rssPeak - rssBase)
    }

    @Test
    fun peakMemoryOfLoadAndSaveOnASyncedWallet() {
        assumeTrue("no fixture argument", fixture != null)
        walletFile.delete()
        copyFixture(walletFile)
        assumeTrue("fixture $fixture is empty or unreadable", walletFile.length() > 0)
        RPCModule.walletFileClosed = false
        uniffi.zingo.initLogging()
        uniffi.zingo.setCryptoDefaultProviderToRing()
        val fileBytes = walletFile.length()

        val load = peakDuring { rpcModule.loadExistingWalletNative("", "main", "Medium", "1") }
        uniffi.zingo.createNewUnifiedAddress("o")
        val before = walletFile.lastModified()
        Thread.sleep(20)
        val save = peakDuring { assertThat(rpcModule.saveWalletFile()).isTrue() }
        assertThat(walletFile.lastModified()).isGreaterThan(before)
        uniffi.zingo.validateWalletFile(walletFile.path)

        Log.i(
            "WalletMemory",
            JSONObject()
                .put("platform", "android")
                .put("fileBytes", fileBytes)
                .put("load", load.json())
                .put("save", save.json())
                .toString()
        )
        walletFile.delete()
    }
}
