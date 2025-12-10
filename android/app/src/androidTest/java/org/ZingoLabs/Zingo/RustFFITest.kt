package org.ZingoLabs.Zingo

import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.experimental.categories.Category
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue

object Seeds {
    const val HOSPITAL = "hospital museum valve antique skate museum unfold vocal weird milk scale social vessel identify crowd hospital control album rib bulb path oven civil tank"
}

object Ufvk {
    const val HOSPITAL = "uviewregtest1zd5hsn447739jr5pk879pn06wan8gewam949xjqvwgfc7zec29x2ezqyeq6vmtwkcmn0kkfl447caqsccg582dp50ax972dfm4eh5f4mqj730fgr7hygvjeqxlgpwynrmcu57fjjqlns95chfjfq4xg7v977x603un9fuw73zvn2t32pfcfewrh67tzv04wstjg0yx4r3lpmpaea9nsyll6juu9jtyc0fstdwde06l4tvzlerytyutfd3yptq5r5csfck9c5ks8rzaj5r9tgltarejfdxu8h79sxmc6knxtnglp0pa7y3kw708rueg984ty6lhyrlzmk2swyqqfe0q2nmzhcxme9rsvprcw50ms463twx4suldhm0p94lem8ryan4e4y8fpp8grr5kmlygm70h2zhl0d7mfra5qs78jq9wqctvk8fhdu9cv78q00v7qzl9w50j242xr0945pmsu2vrh6jcvq8fxad420m8kxpd3cgyd6wxy6"
}

data class InitFromSeed (
    val seed_phrase : String,
    val birthday : Long,
    val no_of_accounts: Long
)

data class InitFromUfvk (
    val ufvk : String,
    val birthday : Long
)

data class ExportUfvk (
    val ufvk : String,
    val birthday : Long
)

data class UnifiedAddress (
	val account : Long?,
    val address_index : Long?,
	val has_orchard : Boolean?,
    val has_sapling : Boolean?,
    val has_transparent : Boolean?,
    val encoded_address : String?,
    val error : String?
)

data class TransparentAddress (
	val account : Long?,
    val address_index : Long?,
    val scope : String?,
	val encoded_address : String?,
    val error : String?
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

data class ScanRanges (
    val priority : String = "",
    val start_block : String = "",
    val end_block : String = ""
)

data class SyncStatus (
    val scan_ranges : List<ScanRanges> = emptyList(),
    val sync_start_height : Long = 0L,
    val session_blocks_scanned : Long = 0L,
    val total_blocks_scanned : Long = 0L,
    val percentage_session_blocks_scanned : Double = 0.0,
    val percentage_total_blocks_scanned : Double = 0.0,
    val session_sapling_outputs_scanned : Long = 0L,
    val total_sapling_outputs_scanned : Long = 0L,
    val session_orchard_outputs_scanned : Long = 0L,
    val total_orchard_outputs_scanned : Long = 0L,
    val percentage_session_outputs_scanned : Double = 0.0,
    val percentage_total_outputs_scanned : Double = 0.0
)

data class Balance (
    val total_sapling_balance : Long,
    val confirmed_sapling_balance : Long,
    val unconfirmed_sapling_balance : Long,
    val total_orchard_balance : Long,
    val confirmed_orchard_balance : Long,
    val unconfirmed_orchard_balance : Long,
    val total_transparent_balance : Long,
    val confirmed_transparent_balance : Long,
    val unconfirmed_transparent_balance : Long
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
    val total : Long,
)

data class ParseResult (
    val status: String,
    val chain_name: String?,
    val address_kind: String?
)

val context = MainApplication.getAppContext()!!

class ExecuteAddressesFromSeed {
    @Test
    fun executeAddressesFromSeed() {
        val mapper = jacksonObjectMapper()

        val serveruri = "http://10.0.2.2:20000"
        val chainhint = "regtest"
        val seed = Seeds.HOSPITAL
        
        val setCrytoProvider = uniffi.zingo.setCryptoDefaultProviderToRing()
        println(setCrytoProvider)

        val initFromSeedJson: String = uniffi.zingo.initFromSeed(seed, 1u, serveruri, chainhint, "Medium", 1u)
        println("\nInit from seed:")
        println(initFromSeedJson)
        val initFromSeed: InitFromSeed = mapper.readValue(initFromSeedJson)

        assertThat(initFromSeed.seed_phrase).isEqualTo(seed)
        assertThat(initFromSeed.birthday).isEqualTo(1)

        val infoJson: String = uniffi.zingo.infoServer()
        println("\nInfo:")
        println(infoJson)
        val info: Info = mapper.readValue(infoJson)
        assertThat(info.latest_block_height).isGreaterThan(0)

        val exportUfvkJson: String = uniffi.zingo.getUfvk()
        println("\nExport Ufvk:")
        println(exportUfvkJson)

        val addressesJson: String = uniffi.zingo.getUnifiedAddresses()
        println("\nAddresses:")
        println(addressesJson)
        val addresses: List<UnifiedAddress> = mapper.readValue(addressesJson)
        assertThat(addresses[0].encoded_address).isEqualTo("uregtest1ue949txhf9t2z6ldg8wc6s5t439t2hu55yh9l58gc23cmxthths836nxtpyvhpkrftsp2jnnp9eadtqy2nefxn04eyxeu8l0x5kk8ct9")
        assertThat(addresses[0].has_orchard).isEqualTo(true)
        assertThat(addresses[0].has_sapling).isEqualTo(false)
        assertThat(addresses[0].has_transparent).isEqualTo(false)

        val taddressesJson: String = uniffi.zingo.getTransparentAddresses()
        println("\nT Addresses:")
        println(taddressesJson)
        val taddresses: List<TransparentAddress> = mapper.readValue(taddressesJson)
        assertThat(taddresses[0].encoded_address).isEqualTo("tmFLszfkjgim4zoUMAXpuohnFBAKy99rr2i")
        assertThat(taddresses[0].scope).isEqualTo("external")
    }
}

class ExecuteAddressesFromUfvk {
    @Test
    fun executeAddressFromUfvk() {
        val mapper = jacksonObjectMapper()

        val serveruri = "http://10.0.2.2:20000"
        val chainhint = "regtest"
        val ufvk = Ufvk.HOSPITAL
        
        val setCrytoProvider = uniffi.zingo.setCryptoDefaultProviderToRing()
        println(setCrytoProvider)

        val initFromUfvkJson: String = uniffi.zingo.initFromUfvk(ufvk, 1u, serveruri, chainhint, "Medium", 1u)
        println("\nInit From UFVK:")
        println(initFromUfvkJson)
        val initFromUfvk: InitFromUfvk = mapper.readValue(initFromUfvkJson)

        assertThat(initFromUfvk.ufvk).isEqualTo(ufvk)
        assertThat(initFromUfvk.birthday).isEqualTo(1)

        val infoJson: String = uniffi.zingo.infoServer()
        println("\nInfo:")
        println(infoJson)
        val info: Info = mapper.readValue(infoJson)
        assertThat(info.latest_block_height).isGreaterThan(0)

        val exportUfvkJson: String = uniffi.zingo.getUfvk()
        println("\nExport Ufvk:")
        println(exportUfvkJson)
        val exportUfvk: ExportUfvk = mapper.readValue(exportUfvkJson)
        assertThat(exportUfvk.ufvk).isEqualTo(ufvk)
        assertThat(exportUfvk.birthday).isEqualTo(1)

        val addressesJson: String = uniffi.zingo.getUnifiedAddresses()
        println("\nAddresses:")
        println(addressesJson)
        val addresses: List<UnifiedAddress> = mapper.readValue(addressesJson)
        assertThat(addresses[0].encoded_address).isEqualTo("uregtest1ue949txhf9t2z6ldg8wc6s5t439t2hu55yh9l58gc23cmxthths836nxtpyvhpkrftsp2jnnp9eadtqy2nefxn04eyxeu8l0x5kk8ct9")
        assertThat(addresses[0].has_orchard).isEqualTo(true)
        assertThat(addresses[0].has_sapling).isEqualTo(false)
        assertThat(addresses[0].has_transparent).isEqualTo(false)

        val taddressesJson: String = uniffi.zingo.getTransparentAddresses()
        println("\nT Addresses:")
        println(taddressesJson)
        val taddresses: List<TransparentAddress> = mapper.readValue(taddressesJson)
        assertThat(taddresses[0].encoded_address).isEqualTo("tmFLszfkjgim4zoUMAXpuohnFBAKy99rr2i")
        assertThat(taddresses[0].scope).isEqualTo("external")
    }    
}

class ExecuteVersionFromSeed {
    @Test
    fun executeVersionFromSeed() {
        val mapper = jacksonObjectMapper()

        val serveruri = "http://10.0.2.2:20000"
        val chainhint = "regtest"
        val seed = Seeds.HOSPITAL
        
        val setCrytoProvider = uniffi.zingo.setCryptoDefaultProviderToRing()
        println(setCrytoProvider)

        val initFromSeedJson: String = uniffi.zingo.initFromSeed(seed, 1u, serveruri, chainhint, "Medium", 1u)
        println("\nInit from seed:")
        println(initFromSeedJson)
        val initFromSeed: InitFromSeed = mapper.readValue(initFromSeedJson)

        assertThat(initFromSeed.seed_phrase).isEqualTo(seed)
        assertThat(initFromSeed.birthday).isEqualTo(1)

        val infoJson: String = uniffi.zingo.infoServer()
        println("\nInfo:")
        println(infoJson)
        val info: Info = mapper.readValue(infoJson)
        assertThat(info.latest_block_height).isGreaterThan(0)

        val version: String = uniffi.zingo.getVersion()
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

        val serveruri = "http://10.0.2.2:20000"
        val chainhint = "regtest"
        val seed = Seeds.HOSPITAL

        val setCrytoProvider = uniffi.zingo.setCryptoDefaultProviderToRing()
        println(setCrytoProvider)

        val initFromSeedJson: String = uniffi.zingo.initFromSeed(seed, 1u, serveruri, chainhint, "Medium", 1u)
        println("\nInit from seed:")
        println(initFromSeedJson)
        val initFromSeed: InitFromSeed = mapper.readValue(initFromSeedJson)

        assertThat(initFromSeed.seed_phrase).isEqualTo(seed)
        assertThat(initFromSeed.birthday).isEqualTo(1)

        val infoJson: String = uniffi.zingo.infoServer()
        println("\nInfo:")
        println(infoJson)
        val info: Info = mapper.readValue(infoJson)
        assertThat(info.latest_block_height).isGreaterThan(0)

        var heightJson: String = uniffi.zingo.getLatestBlockWallet()
        println("\nHeight pre-sync:")
        println(heightJson)
        val heightPreSync: Height = mapper.readValue(heightJson)
        assertThat(heightPreSync.height).isEqualTo(0)

        val syncJson: String = uniffi.zingo.runSync()
        println("\nSync:")
        println(syncJson)

        var syncStatus: SyncStatus
        while (true) {
            val syncStatusJson: String = uniffi.zingo.statusSync()
            println("\nSync status:")
            println(syncStatusJson)
            if (syncStatusJson.lowercase().startsWith("error")) {
                println("Sync Error!:")
                break
            }
            syncStatus = mapper.readValue(syncStatusJson)

            if (syncStatus.percentage_total_outputs_scanned >= 100.0) {
                println("Sync completed!")
                break
            }

            Thread.sleep(1000)
        }

        heightJson = uniffi.zingo.getLatestBlockWallet()
        println("\nHeight post-sync:")
        println(heightJson)
        val heightPostSync: Height = mapper.readValue(heightJson)
        assertThat(heightPostSync.height).isEqualTo(info.latest_block_height)
    }
}

class ExecuteSendFromOrchard {
    @Test
    fun executeSendFromOrchard() {
        val mapper = jacksonObjectMapper()

        val serveruri = "http://10.0.2.2:20000"
        val chainhint = "regtest"
        val seed = Seeds.HOSPITAL
        
        val setCrytoProvider = uniffi.zingo.setCryptoDefaultProviderToRing()
        println(setCrytoProvider)

        val initFromSeedJson: String = uniffi.zingo.initFromSeed(seed, 1u, serveruri, chainhint, "Medium", 1u)
        println("\nInit from seed:")
        println(initFromSeedJson)
        val initFromSeed: InitFromSeed = mapper.readValue(initFromSeedJson)

        assertThat(initFromSeed.seed_phrase).isEqualTo(seed)
        assertThat(initFromSeed.birthday).isEqualTo(1)

        val infoJson: String = uniffi.zingo.infoServer()
        println("\nInfo:")
        println(infoJson)
        val info: Info = mapper.readValue(infoJson)
        assertThat(info.latest_block_height).isGreaterThan(0)

        var syncJson: String = uniffi.zingo.runSync()
        println("\nSync:")
        println(syncJson)

        var syncStatusBefore: SyncStatus
        while (true) {
            val syncStatusBeforeJson: String = uniffi.zingo.statusSync()
            println("\nSync status:")
            println(syncStatusBeforeJson)
            if (syncStatusBeforeJson.lowercase().startsWith("error")) {
                println("Sync Error!:")
                break
            }
            syncStatusBefore = mapper.readValue(syncStatusBeforeJson)

            if (syncStatusBefore.percentage_total_outputs_scanned >= 100.0) {
                println("Sync completed!")
                break
            }

            Thread.sleep(1000)
        }

        var balanceJson: String = uniffi.zingo.getBalance()
        println("\nBalance pre-send:")
        println(balanceJson)
        val balancePreSend: Balance = mapper.readValue(balanceJson)
        assertThat(balancePreSend.confirmed_orchard_balance).isEqualTo(1000000)
        assertThat(balancePreSend.confirmed_transparent_balance).isEqualTo(0)

        val taddressesJson: String = uniffi.zingo.getTransparentAddresses()
        println("\nT Addresses:")
        println(taddressesJson)
        val taddresses: List<TransparentAddress> = mapper.readValue(taddressesJson)

        val send = taddresses[0].encoded_address?.let { Send(it, 100000, null) }

        val proposeJson: String = uniffi.zingo.send(mapper.writeValueAsString(listOf(send)))
        println("\nPropose:")
        println(proposeJson)

        val confirmJson: String = uniffi.zingo.confirm()
        println("\nConfirm Txid:")
        println(confirmJson)

        syncJson = uniffi.zingo.runSync()
        println("\nSync:")
        println(syncJson)

        var syncStatus: SyncStatus
        while (true) {
            val syncStatusJson: String = uniffi.zingo.statusSync()
            println("\nSync status:")
            println(syncStatusJson)
            if (syncStatusJson.lowercase().startsWith("error")) {
                println("Sync Error!:")
                break
            }
            syncStatus = mapper.readValue(syncStatusJson)

            if (syncStatus.percentage_total_outputs_scanned >= 100.0) {
                println("Sync completed!")
                break
            }

            Thread.sleep(1000)
        }

        balanceJson = uniffi.zingo.getBalance()
        println("\nBalance post-send:")
        println(balanceJson)
        val balancePostSend: Balance = mapper.readValue(balanceJson)
        assertThat(balancePostSend.total_orchard_balance).isEqualTo(885000)
        // the transparent funds are unconfirmed...
        assertThat(balancePostSend.confirmed_transparent_balance).isEqualTo(0)
        assertThat(balancePostSend.unconfirmed_transparent_balance).isEqualTo(100000)
    }
}

class UpdateCurrentPriceAndValueTransfersFromSeed {
    @Test
    fun updateCurrentPriceAndValueTransfersFromSeed() {
        val mapper = jacksonObjectMapper()

        val serveruri = "http://10.0.2.2:20000"
        val chainhint = "regtest"
        val seed = Seeds.HOSPITAL
        val tor = "false"

        val setCrytoProvider = uniffi.zingo.setCryptoDefaultProviderToRing()
        println(setCrytoProvider)

        val initFromSeedJson: String = uniffi.zingo.initFromSeed(seed, 1u, serveruri, chainhint, "Medium", 1u)
        println("\nInit from seed:")
        println(initFromSeedJson)
        val initFromSeed: InitFromSeed = mapper.readValue(initFromSeedJson)

        assertThat(initFromSeed.seed_phrase).isEqualTo(seed)
        assertThat(initFromSeed.birthday).isEqualTo(1)

        val infoJson: String = uniffi.zingo.infoServer()
        println("\nInfo:")
        println(infoJson)
        val info: Info = mapper.readValue(infoJson)
        assertThat(info.latest_block_height).isGreaterThan(0)

        val price: String = uniffi.zingo.zecPrice(tor)
        println("\nPrice:")
        println(price)

        val syncJson: String = uniffi.zingo.runSync()
        println("\nSync:")
        println(syncJson)

        var syncStatus: SyncStatus
        while (true) {
            val syncStatusJson: String = uniffi.zingo.statusSync()
            println("\nSync status:")
            println(syncStatusJson)
            if (syncStatusJson.lowercase().startsWith("error")) {
                println("Sync Error!:")
                break
            }
            syncStatus = mapper.readValue(syncStatusJson)

            if (syncStatus.percentage_total_outputs_scanned >= 100.0) {
                println("Sync completed!")
                break
            }

            Thread.sleep(1000)
        }

        val recipientAddress = "uregtest1az7w9w3tdegf0srnsgqyqfhyfrpx2h6u4pkc2yq3ja552vzhwkjqgy4fu6a6kcu9280ppajamj2gcq9lx9x0zxdrsns94ml3e443a7t2dm50382mhtkleydrq74q5xlh6sel5u0qlrvflf20qgljzszd2ht9jmerwwahct9rtuc3nqdk"

        val valueTranfersJson: String = uniffi.zingo.getValueTransfers()
        println("\nValue Transfers:")
        println(valueTranfersJson)
        val valueTranfers: ValueTransfers = mapper.readValue(valueTranfersJson)
        // the value transfers have 3 items for 3 different txs
        // 1. Received - 1_000_000 - orchard (1 item)
        // 2. Sent - 110_000 - uregtest1az7w9w3t... (1 item)
        // 3. memoToSelf - 10_000 (1 item)
        assertThat(valueTranfers.value_transfers.size).isEqualTo(3)
        // third item have to be a `fee` from the last `Sent` with the same txid
        assertThat(valueTranfers.value_transfers[0].kind).isEqualTo("memo-to-self")
        assertThat(valueTranfers.value_transfers[0].status).isEqualTo("confirmed")
        assertThat(valueTranfers.value_transfers[0].value).isEqualTo(0)
        assertThat(valueTranfers.value_transfers[0].transaction_fee).isEqualTo(20000)
        // second item have to be a `Sent`
        assertThat(valueTranfers.value_transfers[1].kind).isEqualTo("sent")
        assertThat(valueTranfers.value_transfers[1].recipient_address).isEqualTo(recipientAddress)
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

        val rpcModule = RPCModule(MainApplication.getAppReactContext())

        val serveruri = "http://10.0.2.2:20000"
        val chainhint = "regtest"
        val seed = Seeds.HOSPITAL
        
        val setCrytoProvider = uniffi.zingo.setCryptoDefaultProviderToRing()
        println(setCrytoProvider)

        val initFromSeedJson: String = uniffi.zingo.initFromSeed(seed, 1u, serveruri, chainhint, "Medium", 1u)
        println("\nInit from seed:")
        println(initFromSeedJson)
        val initFromSeed: InitFromSeed = mapper.readValue(initFromSeedJson)

        assertThat(initFromSeed.seed_phrase).isEqualTo(seed)
        assertThat(initFromSeed.birthday).isEqualTo(1)

        val infoJson: String = uniffi.zingo.infoServer()
        println("\nInfo:")
        println(infoJson)
        val info: Info = mapper.readValue(infoJson)
        assertThat(info.latest_block_height).isGreaterThan(0)

        val syncJson:String = uniffi.zingo.runSync()
        println("\nSync:")
        println(syncJson)

        var syncStatus: SyncStatus
        while (true) {
            val syncStatusJson: String = uniffi.zingo.statusSync()
            println("\nSync status:")
            println(syncStatusJson)
            if (syncStatusJson.lowercase().startsWith("error")) {
                println("Sync Error!:")
                break
            }
            syncStatus = mapper.readValue(syncStatusJson)

            if (syncStatus.percentage_total_outputs_scanned >= 100.0) {
                println("Sync completed!")
                break
            }

            Thread.sleep(1000)
        }

        val valueTranfersJson: String = uniffi.zingo.getValueTransfers()
        println("\nValue Transfers:")
        println(valueTranfersJson)

        // Value Transfers
        // 1. Received in orchard pool =     +500_000
        // 2. Received in sapling pool =     +250_000
        // 3. Received in transparent pool = +250_000
        // 4. Send - 100_000 + 20_000fee =   -110_000
        // 5. MemoToSelf orchard pool =       -10_000 (send-to-self)
        // 6. MemoToSelf sapling pool =       -10_000 (send-to-self)
        // 7. MemoToSelf transparent pool =   -15_000 (send-to-self)
        // 8. Upgrading sapling pool =        -20_000 (shield)
        //
        // orchard pool     = 710_000
        // sapling pool     = 125_000
        // transparent pool = 0

        val balanceJson:String = uniffi.zingo.getBalance()
        println("\nBalance:")
        println(balanceJson)
        val balance: Balance = mapper.readValue(balanceJson)

        assertThat(balance.total_orchard_balance).isEqualTo(710000)
        assertThat(balance.confirmed_orchard_balance).isEqualTo(710000)
        assertThat(balance.total_sapling_balance).isEqualTo(125000)
        assertThat(balance.confirmed_sapling_balance).isEqualTo(125000)
        assertThat(balance.confirmed_transparent_balance).isEqualTo(0)

        // save the wallet file
        rpcModule.saveWalletFile()

        // change to Offline mode
        val changeServerJson:String = uniffi.zingo.changeServer("")
        println("\nChange Serveruri:")
        println(changeServerJson)
        assertThat(changeServerJson.lowercase().startsWith("error")).isFalse()

        // open the wallet with no server - Offline mode - Main by default
        val loadWalletJson: String = rpcModule.loadExistingWalletNative("", "main", "Medium", "1")
        println("\nLoad Wallet:")
        println(loadWalletJson)
    }
}

class ExecuteParseAddressForTex {
    @Test
    fun executeParseAddressForTex() {
        val mapper = jacksonObjectMapper()

        val serveruri = "http://10.0.2.2:20000"
        val chainhint = "regtest"
        val seed = Seeds.HOSPITAL
        
        val setCrytoProvider = uniffi.zingo.setCryptoDefaultProviderToRing()
        println(setCrytoProvider)

        val initFromSeedJson: String = uniffi.zingo.initFromSeed(seed, 1u, serveruri, chainhint, "Medium", 1u)
        println("\nInit from seed:")
        println(initFromSeedJson)
        val initFromSeed: InitFromSeed = mapper.readValue(initFromSeedJson)

        val seedResult = initFromSeed.seed_phrase
        val birthdayResult = initFromSeed.birthday

        assertThat(seedResult).isEqualTo(seed)
        assertThat(birthdayResult).isEqualTo(1)

        val infoJson: String = uniffi.zingo.infoServer()
        println("\nInfo:")
        println(infoJson)
        val info: Info = mapper.readValue(infoJson)
        assertThat(info.latest_block_height).isGreaterThan(0)

        val resultJson: String = uniffi.zingo.parseAddress("texregtest1z754rp9kk9vdewx4wm7pstvm0u2rwlgy4zp82v")
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
}

class ExecuteParseAddressInvalid {
    @Test
    fun executeParseAddressInvalid() {
        val mapper = jacksonObjectMapper()

        val serveruri = "http://10.0.2.2:20000"
        val chainhint = "regtest"
        val seed = Seeds.HOSPITAL
        
        val setCrytoProvider = uniffi.zingo.setCryptoDefaultProviderToRing()
        println(setCrytoProvider)

        val initFromSeedJson: String = uniffi.zingo.initFromSeed(seed, 1u, serveruri, chainhint, "Medium", 1u)
        println("\nInit from seed:")
        println(initFromSeedJson)
        val initFromSeed: InitFromSeed = mapper.readValue(initFromSeedJson)

        val seedResult = initFromSeed.seed_phrase
        val birthdayResult = initFromSeed.birthday

        assertThat(seedResult).isEqualTo(seed)
        assertThat(birthdayResult).isEqualTo(1)

        val infoJson: String = uniffi.zingo.infoServer()
        println("\nInfo:")
        println(infoJson)
        val info: Info = mapper.readValue(infoJson)
        assertThat(info.latest_block_height).isGreaterThan(0)

        val wrongResultJson: String = uniffi.zingo.parseAddress("thiswontwork")
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