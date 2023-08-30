package org.ZingoLabs.Zingo

import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.experimental.categories.Category
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue

object Seeds {
    const val ABANDON = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art"
    const val HOSPITAL = "hospital museum valve antique skate museum unfold vocal weird milk scale social vessel identify crowd hospital control album rib bulb path oven civil tank"
}

object Ufvk {
    const val ABANDON = "uview1vmle9qzgsmzn8qskg06cjjt406eq3euvkn8un3t6sk7fjd72qp72guyskktr2gvgcpmd99qgquxdw7s54v0dfxn3degzhxp9gmvpve6vlvv459pxfre05v6l47aqx47rgh86t6n77svstd8ff6d8cwtn98uq66k6u5jqrpyz0pqflkppfq3djscrd2acnc7ymkd6fssk0t4rh2ynaux7z4ylt38jqgjhnu88h2jz8qwd3t5dwsc3ycvsea6grs4zg76r9vw48r9zvlphnpfsgc5eqpum7hghdm2eguw4h6n9m8rhuzh0qdc24z4z5ftcv6xxvvs3yrugea23xlys3f9qv0fenh0xp0hej8enlr82esl54hn27d6432kygwqx700ez84e72f03vtmece73dftpjvv3v7w65yaz2rjwmarxjzrnn02u5kx4p7a42k5lxgcgqgwjyp9w6x24ccm0dvlf4637ss6l3xmuv2strza60c5k5uasdcn"
}

data class InitFromSeed (
    val seed : String,
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

@Category(OfflineTest::class)
class ExecuteAddressesFromSeed {
    @Test
    fun executeAddressesFromSeed() {
        val mapper = jacksonObjectMapper()

        val server = "http://10.0.2.2:20000"
        val chainhint = "main"
        val seed = Seeds.ABANDON
        val birthday = "1"
        val datadir = MainApplication.getAppContext()!!.filesDir.path
        val monitorMempool = "false"

        var initFromSeedJson = RustFFI.initfromseed(server, seed, birthday, datadir, chainhint, monitorMempool)
        System.out.println("\nInit from seed:")
        System.out.println(initFromSeedJson)
        val initFromSeed: InitFromSeed = mapper.readValue(initFromSeedJson)
        assertThat(initFromSeed.seed).isEqualTo(Seeds.ABANDON)
        assertThat(initFromSeed.birthday).isEqualTo(1)

        var addressesJson = RustFFI.execute("addresses", "")
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
        val birthday = "1"
        val datadir = MainApplication.getAppContext()!!.filesDir.path
        val monitorMempool = "false"

        var initFromUfvk = RustFFI.initfromufvk(server, ufvk, birthday, datadir, chainhint, monitorMempool)
        System.out.println("\nInit From UFVK:")
        System.out.println(initFromUfvk)
        assertThat(initFromUfvk).isEqualTo("Error: This wallet is watch-only.")

        var addressesJson = RustFFI.execute("addresses", "")
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
        val birthday = "1"
        val datadir = MainApplication.getAppContext()!!.filesDir.path
        val monitorMempool = "false"

        var initFromSeedJson = RustFFI.initfromseed(server, seed, birthday, datadir, chainhint, monitorMempool)
        System.out.println("\nInit from seed:")
        System.out.println(initFromSeedJson)
        val initFromSeed: InitFromSeed = mapper.readValue(initFromSeedJson)
        assertThat(initFromSeed.seed).isEqualTo(Seeds.ABANDON)
        assertThat(initFromSeed.birthday).isEqualTo(1)

        var version = RustFFI.execute("version", "")
        System.out.println("\nVersion:")
        System.out.println(version)
        assertThat(version).startsWith("mob-release")
    }
}

class ExecuteSyncFromSeed {
    @Test
    fun executeSyncFromSeed() {
        val mapper = jacksonObjectMapper()

        val server = "http://10.0.2.2:20000"
        val chainhint = "regtest"
        val seed = Seeds.ABANDON
        val birthday = "1"
        val datadir = MainApplication.getAppContext()!!.filesDir.path
        val monitorMempool = "false"

        var initFromSeedJson = RustFFI.initfromseed(server, seed, birthday, datadir, chainhint, monitorMempool)
        System.out.println("\nInit from seed:")
        System.out.println(initFromSeedJson)
        val initFromSeed: InitFromSeed = mapper.readValue(initFromSeedJson)
        assertThat(initFromSeed.seed).isEqualTo(Seeds.ABANDON)
        assertThat(initFromSeed.birthday).isEqualTo(1)

        var infoJson = RustFFI.execute("info", "")
        System.out.println("\nInfo:")
        System.out.println(infoJson)
        val info: Info = mapper.readValue(infoJson)
        assertThat(info.latest_block_height).isGreaterThan(0)

        var heightJson = RustFFI.execute("height", "")
        System.out.println("\nHeight pre-sync:")
        System.out.println(heightJson)
        val heightPreSync: Height = mapper.readValue(heightJson)
        assertThat(heightPreSync.height).isEqualTo(0)

        var syncJson = RustFFI.execute("sync", "")
        System.out.println("\nSync:")
        System.out.println(syncJson)
        val sync: Sync = mapper.readValue(syncJson)
        assertThat(sync.result).isEqualTo("success")
        assertThat(sync.latest_block).isEqualTo(info.latest_block_height)
        assertThat(sync.total_blocks_synced).isEqualTo(info.latest_block_height)

        heightJson = RustFFI.execute("height", "")
        System.out.println("\nHeight post-sync:")
        System.out.println(heightJson)
        val heightPostSync: Height = mapper.readValue(heightJson)
        assertThat(heightPostSync.height).isEqualTo(info.latest_block_height)

        val syncStatusJson = RustFFI.execute("syncstatus", "")
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
        val birthday = "1"
        val datadir = MainApplication.getAppContext()!!.filesDir.path
        val monitorMempool = "false"

        var initFromSeedJson = RustFFI.initfromseed(server, seed, birthday, datadir, chainhint, monitorMempool)
        System.out.println("\nInit from seed:")
        System.out.println(initFromSeedJson)
        val initFromSeed: InitFromSeed = mapper.readValue(initFromSeedJson)
        assertThat(initFromSeed.seed).isEqualTo(Seeds.HOSPITAL)
        assertThat(initFromSeed.birthday).isEqualTo(1)

        var syncJson = RustFFI.execute("sync", "")
        System.out.println("\nSync:")
        System.out.println(syncJson)

        var balanceJson = RustFFI.execute("balance", "")
        System.out.println("\nBalance pre-send:")
        System.out.println(balanceJson)
        val balancePreSend: Balance = mapper.readValue(balanceJson)
        assertThat(balancePreSend.spendable_orchard_balance).isEqualTo(1000000)
        assertThat(balancePreSend.transparent_balance).isEqualTo(0)

        var addressesJson = RustFFI.execute("addresses", "")
        System.out.println("\nAddresses:")
        System.out.println(addressesJson)
        val addresses: List<Addresses> = mapper.readValue(addressesJson)

        val send = Send(addresses[0].receivers.transparent, 100000, null)

        var txidJson = RustFFI.execute("send", mapper.writeValueAsString(listOf(send)))
        System.out.println("\nTXID:")
        System.out.println(txidJson)

        var sendProgressJson = RustFFI.execute("sendprogress", "")
        System.out.println("\nSend progress:")
        System.out.println(sendProgressJson)    

        syncJson = RustFFI.execute("sync", "")
        System.out.println("\nSync:")
        System.out.println(syncJson)

        balanceJson = RustFFI.execute("balance", "")
        System.out.println("\nBalance post-send:")
        System.out.println(balanceJson)
        val balancePostSend: Balance = mapper.readValue(balanceJson)
        assertThat(balancePostSend.transparent_balance).isEqualTo(100000)
    }
}

