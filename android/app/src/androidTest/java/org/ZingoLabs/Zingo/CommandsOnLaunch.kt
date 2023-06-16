package org.ZingoLabs.Zingo

import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.experimental.categories.Category

@Category(IntegrationTest::class)
class CommandsOnLaunch {
    @Test
    fun launchFromUfvkTest() {
        val server = "https://mainnet.lightwalletd.com:9067"
        val chainhint = "main"
        val ufvk = "uview1vmle9qzgsmzn8qskg06cjjt406eq3euvkn8un3t6sk7fjd72qp72guyskktr2gvgcpmd99qgquxdw7s54v0dfxn3degzhxp9gmvpve6vlvv459pxfre05v6l47aqx47rgh86t6n77svstd8ff6d8cwtn98uq66k6u5jqrpyz0pqflkppfq3djscrd2acnc7ymkd6fssk0t4rh2ynaux7z4ylt38jqgjhnu88h2jz8qwd3t5dwsc3ycvsea6grs4zg76r9vw48r9zvlphnpfsgc5eqpum7hghdm2eguw4h6n9m8rhuzh0qdc24z4z5ftcv6xxvvs3yrugea23xlys3f9qv0fenh0xp0hej8enlr82esl54hn27d6432kygwqx700ez84e72f03vtmece73dftpjvv3v7w65yaz2rjwmarxjzrnn02u5kx4p7a42k5lxgcgqgwjyp9w6x24ccm0dvlf4637ss6l3xmuv2strza60c5k5uasdcn"
        val birthday = "2123300"
        val datadir = MainApplication.getAppContext()!!.filesDir.path

        var initfromufvk_resp = RustFFI.initfromufvk(server, ufvk, birthday, datadir, chainhint)
        assertThat(initfromufvk_resp).isEqualTo("Error: This wallet is watch-only.")

        var addresses_resp = RustFFI.execute("addresses", "")
        var balance_resp = RustFFI.execute("balance", "")
        RustFFI.execute("notes", "")
        RustFFI.execute("list", "")
        RustFFI.execute("info", "")
        RustFFI.execute("defaultfee", "")
        RustFFI.execute("getoption", "download_memos")
        RustFFI.execute("getoption", "transaction_filter_threshold")
        RustFFI.execute("height", "")
        RustFFI.execute("exportufvk", "")
        RustFFI.execute("sync", "")
        RustFFI.execute("syncstatus", "")

        System.out.println("Init From UFVK:")
        System.out.println(initfromufvk_resp)
        System.out.println("Addresses:")
        System.out.println(addresses_resp)
        System.out.println("Balance:")
        System.out.println(balance_resp)

        assertThat(true).isEqualTo(false)
    }

    // @Test
    // fun launchFromSeedTest() {
    //     val server = "https://mainnet.lightwalletd.com:9067"
    //     val chainhint = "main"
    //     val seed = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art"
    //     val birthday = "2122500"
    //     val datadir = MainApplication.getAppContext()!!.filesDir.path

    //     RustFFI.initfromseed(server, seed, birthday, datadir, chainhint)

    //     RustFFI.execute("addresses", "")
    //     RustFFI.execute("balance", "")
    //     RustFFI.execute("notes", "")
    //     RustFFI.execute("list", "")
    //     RustFFI.execute("info", "")
    //     RustFFI.execute("defaultfee", "")
    //     RustFFI.execute("getoption", "download_memos")
    //     RustFFI.execute("getoption", "transaction_filter_threshold")
    //     RustFFI.execute("height", "")
    //     RustFFI.execute("seed", "")
    //     RustFFI.execute("sync", "")
    //     RustFFI.execute("syncstatus", "")

    //     assertThat(true).isEqualTo(false)
    // }
}
