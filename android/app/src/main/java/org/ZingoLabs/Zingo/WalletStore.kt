package org.ZingoLabs.Zingo

import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.util.UUID

/** The wallets on disk, one folder per wallet under `wallets/`, where the meta is the commit point. */
object WalletStore {
    const val WALLET = "wallet.dat"
    const val META = "meta.json"
    private const val ROOT = "wallets"
    private const val ACTIVE = "active.json"
    private const val DELETING = ".deleting"
    private const val VERSION = 1

    /** Sidecars the folder's own recovery reads, renamed after the wallet file. */
    private val WORKING_SIDECARS = listOf(".migrating", ".write.tmp")
    /** Evidence copies that decrypt only under their legacy name. */
    private val EVIDENCE_SIDECARS = listOf(".prerepair", ".broken")

    /** Meta fields only the store writes. */
    private val OWN_FIELDS = setOf("v", "id", "createdAt", "migratedFrom")

    class Wallet(val id: String, val meta: JSONObject, val hasFile: Boolean)

    fun root(base: File) = File(base, ROOT)

    fun dir(base: File, id: String) = File(root(base), id)

    /** The committed wallets, in the order they were added. */
    fun list(base: File): List<Wallet> =
        (root(base).listFiles() ?: emptyArray())
            .filter { it.isDirectory && !it.name.startsWith(".") && !it.name.endsWith(DELETING) }
            .filter { File(it, META).exists() }
            .map { Wallet(it.name, readMeta(it), File(it, WALLET).exists()) }
            .sortedBy { it.meta.optInt("order") }

    private fun readMeta(dir: File): JSONObject =
        try {
            JSONObject(File(dir, META).readText())
        } catch (e: Exception) {
            JSONObject()
        }

    fun writeMeta(base: File, id: String, meta: JSONObject) {
        writeAtomically(File(dir(base, id), META), meta.toString().toByteArray())
    }

    private fun writeAtomically(target: File, bytes: ByteArray) {
        target.parentFile?.mkdirs()
        val temp = File(target.parentFile, "${target.name}.tmp")
        FileOutputStream(temp).use { out ->
            out.write(bytes)
            out.fd.sync()
        }
        if (!temp.renameTo(target)) {
            temp.delete()
            throw IOException("Error: could not rename ${temp.name} onto ${target.name}")
        }
    }

    private fun pointer(base: File): String =
        try {
            JSONObject(File(root(base), ACTIVE).readText()).optString("id")
        } catch (e: Exception) {
            ""
        }

    /** The wallet the app opens, when its folder is committed. */
    fun active(base: File): String? =
        pointer(base).takeIf { it.isNotEmpty() && File(dir(base, it), META).exists() }

    fun setActive(base: File, id: String?) {
        val file = File(root(base), ACTIVE)
        if (id == null) {
            file.delete()
        } else {
            writeAtomically(file, JSONObject().put("id", id).toString().toByteArray())
        }
    }

    /** An empty folder for a new wallet, committed once its meta is written. */
    fun allocate(base: File): String {
        val id = UUID.randomUUID().toString()
        if (!dir(base, id).mkdirs()) {
            throw IOException("Error: could not create the folder of wallet $id")
        }
        return id
    }

    /** The meta of a new wallet, ordered after every wallet on disk. */
    fun newMeta(base: File, id: String, name: String, chain: String?, serverUri: String?, kind: String? = null): JSONObject {
        val order = (list(base).maxOfOrNull { it.meta.optInt("order") } ?: 0) + 1
        val meta = JSONObject()
            .put("v", VERSION)
            .put("id", id)
            .put("order", order)
            .put("createdAt", System.currentTimeMillis())
            .put("name", name)
        if (!chain.isNullOrEmpty()) meta.put("chain", chain)
        if (serverUri != null) meta.put("server", JSONObject().put("uri", serverUri))
        if (kind != null) meta.put("kind", kind)
        return meta
    }

    /** The meta with the patch's fields set, a null field removed, and the store's own fields untouched. */
    fun patchMeta(meta: JSONObject, patch: JSONObject): JSONObject {
        val patched = JSONObject(meta.toString())
        for (key in patch.keys()) {
            if (key in OWN_FIELDS) continue
            if (patch.isNull(key)) patched.remove(key) else patched.put(key, patch.get(key))
        }
        return patched
    }

    /** The wallets and the active one, as the bridge reports them. */
    fun info(base: File): JSONObject {
        val wallets = JSONArray()
        for (wallet in list(base)) {
            wallets.put(JSONObject().put("id", wallet.id).put("hasFile", wallet.hasFile).put("meta", wallet.meta))
        }
        return JSONObject().put("active", active(base) ?: JSONObject.NULL).put("wallets", wallets)
    }

    /** The size of the largest wallet file, the yardstick of the free-space check. */
    fun largestWallet(base: File): Long =
        list(base).maxOfOrNull { File(dir(base, it.id), WALLET).length() } ?: 0L

    /** Whether a failure, or any of its causes, is the storage running out of space. */
    fun isDiskFull(error: Throwable): Boolean =
        generateSequence(error) { it.cause }.take(8).any { cause ->
            val message = cause.message ?: ""
            message.contains("ENOSPC") || message.contains("No space left on device")
        }

    /** "Wallet n" with the lowest n no wallet uses. */
    fun defaultName(base: File): String {
        val names = list(base).map { it.meta.optString("name") }.toSet()
        var n = 1
        while ("Wallet $n" in names) n++
        return "Wallet $n"
    }

    /** Ends the deletes and drops the creates a crash interrupted, except the folder `keep`. */
    fun sweep(base: File, keep: String?) {
        for (child in root(base).listFiles() ?: return) {
            if (!child.isDirectory || child.name.startsWith(".")) continue
            if (child.name.endsWith(DELETING) || (child.name != keep && !File(child, META).exists())) {
                child.deleteRecursively()
            } else {
                File(child, "$META.tmp").delete()
                File(child, "$WALLET.plain.tmp").delete()
            }
        }
    }

    /** Deletes a wallet's folder, renamed first so a crash midway ends at the next sweep. */
    fun delete(base: File, id: String): Boolean {
        val folder = dir(base, id)
        if (!folder.exists()) return false
        val doomed = File(root(base), "$id$DELETING")
        doomed.deleteRecursively()
        if (!folder.renameTo(doomed)) return false
        if (pointer(base) == id) setActive(base, null)
        doomed.deleteRecursively()
        return true
    }

    /** Moves a legacy wallet file into its own folder, resumable after a crash because the meta records the file's digest first. */
    fun adoptLegacy(
        base: File,
        legacy: String,
        name: String,
        active: Boolean,
        chain: String?,
        serverUri: String?,
    ): String? {
        val file = File(base, legacy)
        if (!file.exists()) return null
        val digest = PlainWalletFile.digest(base, legacy).joinToString("") { "%02x".format(it) }
        val id = list(base).firstOrNull { !it.hasFile && it.meta.optString("migratedFrom") == digest }?.id
            ?: allocate(base).also { id ->
                writeMeta(base, id, newMeta(base, id, name, chain, serverUri).put("migratedFrom", digest))
            }
        if (active && active(base) == null) setActive(base, id)
        val folder = dir(base, id)
        for (suffix in WORKING_SIDECARS) {
            File(base, "$legacy$suffix").takeIf { it.exists() }?.renameTo(File(folder, "$WALLET$suffix"))
        }
        for (suffix in EVIDENCE_SIDECARS) {
            File(base, "$legacy$suffix").takeIf { it.exists() }?.renameTo(File(folder, "$legacy$suffix"))
        }
        if (!file.renameTo(File(folder, WALLET))) {
            throw IOException("Error: could not move $legacy into the folder of wallet $id")
        }
        return id
    }
}

/** A write refused because the storage is full, rejected to JS under its own code. */
class DiskFullException(cause: Throwable) : IOException(cause.message, cause)
