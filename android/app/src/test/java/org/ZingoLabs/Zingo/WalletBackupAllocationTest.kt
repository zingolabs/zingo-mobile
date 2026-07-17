// The application's historical package name predates detekt, and the
// baseline may never grow, so every new file carries this suppression.
@file:Suppress("PackageName")

package org.ZingoLabs.Zingo

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Test

/**
 * The restore guard's allocation contract: `isRestorable` answers on
 * the synchronous native-modules thread, so its structural
 * classification must be an O(1) char scan that never materializes
 * decoded or re-encoded copies of the wallet base64. A decode and
 * re-encode round trip transiently allocates roughly 1.75 times the
 * input, which crashes low-RAM 32-bit devices with an
 * `OutOfMemoryError` when wallets are large — and an
 * `OutOfMemoryError` is an `Error`, so it escapes the `Exception`
 * containment in `restoreExistingWalletBackup` and takes down the
 * bridge instead of resolving false. Both the accepting and the
 * rejecting path are measured, because both run before the promise
 * settles. The measurement uses HotSpot's per-thread allocation
 * accounting, so on a JVM without it the tests skip rather than fail.
 */
class WalletBackupAllocationTest {
    private companion object {
        // A payload of one mebi-group is four mebibytes of characters:
        // wallet-sized enough for a robust signal, small enough for a
        // fast test.
        const val GROUP_COUNT = 1_048_576

        // The budget is a quarter of the input: comfortably above the
        // char scan's constant overhead, and far below even one full
        // copy of the input.
        const val BUDGET_DIVISOR = 4L
    }

    @Test
    fun acceptingAWalletSizedPayloadAllocatesFarBelowTheInputSize() {
        val probe = hotSpotAllocationProbe()
        val content = "Qmln".repeat(GROUP_COUNT)
        // Warm the path first, so class loading and JIT compilation do
        // not pollute the measurement.
        assertTrue(WalletBackup.isRestorable(content))

        var restorable = false
        val allocated = probe.bytesAllocatedBy {
            restorable = WalletBackup.isRestorable(content)
        }

        assertTrue(restorable)
        assertAllocationWithinBudget(allocated, content.length)
    }

    @Test
    fun rejectingAWalletSizedPayloadAllocatesFarBelowTheInputSize() {
        val probe = hotSpotAllocationProbe()
        // The final group carries non-zero trailing bits ('m' is
        // 0b100110), which the Rust STANDARD engine rejects, so the
        // guard must classify the payload false — and the classifying
        // must stay O(1), because this is exactly the path that ends in
        // the promise resolving false.
        val content = "Qmln".repeat(GROUP_COUNT - 1) + "Qmm="
        assertFalse(WalletBackup.isRestorable(content))

        var restorable = true
        val allocated = probe.bytesAllocatedBy {
            restorable = WalletBackup.isRestorable(content)
        }

        assertFalse(restorable)
        assertAllocationWithinBudget(allocated, content.length)
    }

    private fun assertAllocationWithinBudget(allocated: Long, inputLength: Int) {
        val budget = inputLength / BUDGET_DIVISOR
        assertTrue(
            "isRestorable allocated $allocated bytes classifying a " +
                "$inputLength-character payload; the O(1) budget is $budget bytes",
            allocated < budget,
        )
    }

    private fun hotSpotAllocationProbe(): AllocationProbe {
        val probe = AllocationProbe.forCurrentJvmOrNull()
        assumeTrue(
            "per-thread allocation accounting needs a HotSpot JVM",
            probe != null,
        )
        checkNotNull(probe)
        assumeTrue(probe.isThreadAllocatedMemorySupported())
        probe.enableThreadAllocatedMemory()
        assumeTrue(probe.isThreadAllocatedMemoryEnabled())
        return probe
    }

    /**
     * Reflective access to HotSpot's `com.sun.management.ThreadMXBean`.
     * Unit tests compile against android.jar, which lacks the JMX
     * classes, but they run on the host JVM, which carries them.
     */
    private class AllocationProbe private constructor(
        private val bean: Any,
        private val hotSpotInterface: Class<*>,
    ) {
        fun isThreadAllocatedMemorySupported(): Boolean =
            hotSpotInterface
                .getMethod("isThreadAllocatedMemorySupported")
                .invoke(bean) as Boolean

        fun isThreadAllocatedMemoryEnabled(): Boolean =
            hotSpotInterface
                .getMethod("isThreadAllocatedMemoryEnabled")
                .invoke(bean) as Boolean

        fun enableThreadAllocatedMemory() {
            hotSpotInterface
                .getMethod("setThreadAllocatedMemoryEnabled", Boolean::class.javaPrimitiveType)
                .invoke(bean, true)
        }

        fun bytesAllocatedBy(action: () -> Unit): Long {
            val before = currentThreadAllocatedBytes()
            action()
            return currentThreadAllocatedBytes() - before
        }

        private fun currentThreadAllocatedBytes(): Long =
            hotSpotInterface
                .getMethod("getCurrentThreadAllocatedBytes")
                .invoke(bean) as Long

        companion object {
            fun forCurrentJvmOrNull(): AllocationProbe? = try {
                val factory = Class.forName("java.lang.management.ManagementFactory")
                val bean = factory.getMethod("getThreadMXBean").invoke(null)
                val hotSpotInterface = Class.forName("com.sun.management.ThreadMXBean")
                // Verify the current-thread accessor exists up front, so
                // an exotic JVM skips the tests instead of failing them.
                hotSpotInterface.getMethod("getCurrentThreadAllocatedBytes")
                if (hotSpotInterface.isInstance(bean)) {
                    AllocationProbe(bean, hotSpotInterface)
                } else {
                    null
                }
            } catch (_: ReflectiveOperationException) {
                null
            }
        }
    }
}
