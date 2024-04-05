package org.ZingoLabs.Zingo

import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.experimental.categories.Category
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.google.common.collect.Range

object Seeds {
    const val ABANDON = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art"
    const val HOSPITAL = "hospital museum valve antique skate museum unfold vocal weird milk scale social vessel identify crowd hospital control album rib bulb path oven civil tank"
}

object Ufvk {
    const val ABANDON = "uview1vmle9qzgsmzn8qskg06cjjt406eq3euvkn8un3t6sk7fjd72qp72guyskktr2gvgcpmd99qgquxdw7s54v0dfxn3degzhxp9gmvpve6vlvv459pxfre05v6l47aqx47rgh86t6n77svstd8ff6d8cwtn98uq66k6u5jqrpyz0pqflkppfq3djscrd2acnc7ymkd6fssk0t4rh2ynaux7z4ylt38jqgjhnu88h2jz8qwd3t5dwsc3ycvsea6grs4zg76r9vw48r9zvlphnpfsgc5eqpum7hghdm2eguw4h6n9m8rhuzh0qdc24z4z5ftcv6xxvvs3yrugea23xlys3f9qv0fenh0xp0hej8enlr82esl54hn27d6432kygwqx700ez84e72f03vtmece73dftpjvv3v7w65yaz2rjwmarxjzrnn02u5kx4p7a42k5lxgcgqgwjyp9w6x24ccm0dvlf4637ss6l3xmuv2strza60c5k5uasdcn"
}

data class InitFromSeed (
    val seed : String,
    val birthday : Long,
    val account_index: Long
)

data class InitFromUfvk (
    val error : String
)

data class ExportUfvk (
    val ufvk : String,
    val birthday : Long
)

data class Addresses (
	val address : String,
	val receivers : Receivers
)

data class Receivers (
	val transparent : String,
	val sapling : String,
	val orchard_exists : Boolean
)

data class Info (
    val version : String,
    val git_commit : String,
    val server_uri : String,
    val vendor : String,
    val taddr_support : Boolean,
    val chain_name : String,
    val sapling_activation_height : Long,
    val consensus_branch_id : String,
    val latest_block_height : Long
)

data class Height (
	val height : Long
)

data class SyncStatus (
	val sync_id : Long,
    val in_progress : Boolean,
    val last_error : String?
)

data class Sync (
	val result : String,
    val latest_block : Long,
    val total_blocks_synced : Long
)

data class Balance (
    val sapling_balance : Long,
    val verified_sapling_balance : Long,
    val spendable_sapling_balance : Long,
    val unverified_sapling_balance : Long,
    val orchard_balance : Long,
    val verified_orchard_balance : Long,
    val spendable_orchard_balance : Long,
    val unverified_orchard_balance : Long,
    val transparent_balance : Long
)

data class Send (
    val address : String,
    val amount : Long,
    val memo : String?
)

data class Summaries (
    val block_height : Long,
    val datetime : Long,
    val txid : String,
    val price : String?,
    val amount : Long,
    val to_address : String?,
    val memos : List<String>?,
    val kind : String,
    val pool : String?,
    val unconfirmed : Boolean
)

@Category(OfflineTest::class)
class ExecuteAddressesFromSeed {
    @Test
    fun executeAddressesFromSeed() {
        val mapper = jacksonObjectMapper()

        val server = "http://10.0.2.2:20000"
        val chainhint = "main"
        val seed = Seeds.ABANDON
        val birthday:ULong = 1u
        val datadir = MainApplication.getAppContext()!!.filesDir.path
        val monitorMempool = false

        val initFromSeedJson = uniffi.rustlib.initFromSeed(server, seed, birthday, datadir, chainhint, monitorMempool)
        System.out.println("\nInit from seed:")
        System.out.println(initFromSeedJson)
        val initFromSeed: InitFromSeed = mapper.readValue(initFromSeedJson)
        assertThat(initFromSeed.seed).isEqualTo(Seeds.ABANDON)
        assertThat(initFromSeed.birthday).isEqualTo(1)

        val addressesJson = uniffi.rustlib.executeCommand("addresses", "")
        System.out.println("\nAddresses:")
        System.out.println(addressesJson)
        val addresses: List<Addresses> = mapper.readValue(addressesJson)
        assertThat(addresses[0].address).isEqualTo("u16sw4v6wy7f4jzdny55yzl020tp3yqg3c85dc6n7mmq0urfm6adqg79hxmyk85ufn4lun4pfh5q48cc3kvxhxm3w978eqqecdd260gkzjrkun6z7m9mcrt2zszaj0mvk6ufux2zteqwh57cq906hz3rkg63duaeqsvjelv9h5srct0zq8rvlv23wz5hed7zuatqd7p6p4ztugc4t4w2g")
        assertThat(addresses[0].receivers.transparent).isEqualTo("t1dUDJ62ANtmebE8drFg7g2MWYwXHQ6Xu3F")
        assertThat(addresses[0].receivers.sapling).isEqualTo("zs16uhd4mux24se6wkm74vld0ec63d4dxt3d7m80l5xytreplkkllrrf9c7fj859mhp8tkcq9hxfvj")
        assertThat(addresses[0].receivers.orchard_exists).isEqualTo(true)
    }
}

@Category(OfflineTest::class)
class ExecuteAddressesFromUfvk {
    @Test
    fun executeAddressFromUfvk() {
        val mapper = jacksonObjectMapper()

        val server = "http://10.0.2.2:20000"
        val chainhint = "main"
        val ufvk = Ufvk.ABANDON
        val birthday: ULong = 1u
        val datadir = MainApplication.getAppContext()!!.filesDir.path
        val monitorMempool = false

        val initFromUfvkJson = uniffi.rustlib.initFromUfvk(server, ufvk, birthday, datadir, chainhint, monitorMempool)
        System.out.println("\nInit From UFVK:")
        System.out.println(initFromUfvkJson)
        val initFromUfvk: InitFromUfvk = mapper.readValue(initFromUfvkJson)
        assertThat(initFromUfvk.error).startsWith("This wallet is watch-only")

        val exportUfvkJson = uniffi.rustlib.executeCommand("exportufvk", "")
        System.out.println("\nExport Ufvk:")
        System.out.println(exportUfvkJson)
        val exportUfvk: ExportUfvk = mapper.readValue(exportUfvkJson)
        assertThat(exportUfvk.ufvk).isEqualTo(Ufvk.ABANDON)
        assertThat(exportUfvk.birthday).isEqualTo(1)

        val addressesJson = uniffi.rustlib.executeCommand("addresses", "")
        System.out.println("\nAddresses:")
        System.out.println(addressesJson)
        val addresses: List<Addresses> = mapper.readValue(addressesJson)
        assertThat(addresses[0].address).isEqualTo("u16sw4v6wy7f4jzdny55yzl020tp3yqg3c85dc6n7mmq0urfm6adqg79hxmyk85ufn4lun4pfh5q48cc3kvxhxm3w978eqqecdd260gkzjrkun6z7m9mcrt2zszaj0mvk6ufux2zteqwh57cq906hz3rkg63duaeqsvjelv9h5srct0zq8rvlv23wz5hed7zuatqd7p6p4ztugc4t4w2g")
        assertThat(addresses[0].receivers.transparent).isEqualTo("t1dUDJ62ANtmebE8drFg7g2MWYwXHQ6Xu3F")
        assertThat(addresses[0].receivers.sapling).isEqualTo("zs16uhd4mux24se6wkm74vld0ec63d4dxt3d7m80l5xytreplkkllrrf9c7fj859mhp8tkcq9hxfvj")
        assertThat(addresses[0].receivers.orchard_exists).isEqualTo(true)
    }    
}

@Category(OfflineTest::class)
class ExecuteVersionFromSeed {
    @Test
    fun executeVersionFromSeed() {
        val mapper = jacksonObjectMapper()

        val server = "http://10.0.2.2:20000"
        val chainhint = "main"
        val seed = Seeds.ABANDON
        val birthday:ULong = 1u
        val datadir = MainApplication.getAppContext()!!.filesDir.path
        val monitorMempool = false

        val initFromSeedJson = uniffi.rustlib.initFromSeed(server, seed, birthday, datadir, chainhint, monitorMempool)
        System.out.println("\nInit from seed:")
        System.out.println(initFromSeedJson)
        val initFromSeed: InitFromSeed = mapper.readValue(initFromSeedJson)
        assertThat(initFromSeed.seed).isEqualTo(Seeds.ABANDON)
        assertThat(initFromSeed.birthday).isEqualTo(1)

        val version = uniffi.rustlib.executeCommand("version", "")
        System.out.println("\nVersion:")
        System.out.println(version)
        // we used for zingolib version: `mob-release` & `mob-prerelease`
        assertThat(version).startsWith("mob-")
    }
}

class ExecuteSyncFromSeed {
    @Test
    fun executeSyncFromSeed() {
        val mapper = jacksonObjectMapper()

        val server = "http://10.0.2.2:20000"
        val chainhint = "regtest"
        val seed = Seeds.ABANDON
        val birthday:ULong = 1u
        val datadir = MainApplication.getAppContext()!!.filesDir.path
        val monitorMempool = false

        val initFromSeedJson = uniffi.rustlib.initFromSeed(server, seed, birthday, datadir, chainhint, monitorMempool)
        System.out.println("\nInit from seed:")
        System.out.println(initFromSeedJson)
        val initFromSeed: InitFromSeed = mapper.readValue(initFromSeedJson)
        assertThat(initFromSeed.seed).isEqualTo(Seeds.ABANDON)
        assertThat(initFromSeed.birthday).isEqualTo(1)

        val infoJson = uniffi.rustlib.executeCommand("info", "")
        System.out.println("\nInfo:")
        System.out.println(infoJson)
        val info: Info = mapper.readValue(infoJson)
        assertThat(info.latest_block_height).isGreaterThan(0)

        var heightJson = uniffi.rustlib.executeCommand("height", "")
        System.out.println("\nHeight pre-sync:")
        System.out.println(heightJson)
        val heightPreSync: Height = mapper.readValue(heightJson)
        assertThat(heightPreSync.height).isEqualTo(0)

        val syncJson = uniffi.rustlib.executeCommand("sync", "")
        System.out.println("\nSync:")
        System.out.println(syncJson)
        val sync: Sync = mapper.readValue(syncJson)
        assertThat(sync.result).isEqualTo("success")
        assertThat(sync.latest_block).isEqualTo(info.latest_block_height)
        assertThat(sync.total_blocks_synced).isEqualTo(info.latest_block_height)

        heightJson = uniffi.rustlib.executeCommand("height", "")
        System.out.println("\nHeight post-sync:")
        System.out.println(heightJson)
        val heightPostSync: Height = mapper.readValue(heightJson)
        assertThat(heightPostSync.height).isEqualTo(info.latest_block_height)

        val syncStatusJson = uniffi.rustlib.executeCommand("syncstatus", "")
        System.out.println("\nSync status:")
        System.out.println(syncStatusJson)
        val syncStatus: SyncStatus = mapper.readValue(syncStatusJson)
        assertThat(syncStatus.sync_id).isEqualTo(1)
    }
}

class ExecuteSendFromOrchard {
    @Test
    fun executeSendFromOrchard() {
        val mapper = jacksonObjectMapper()

        val server = "http://10.0.2.2:20000"
        val chainhint = "regtest"
        val seed = Seeds.HOSPITAL
        val birthday:ULong = 1u
        val datadir = MainApplication.getAppContext()!!.filesDir.path
        val monitorMempool = false

        val initFromSeedJson = uniffi.rustlib.initFromSeed(server, seed, birthday, datadir, chainhint, monitorMempool)
        System.out.println("\nInit from seed:")
        System.out.println(initFromSeedJson)
        val initFromSeed: InitFromSeed = mapper.readValue(initFromSeedJson)
        assertThat(initFromSeed.seed).isEqualTo(Seeds.HOSPITAL)
        assertThat(initFromSeed.birthday).isEqualTo(1)

        var syncJson = uniffi.rustlib.executeCommand("sync", "")
        System.out.println("\nSync:")
        System.out.println(syncJson)

        var balanceJson = uniffi.rustlib.executeCommand("balance", "")
        System.out.println("\nBalance pre-send:")
        System.out.println(balanceJson)
        val balancePreSend: Balance = mapper.readValue(balanceJson)
        assertThat(balancePreSend.spendable_orchard_balance).isEqualTo(1000000)
        assertThat(balancePreSend.transparent_balance).isEqualTo(0)

        val addressesJson = uniffi.rustlib.executeCommand("addresses", "")
        System.out.println("\nAddresses:")
        System.out.println(addressesJson)
        val addresses: List<Addresses> = mapper.readValue(addressesJson)

        val send = Send(addresses[0].receivers.transparent, 100000, null)

        val txidJson = uniffi.rustlib.executeCommand("send", mapper.writeValueAsString(listOf(send)))
        System.out.println("\nTXID:")
        System.out.println(txidJson)

        val sendProgressJson = uniffi.rustlib.executeCommand("sendprogress", "")
        System.out.println("\nSend progress:")
        System.out.println(sendProgressJson)    

        syncJson = uniffi.rustlib.executeCommand("sync", "")
        System.out.println("\nSync:")
        System.out.println(syncJson)

        balanceJson = uniffi.rustlib.executeCommand("balance", "")
        System.out.println("\nBalance post-send:")
        System.out.println(balanceJson)
        val balancePostSend: Balance = mapper.readValue(balanceJson)
        assertThat(balancePostSend.transparent_balance).isEqualTo(100000)
    }
}

class UpdateCurrentPriceAndSummariesFromSeed {
    @Test
    fun updateCurrentPriceAndSummariesFromSeed() {
        val mapper = jacksonObjectMapper()

        val server = "http://10.0.2.2:20000"
        val chainhint = "regtest"
        val seed = Seeds.HOSPITAL
        val birthday:ULong = 1u
        val datadir = MainApplication.getAppContext()!!.filesDir.path
        val monitorMempool = false

        val initFromSeedJson = uniffi.rustlib.initFromSeed(server, seed, birthday, datadir, chainhint, monitorMempool)
        System.out.println("\nInit from seed:")
        System.out.println(initFromSeedJson)
        val initFromSeed: InitFromSeed = mapper.readValue(initFromSeedJson)
        assertThat(initFromSeed.seed).isEqualTo(Seeds.HOSPITAL)
        assertThat(initFromSeed.birthday).isEqualTo(1)

        val price = uniffi.rustlib.executeCommand("updatecurrentprice", "")
        System.out.println("\nPrice:")
        System.out.println(price)

        val syncJson = uniffi.rustlib.executeCommand("sync", "")
        System.out.println("\nSync:")
        System.out.println(syncJson)

        val summariesJson = uniffi.rustlib.executeCommand("summaries", "")
        System.out.println("\nSummaries:")
        System.out.println(summariesJson)
        val summaries: List<Summaries> = mapper.readValue(summariesJson)
        // the summaries can have 4 or 5 items for 3 different txs
        // 1. Received - 1_000_000 - orchard (1 item)
        // 2. Sent - 110_000 - uregtest1zkuzfv5m3... (2 items: Sent & fee)
        // 3. SendToSelf - 10_000 - Two possible results:
        //      3.1. only one item with the fee.
        //      3.2. two items: SendToSelf = 0 & fee
        assertThat(summaries.size).isIn(Range.closed(4, 5))
        // first item have to be a `Received`
        assertThat(summaries[0].kind).isEqualTo("Received")
        assertThat(summaries[0].pool).isEqualTo("Orchard")
        assertThat(summaries[0].amount).isEqualTo(1000000)
        // second item have to be a `Sent`
        assertThat(summaries[1].kind).isEqualTo("Sent")
        assertThat(summaries[1].to_address).isEqualTo("uregtest1zkuzfv5m3yhv2j4fmvq5rjurkxenxyq8r7h4daun2zkznrjaa8ra8asgdm8wwgwjvlwwrxx7347r8w0ee6dqyw4rufw4wg9djwcr6frzkezmdw6dud3wsm99eany5r8wgsctlxquu009nzd6hsme2tcsk0v3sgjvxa70er7h27z5epr67p5q767s2z5gt88paru56mxpm6pwz0cu35m")
        assertThat(summaries[1].amount).isEqualTo(100000)
        // third item have to be a `fee` from the last `Sent` with the same txid
        assertThat(summaries[2].kind).isEqualTo("Fee")
        assertThat(summaries[2].txid).isEqualTo(summaries[1].txid)
        assertThat(summaries[2].amount).isEqualTo(10000)
        if (summaries.size == 4) {
            // fourth item have to be a `fee` from a `SendToSelf` tx
            assertThat(summaries[3].kind).isEqualTo("Fee")
            assertThat(summaries[3].amount).isEqualTo(10000)
        } else {
            // fourth item have to be a `SendToSelf`
            assertThat(summaries[3].kind).isEqualTo("SendToSelf")
            assertThat(summaries[3].amount).isEqualTo(0)
            // fifth item have to be a `fee` from the last `SendToSelf` with the same txid
            assertThat(summaries[4].kind).isEqualTo("Fee")
            assertThat(summaries[4].txid).isEqualTo(summaries[3].txid)
            assertThat(summaries[4].amount).isEqualTo(10000)
        }
        
    }
}

class ExecuteSaplingBalanceFromSeed {
    @Test
    fun executeSaplingBalanceFromSeed() {
        val mapper = jacksonObjectMapper()

        val server = "http://10.0.2.2:20000"
        val chainhint = "regtest"
        val seed = Seeds.HOSPITAL
        val birthday:ULong = 1u
        val datadir = MainApplication.getAppContext()!!.filesDir.path
        val monitorMempool = false

        val initFromSeedJson = uniffi.rustlib.initFromSeed(server, seed, birthday, datadir, chainhint, monitorMempool)
        System.out.println("\nInit from seed:")
        System.out.println(initFromSeedJson)
        val initFromSeed: InitFromSeed = mapper.readValue(initFromSeedJson)
        assertThat(initFromSeed.seed).isEqualTo(Seeds.HOSPITAL)
        assertThat(initFromSeed.birthday).isEqualTo(1)

        val syncJson = uniffi.rustlib.executeCommand("sync", "")
        System.out.println("\nSync:")
        System.out.println(syncJson)
        
        val summariesJson = uniffi.rustlib.executeCommand("summaries", "")
        System.out.println("\nSummaries:")
        System.out.println(summariesJson)

        // Summaries
        // 1. Received in orchard pool =     +500_000
        // 2. Received in sapling pool =     +250_000
        // 3. Received in transparent pool = +250_000
        // 4. Send - 100_000 + 10_000fee =   -110_000
        // 5. SendToSelf orchard pool =       -10_000 (one item: Fee)
        // 6. SendToSelf sapling pool =       -10_000 (one item: Fee)
        // 7. SendToSelf transparent pool =   -10_000 (two items: SendToSelf & Fee)
        // 8. Shielding transparent pool =    -10_000 (one item: Fee)
        // 9. Upgrading sapling pool =        -10_000 (one item: Fee)
        //
        // orchard pool = 840_000
        // sapling pool = 0
        // transparent =  0

        val balanceJson = uniffi.rustlib.executeCommand("balance", "")
        System.out.println("\nBalance:")
        System.out.println(balanceJson)
        val balance: Balance = mapper.readValue(balanceJson)

        assertThat(balance.orchard_balance).isEqualTo(840000)
        assertThat(balance.verified_orchard_balance).isEqualTo(840000)
        assertThat(balance.spendable_orchard_balance).isEqualTo(840000)
        assertThat(balance.sapling_balance).isEqualTo(0)
        assertThat(balance.verified_sapling_balance).isEqualTo(0)
        assertThat(balance.spendable_sapling_balance).isEqualTo(0)
        assertThat(balance.transparent_balance).isEqualTo(0)
    }
}
