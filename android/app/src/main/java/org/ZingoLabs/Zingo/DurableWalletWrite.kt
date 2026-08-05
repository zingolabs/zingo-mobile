package org.ZingoLabs.Zingo

internal object WalletFileCoordinator {
    // React Native and WorkManager own separate RPCModule instances that
    // operate on the same wallet files.
    private val monitor = Any()

    fun <T> withLock(block: () -> T): T = synchronized(monitor, block)
}

/**
 * The write callback must return after the file and its directory entry are
 * durable. The previous content remains in the recovery file until startup
 * recovery can verify the replacement.
 */
internal class DurableWalletWrite(
    private val exists: (String) -> Boolean,
    private val read: (String) -> String,
    private val write: (String, String) -> Unit,
    private val delete: (String) -> Boolean,
    private val ensureDurable: (String) -> Unit,
    private val onRecovered: (String, String) -> Unit,
    private val onRecoveryError: (String, Exception) -> Unit,
) {
    fun save(fileName: String, content: String) = WalletFileCoordinator.withLock {
        val tempName = "$fileName.write.tmp"
        if (exists(fileName)) {
            write(tempName, read(fileName))
        }
        write(fileName, content)
    }

    fun complete(fileNames: Iterable<String>) = WalletFileCoordinator.withLock {
        for (fileName in fileNames) {
            val tempName = "$fileName.write.tmp"
            try {
                if (!exists(tempName)) continue

                val targetReadable = exists(fileName) && try {
                    read(fileName)
                    true
                } catch (_: Exception) {
                    false
                }
                if (!targetReadable) {
                    write(fileName, read(tempName))
                    onRecovered(fileName, tempName)
                } else {
                    ensureDurable(fileName)
                }

                // A failed cleanup leaves the recovery copy for the next launch.
                delete(tempName)
            } catch (e: Exception) {
                onRecoveryError(fileName, e)
            }
        }
    }

    fun discard(fileName: String) = WalletFileCoordinator.withLock {
        val tempName = "$fileName.write.tmp"
        if (exists(tempName) && !delete(tempName)) {
            false
        } else {
            delete(fileName)
        }
    }
}
