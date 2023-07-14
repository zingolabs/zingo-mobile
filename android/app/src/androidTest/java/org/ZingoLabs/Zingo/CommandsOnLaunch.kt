package org.ZingoLabs.Zingo

import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.experimental.categories.Category
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue

@Category(IntegrationTest::class)
class CommandsOnLaunch {

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

    @Test
    fun executeSyncFromSeed() {
        val mapper = jacksonObjectMapper()

        val server = "https://10.0.2.2:20000"
        val chainhint = "regtest"
        val seed = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art"
        val birthday = "1"
        val datadir = MainApplication.getAppContext()!!.filesDir.path

        var initFromSeedJson = RustFFI.initfromseed(server, seed, birthday, datadir, chainhint)
        System.out.println("\nInit from seed:")
        System.out.println(initFromSeedJson)
        val initFromSeed: InitFromSeed = mapper.readValue(initFromSeedJson)
        assertThat(initFromSeed.seed).isEqualTo("abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art")
        assertThat(initFromSeed.birthday).isEqualTo(1)

        var syncJson = RustFFI.execute("sync", "")
        System.out.println("\nSync:")
        System.out.println(syncJson)
    }

    // @Test
    // fun executeAddressFromSeed() {
    //     val mapper = jacksonObjectMapper()

    //     val server = "https://10.0.2.2:20000"
    //     val chainhint = "regtest"
    //     val seed = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art"
    //     val birthday = "1"
    //     val datadir = MainApplication.getAppContext()!!.filesDir.path

    //     var initFromSeedJson = RustFFI.initfromseed(server, seed, birthday, datadir, chainhint)
    //     System.out.println("\nInit from seed:")
    //     System.out.println(initFromSeedJson)
    //     val initFromSeed: InitFromSeed = mapper.readValue(initFromSeedJson)
    //     assertThat(initFromSeed.seed).isEqualTo("abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art")
    //     assertThat(initFromSeed.birthday).isEqualTo(1)

    //     var addressesJson = RustFFI.execute("addresses", "")
    //     System.out.println("\nAddresses:")
    //     System.out.println(addressesJson)
    //     val addresses: List<Addresses> = mapper.readValue(addressesJson)
    //     assertThat(addresses[0].address).isEqualTo("uregtest1zkuzfv5m3yhv2j4fmvq5rjurkxenxyq8r7h4daun2zkznrjaa8ra8asgdm8wwgwjvlwwrxx7347r8w0ee6dqyw4rufw4wg9djwcr6frzkezmdw6dud3wsm99eany5r8wgsctlxquu009nzd6hsme2tcsk0v3sgjvxa70er7h27z5epr67p5q767s2z5gt88paru56mxpm6pwz0cu35m")
    //     assertThat(addresses[0].receivers.transparent).isEqualTo("tmBsTi2xWTjUdEXnuTceL7fecEQKeWaPDJd")
    //     assertThat(addresses[0].receivers.sapling).isEqualTo("zregtestsapling1fmq2ufux3gm0v8qf7x585wj56le4wjfsqsj27zprjghntrerntggg507hxh2ydcdkn7sx8kya7p")
    //     assertThat(addresses[0].receivers.orchard_exists).isEqualTo(true)
    // }

    // @Test
    // fun executeAddressFromUfvk() {
    //     val mapper = jacksonObjectMapper()

    //     val server = "https://mainnet.lightwalletd.com:9067"
    //     val chainhint = "main"
    //     val ufvk = "uview1vmle9qzgsmzn8qskg06cjjt406eq3euvkn8un3t6sk7fjd72qp72guyskktr2gvgcpmd99qgquxdw7s54v0dfxn3degzhxp9gmvpve6vlvv459pxfre05v6l47aqx47rgh86t6n77svstd8ff6d8cwtn98uq66k6u5jqrpyz0pqflkppfq3djscrd2acnc7ymkd6fssk0t4rh2ynaux7z4ylt38jqgjhnu88h2jz8qwd3t5dwsc3ycvsea6grs4zg76r9vw48r9zvlphnpfsgc5eqpum7hghdm2eguw4h6n9m8rhuzh0qdc24z4z5ftcv6xxvvs3yrugea23xlys3f9qv0fenh0xp0hej8enlr82esl54hn27d6432kygwqx700ez84e72f03vtmece73dftpjvv3v7w65yaz2rjwmarxjzrnn02u5kx4p7a42k5lxgcgqgwjyp9w6x24ccm0dvlf4637ss6l3xmuv2strza60c5k5uasdcn"
    //     val birthday = "2126800"
    //     val datadir = MainApplication.getAppContext()!!.filesDir.path

    //     var initFromUfvk = RustFFI.initfromufvk(server, ufvk, birthday, datadir, chainhint)
    //     System.out.println("\nInit From UFVK:")
    //     System.out.println(initFromUfvk)
    //     assertThat(initFromUfvk).isEqualTo("Error: This wallet is watch-only.")

    //     var addressesJson = RustFFI.execute("addresses", "")
    //     System.out.println("\nAddresses:")
    //     System.out.println(addressesJson)
    //     val addresses: List<Addresses> = mapper.readValue(addressesJson)
    //     assertThat(addresses[0].address).isEqualTo("u16sw4v6wy7f4jzdny55yzl020tp3yqg3c85dc6n7mmq0urfm6adqg79hxmyk85ufn4lun4pfh5q48cc3kvxhxm3w978eqqecdd260gkzjrkun6z7m9mcrt2zszaj0mvk6ufux2zteqwh57cq906hz3rkg63duaeqsvjelv9h5srct0zq8rvlv23wz5hed7zuatqd7p6p4ztugc4t4w2g")
    //     assertThat(addresses[0].receivers.transparent).isEqualTo("t1dUDJ62ANtmebE8drFg7g2MWYwXHQ6Xu3F")
    //     assertThat(addresses[0].receivers.sapling).isEqualTo("zs16uhd4mux24se6wkm74vld0ec63d4dxt3d7m80l5xytreplkkllrrf9c7fj859mhp8tkcq9hxfvj")
    //     assertThat(addresses[0].receivers.orchard_exists).isEqualTo(true)
    // }    
}
