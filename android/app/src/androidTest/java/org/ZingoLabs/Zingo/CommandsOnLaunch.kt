package org.ZingoLabs.Zingo

import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.experimental.categories.Category
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue

@Category(IntegrationTest::class)
class CommandsOnLaunch {

    data class Addresses (
    	val address : String,
    	val receivers : Receivers
    )

    data class Receivers (
    	val transparent : String,
    	val sapling : String,
    	val orchard_exists : Boolean
    )

    data class Balance (
        // TODO: change to ULongs and fix errors with deserialising to unsigned
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

    @Test
    fun launchFromUfvkTest() {
        val mapper = jacksonObjectMapper()

        val server = "https://mainnet.lightwalletd.com:9067"
        val chainhint = "main"
        val ufvk = "uview1vmle9qzgsmzn8qskg06cjjt406eq3euvkn8un3t6sk7fjd72qp72guyskktr2gvgcpmd99qgquxdw7s54v0dfxn3degzhxp9gmvpve6vlvv459pxfre05v6l47aqx47rgh86t6n77svstd8ff6d8cwtn98uq66k6u5jqrpyz0pqflkppfq3djscrd2acnc7ymkd6fssk0t4rh2ynaux7z4ylt38jqgjhnu88h2jz8qwd3t5dwsc3ycvsea6grs4zg76r9vw48r9zvlphnpfsgc5eqpum7hghdm2eguw4h6n9m8rhuzh0qdc24z4z5ftcv6xxvvs3yrugea23xlys3f9qv0fenh0xp0hej8enlr82esl54hn27d6432kygwqx700ez84e72f03vtmece73dftpjvv3v7w65yaz2rjwmarxjzrnn02u5kx4p7a42k5lxgcgqgwjyp9w6x24ccm0dvlf4637ss6l3xmuv2strza60c5k5uasdcn"
        val birthday = "2126800"
        val datadir = MainApplication.getAppContext()!!.filesDir.path

        var initfromufvk = RustFFI.initfromufvk(server, ufvk, birthday, datadir, chainhint)
        System.out.println("Init From UFVK:")
        System.out.println(initfromufvk)
        assertThat(initfromufvk).isEqualTo("Error: This wallet is watch-only.")

        var addressesJson = RustFFI.execute("addresses", "")
        System.out.println("Addresses:")
        System.out.println(addressesJson)
        val addresses: List<Addresses> = mapper.readValue(addressesJson)
        assertThat(addresses[0].address).isEqualTo("u16sw4v6wy7f4jzdny55yzl020tp3yqg3c85dc6n7mmq0urfm6adqg79hxmyk85ufn4lun4pfh5q48cc3kvxhxm3w978eqqecdd260gkzjrkun6z7m9mcrt2zszaj0mvk6ufux2zteqwh57cq906hz3rkg63duaeqsvjelv9h5srct0zq8rvlv23wz5hed7zuatqd7p6p4ztugc4t4w2g")
        assertThat(addresses[0].receivers.transparent).isEqualTo("t1dUDJ62ANtmebE8drFg7g2MWYwXHQ6Xu3F")
        assertThat(addresses[0].receivers.sapling).isEqualTo("zs16uhd4mux24se6wkm74vld0ec63d4dxt3d7m80l5xytreplkkllrrf9c7fj859mhp8tkcq9hxfvj")
        assertThat(addresses[0].receivers.orchard_exists).isEqualTo(true)
        
        var balanceJson = RustFFI.execute("balance", "")
        System.out.println("Balance:")
        System.out.println(balanceJson)
        val balance: Balance = mapper.readValue(balanceJson)
        assertThat(balance.sapling_balance).isEqualTo(0)
        assertThat(balance.verified_sapling_balance).isEqualTo(0)
        assertThat(balance.spendable_sapling_balance).isEqualTo(0)
        assertThat(balance.unverified_sapling_balance).isEqualTo(0)
        assertThat(balance.orchard_balance).isEqualTo(0)
        assertThat(balance.verified_orchard_balance).isEqualTo(0)
        assertThat(balance.spendable_orchard_balance).isEqualTo(0)
        assertThat(balance.unverified_orchard_balance).isEqualTo(0)
        assertThat(balance.transparent_balance).isEqualTo(0)
        
        var notes = RustFFI.execute("notes", "")
        System.out.println("Notes:")
        System.out.println(notes)

        var list = RustFFI.execute("list", "")
        System.out.println("List:")
        System.out.println(list)

        var info = RustFFI.execute("info", "")
        System.out.println("Info:")
        System.out.println(info)

        var defaultfee = RustFFI.execute("defaultfee", "")
        System.out.println("Default Fee:")
        System.out.println(defaultfee)

        var getoption_download_memos = RustFFI.execute("getoption", "download_memos")
        System.out.println("Get Option Download Memos:")
        System.out.println(getoption_download_memos)

        var getoption_filter_thr = RustFFI.execute("getoption", "transaction_filter_threshold")
        System.out.println("Get Option Transaction Filter Threshold:")
        System.out.println(getoption_filter_thr)
        
        var exportufvk = RustFFI.execute("exportufvk", "")
        System.out.println("Export UFVK:")
        System.out.println(exportufvk)

        var height = RustFFI.execute("height", "")
        System.out.println("Height:")
        System.out.println(height)

        var sync = RustFFI.execute("sync", "")
        System.out.println("Sync:")
        System.out.println(sync)
        
        var syncstatus = RustFFI.execute("syncstatus", "")
        System.out.println("Sync Status:")
        System.out.println(syncstatus)        
    }
}
