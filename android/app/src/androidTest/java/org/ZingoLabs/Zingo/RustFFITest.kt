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
    const val ABANDON = "uview1wj07tp4y3rwzjplg68c3lum2avq4v3j0w0mf0urdlxzthnfr26q8ssz9hvylspj638tuh2r233gaxm2qh27gj6m9q25prk7gt8xwqzmwxm580tg0f5llvr7d6h4y6jc2t7zl7lz9ge60ta6226jyysgk8xpu2wqxesrw4q2mydrhj5dea5l9scl0p3l4ayqgfej54wex5aa2ylq89nyqg94l4lh6dawuc2e3s8v7737zn7p5fl96hhpjqg4jucnp2r2jjqxev3z7lp3k9ulfpl2gw0lng8vfe8hj8afggqzdwxgfaq6dy82guvh34kv4q5ay7gq6n0ujg7exu0mgznpr4wf0agjdhnd4k6af5md3f3msqedw364vx3lyd3hwekvrulywa4c0ja4ze2fxtcm0vrz0278g9n37y0jg6dx847g3peyq9lwmm04ac3tt4sldnrcfc5ew3k0aqgycnryfvv44zxzng485ks27wky2ulfy9q8hu97l"
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

data class ValueTransfer (
    val txid : String,
    val datetime : Long,
    val status: String,
    val blockheight : Long,
    val transaction_fee : Long?,
    val zec_price : Long?,
    val kind : String,
    val value : Long,
    val recipient_address : String?,
    val pool_received : String?,
    val memos : List<String>?,
)

data class ValueTransfers (
    val value_transfers : List<ValueTransfer>,
)

data class ParseResult (
    val status: String,
    val chain_name: String?,
    val address_kind: String?
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

        val setCrytoProvider = uniffi.zingo.setCryptoDefaultProviderToRing()
        println(setCrytoProvider)

        val initFromSeedJson: String = uniffi.zingo.initFromSeed(server, seed, birthday, datadir, chainhint, monitorMempool)
        println("\nInit from seed:")
        println(initFromSeedJson)
        val initFromSeed: InitFromSeed = mapper.readValue(initFromSeedJson)
        assertThat(initFromSeed.seed).isEqualTo(Seeds.ABANDON)
        assertThat(initFromSeed.birthday).isEqualTo(1)

        val addressesJson: String = uniffi.zingo.executeCommand("addresses", "")
        println("\nAddresses:")
        println(addressesJson)
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

        val setCrytoProvider = uniffi.zingo.setCryptoDefaultProviderToRing()
        println(setCrytoProvider)

        val initFromUfvkJson: String = uniffi.zingo.initFromUfvk(server, ufvk, birthday, datadir, chainhint, monitorMempool)
        println("\nInit From UFVK:")
        println(initFromUfvkJson)
        val initFromUfvk: InitFromUfvk = mapper.readValue(initFromUfvkJson)
        assertThat(initFromUfvk.error).startsWith("This wallet is watch-only")

        val exportUfvkJson: String = uniffi.zingo.executeCommand("exportufvk", "")
        println("\nExport Ufvk:")
        println(exportUfvkJson)
        val exportUfvk: ExportUfvk = mapper.readValue(exportUfvkJson)
        assertThat(exportUfvk.ufvk).isEqualTo(Ufvk.ABANDON)
        assertThat(exportUfvk.birthday).isEqualTo(1)

        val addressesJson: String = uniffi.zingo.executeCommand("addresses", "")
        println("\nAddresses:")
        println(addressesJson)
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

        val setCrytoProvider = uniffi.zingo.setCryptoDefaultProviderToRing()
        println(setCrytoProvider)

        val initFromSeedJson: String = uniffi.zingo.initFromSeed(server, seed, birthday, datadir, chainhint, monitorMempool)
        println("\nInit from seed:")
        println(initFromSeedJson)
        val initFromSeed: InitFromSeed = mapper.readValue(initFromSeedJson)
        assertThat(initFromSeed.seed).isEqualTo(Seeds.ABANDON)
        assertThat(initFromSeed.birthday).isEqualTo(1)

        val version: String = uniffi.zingo.executeCommand("version", "")
        println("\nVersion:")
        println(version)
        assertThat(version).isNotNull()
        assertThat(version).isNotEmpty()
        assertThat(version).isNotEqualTo("")
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

        val setCrytoProvider = uniffi.zingo.setCryptoDefaultProviderToRing()
        println(setCrytoProvider)

        val initFromSeedJson: String = uniffi.zingo.initFromSeed(server, seed, birthday, datadir, chainhint, monitorMempool)
        println("\nInit from seed:")
        println(initFromSeedJson)
        val initFromSeed: InitFromSeed = mapper.readValue(initFromSeedJson)
        assertThat(initFromSeed.seed).isEqualTo(Seeds.ABANDON)
        assertThat(initFromSeed.birthday).isEqualTo(1)

        val infoJson: String = uniffi.zingo.executeCommand("info", "")
        println("\nInfo:")
        println(infoJson)
        val info: Info = mapper.readValue(infoJson)
        assertThat(info.latest_block_height).isGreaterThan(0)

        var heightJson: String = uniffi.zingo.executeCommand("height", "")
        println("\nHeight pre-sync:")
        println(heightJson)
        val heightPreSync: Height = mapper.readValue(heightJson)
        assertThat(heightPreSync.height).isEqualTo(0)

        val syncJson: String = uniffi.zingo.executeCommand("sync", "")
        println("\nSync:")
        println(syncJson)
        val sync: Sync = mapper.readValue(syncJson)
        assertThat(sync.result).isEqualTo("success")
        assertThat(sync.latest_block).isEqualTo(info.latest_block_height)
        assertThat(sync.total_blocks_synced).isEqualTo(info.latest_block_height)

        heightJson = uniffi.zingo.executeCommand("height", "")
        println("\nHeight post-sync:")
        println(heightJson)
        val heightPostSync: Height = mapper.readValue(heightJson)
        assertThat(heightPostSync.height).isEqualTo(info.latest_block_height)

        val syncStatusJson: String = uniffi.zingo.executeCommand("syncstatus", "")
        println("\nSync status:")
        println(syncStatusJson)
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

        val setCrytoProvider = uniffi.zingo.setCryptoDefaultProviderToRing()
        println(setCrytoProvider)

        val initFromSeedJson: String = uniffi.zingo.initFromSeed(server, seed, birthday, datadir, chainhint, monitorMempool)
        println("\nInit from seed:")
        println(initFromSeedJson)
        val initFromSeed: InitFromSeed = mapper.readValue(initFromSeedJson)
        assertThat(initFromSeed.seed).isEqualTo(Seeds.HOSPITAL)
        assertThat(initFromSeed.birthday).isEqualTo(1)

        var syncJson: String = uniffi.zingo.executeCommand("sync", "")
        println("\nSync:")
        println(syncJson)

        var balanceJson: String = uniffi.zingo.executeCommand("balance", "")
        println("\nBalance pre-send:")
        println(balanceJson)
        val balancePreSend: Balance = mapper.readValue(balanceJson)
        assertThat(balancePreSend.spendable_orchard_balance).isEqualTo(1000000)
        assertThat(balancePreSend.transparent_balance).isEqualTo(0)

        val addressesJson: String = uniffi.zingo.executeCommand("addresses", "")
        println("\nAddresses:")
        println(addressesJson)
        val addresses: List<Addresses> = mapper.readValue(addressesJson)

        val send = Send(addresses[0].receivers.transparent, 100000, null)

        val proposeJson: String = uniffi.zingo.executeCommand("send", mapper.writeValueAsString(listOf(send)))
        println("\nPropose:")
        println(proposeJson)

        val sendProgressJson: String = uniffi.zingo.executeCommand("sendprogress", "")
        println("\nSend progress:")
        println(sendProgressJson)

        val confirmJson: String = uniffi.zingo.executeCommand("confirm", "")
        println("\nConfirm Txid:")
        println(confirmJson)

        syncJson = uniffi.zingo.executeCommand("sync", "")
        println("\nSync:")
        println(syncJson)

        balanceJson = uniffi.zingo.executeCommand("balance", "")
        println("\nBalance post-send:")
        println(balanceJson)
        val balancePostSend: Balance = mapper.readValue(balanceJson)
        assertThat(balancePostSend.transparent_balance).isEqualTo(100000)
    }
}

class UpdateCurrentPriceAndValueTransfersFromSeed {
    @Test
    fun updateCurrentPriceAndValueTransfersFromSeed() {
        val mapper = jacksonObjectMapper()

        val server = "http://10.0.2.2:20000"
        val chainhint = "regtest"
        val seed = Seeds.HOSPITAL
        val birthday:ULong = 1u
        val datadir = MainApplication.getAppContext()!!.filesDir.path
        val monitorMempool = false

        val setCrytoProvider = uniffi.zingo.setCryptoDefaultProviderToRing()
        println(setCrytoProvider)

        val initFromSeedJson: String = uniffi.zingo.initFromSeed(server, seed, birthday, datadir, chainhint, monitorMempool)
        println("\nInit from seed:")
        println(initFromSeedJson)
        val initFromSeed: InitFromSeed = mapper.readValue(initFromSeedJson)
        assertThat(initFromSeed.seed).isEqualTo(Seeds.HOSPITAL)
        assertThat(initFromSeed.birthday).isEqualTo(1)

        val price: String = uniffi.zingo.executeCommand("updatecurrentprice", "")
        println("\nPrice:")
        println(price)

        val syncJson: String = uniffi.zingo.executeCommand("sync", "")
        println("\nSync:")
        println(syncJson)

        val valueTranfersJson: String = uniffi.zingo.getValueTransfers()
        println("\nValue Transfers:")
        println(valueTranfersJson)
        val valueTranfers: ValueTransfers = mapper.readValue(valueTranfersJson)
        // the value transfers have 3 items for 3 different txs
        // 1. Received - 1_000_000 - orchard (1 item)
        // 2. Sent - 110_000 - uregtest1zkuzfv5m3... (1 item)
        // 3. memoToSelf - 10_000 (1 item)
        assertThat(valueTranfers.value_transfers.size).isEqualTo(3)
        // third item have to be a `fee` from the last `Sent` with the same txid
        assertThat(valueTranfers.value_transfers[0].kind).isEqualTo("memo-to-self")
        assertThat(valueTranfers.value_transfers[0].status).isEqualTo("confirmed")
        assertThat(valueTranfers.value_transfers[0].value).isEqualTo(0)
        assertThat(valueTranfers.value_transfers[0].transaction_fee).isEqualTo(20000)
        // second item have to be a `Sent`
        assertThat(valueTranfers.value_transfers[1].kind).isEqualTo("sent")
        assertThat(valueTranfers.value_transfers[1].recipient_address).isEqualTo("uregtest1zkuzfv5m3yhv2j4fmvq5rjurkxenxyq8r7h4daun2zkznrjaa8ra8asgdm8wwgwjvlwwrxx7347r8w0ee6dqyw4rufw4wg9djwcr6frzkezmdw6dud3wsm99eany5r8wgsctlxquu009nzd6hsme2tcsk0v3sgjvxa70er7h27z5epr67p5q767s2z5gt88paru56mxpm6pwz0cu35m")
        assertThat(valueTranfers.value_transfers[1].status).isEqualTo("confirmed")
        assertThat(valueTranfers.value_transfers[1].value).isEqualTo(100000)
        assertThat(valueTranfers.value_transfers[1].transaction_fee).isEqualTo(10000)
        // first item have to be a `Received`
        assertThat(valueTranfers.value_transfers[2].kind).isEqualTo("received")
        assertThat(valueTranfers.value_transfers[2].pool_received).isEqualTo("Orchard")
        assertThat(valueTranfers.value_transfers[2].status).isEqualTo("confirmed")
        assertThat(valueTranfers.value_transfers[2].value).isEqualTo(1000000)
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

        val setCrytoProvider = uniffi.zingo.setCryptoDefaultProviderToRing()
        println(setCrytoProvider)

        val initFromSeedJson: String = uniffi.zingo.initFromSeed(server, seed, birthday, datadir, chainhint, monitorMempool)
        println("\nInit from seed:")
        println(initFromSeedJson)
        val initFromSeed: InitFromSeed = mapper.readValue(initFromSeedJson)
        assertThat(initFromSeed.seed).isEqualTo(Seeds.HOSPITAL)
        assertThat(initFromSeed.birthday).isEqualTo(1)

        val syncJson:String = uniffi.zingo.executeCommand("sync", "")
        println("\nSync:")
        println(syncJson)
        
        val valueTranfersJson: String = uniffi.zingo.getValueTransfers()
        println("\nValue Transfers:")
        println(valueTranfersJson)

        // Value Transfers
        // 1. Received in orchard pool =     +500_000
        // 2. Received in sapling pool =     +250_000
        // 3. Received in transparent pool = +250_000
        // 4. Send - 100_000 + 20_000fee =   -120_000
        // 5. MemoToSelf orchard pool =       -10_000 (send-to-self)
        // 6. MemoToSelf sapling pool =       -20_000 (send-to-self)
        // 7. MemoToSelf transparent pool =   -15_000 (send-to-self)
        // 9. Upgrading sapling pool =        -20_000 (shield)
        //
        // orchard pool = 840_000
        // sapling pool = 0
        // transparent =  0

        val balanceJson:String = uniffi.zingo.executeCommand("balance", "")
        println("\nBalance:")
        println(balanceJson)
        val balance: Balance = mapper.readValue(balanceJson)

        assertThat(balance.orchard_balance).isEqualTo(715000)
        assertThat(balance.verified_orchard_balance).isEqualTo(715000)
        assertThat(balance.spendable_orchard_balance).isEqualTo(715000)
        assertThat(balance.sapling_balance).isEqualTo(100000)
        assertThat(balance.verified_sapling_balance).isEqualTo(100000)
        assertThat(balance.spendable_sapling_balance).isEqualTo(100000)
        assertThat(balance.transparent_balance).isEqualTo(0)
    }
}

class ExecuteParseAddresses {

    @Test
    fun ExecuteParseAddressForTex() {
        val mapper = jacksonObjectMapper()

        val server = "http://10.0.2.2:20000"
        val chainhint = "regtest"
        val seed = Seeds.HOSPITAL
        val birthday:ULong = 1u
        val datadir = MainApplication.getAppContext()!!.filesDir.path
        val monitorMempool = false

        val setCrytoProvider = uniffi.zingo.setCryptoDefaultProviderToRing()
        println(setCrytoProvider)

        val initFromSeedJson: String = uniffi.zingo.initFromSeed(server, seed, birthday, datadir, chainhint, monitorMempool)
        println("\nInit from seed:")
        println(initFromSeedJson)
        val initFromSeed: InitFromSeed = mapper.readValue(initFromSeedJson)

        val seedResult = initFromSeed.seed
        val birthdayResult = initFromSeed.birthday

        assertThat(seedResult).isEqualTo(seed)
        assertThat(birthdayResult).isEqualTo(1)

        val resultJson: String = uniffi.zingo.executeCommand("parse_address", "texregtest1z754rp9kk9vdewx4wm7pstvm0u2rwlgy4zp82v")
        val result: ParseResult = mapper.readValue(resultJson)
        println("\nParsed Address:")
        println(result)

        assertThat(result).isNotNull()

        val expectedResult = ParseResult(
            status = "success",
            chain_name = "regtest",
            address_kind = "tex"
        )

        assertThat(result).isEqualTo(expectedResult)
    }

    @Test
    fun ExecuteParseAddresInvalid() {
        val mapper = jacksonObjectMapper()

        val server = "http://10.0.2.2:20000"
        val chainhint = "regtest"
        val seed = Seeds.HOSPITAL
        val birthday:ULong = 1u
        val datadir = MainApplication.getAppContext()!!.filesDir.path
        val monitorMempool = false

        val setCrytoProvider = uniffi.zingo.setCryptoDefaultProviderToRing()
        println(setCrytoProvider)

        val initFromSeedJson: String = uniffi.zingo.initFromSeed(server, seed, birthday, datadir, chainhint, monitorMempool)
        println("\nInit from seed:")
        println(initFromSeedJson)
        val initFromSeed: InitFromSeed = mapper.readValue(initFromSeedJson)

        val seedResult = initFromSeed.seed
        val birthdayResult = initFromSeed.birthday

        assertThat(seedResult).isEqualTo(seed)
        assertThat(birthdayResult).isEqualTo(1)

        val wrongResultJson: String = uniffi.zingo.executeCommand("parse_address", "thiswontwork")
        val wrongResult: ParseResult = mapper.readValue(wrongResultJson)
        println("\nWrong Address:")
        println(wrongResult)

        assertThat(wrongResult).isNotNull()

        val expectedWrongResult = ParseResult(
            status = "Invalid address",
            chain_name = null,
            address_kind = null
        )

        assertThat(wrongResult).isEqualTo(expectedWrongResult)
    }
}