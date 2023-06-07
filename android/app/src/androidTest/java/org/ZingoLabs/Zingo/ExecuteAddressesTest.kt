package org.ZingoLabs.Zingo

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.experimental.categories.Category

@Category(IntegrationTest::class)
class ExecuteAddressesTest {

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
    fun executeAddresses() {  
        val server = "https://mainnet.lightwalletd.com:9067"
        val chainhint = "main"
        val seed = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art"
        val birthday = "1"
        val datadir = MainApplication.getAppContext()!!.filesDir.path

        RustFFI.initfromseed(server, seed, birthday, datadir, chainhint)

        val resp = RustFFI.execute("addresses", "")
        val addresses: List<Addresses> = jacksonObjectMapper().readValue(resp)

        assertThat(addresses[0].address).isEqualTo("u16sw4v6wy7f4jzdny55yzl020tp3yqg3c85dc6n7mmq0urfm6adqg79hxmyk85ufn4lun4pfh5q48cc3kvxhxm3w978eqqecdd260gkzjrkun6z7m9mcrt2zszaj0mvk6ufux2zteqwh57cq906hz3rkg63duaeqsvjelv9h5srct0zq8rvlv23wz5hed7zuatqd7p6p4ztugc4t4w2g")
        assertThat(addresses[0].receivers.transparent).isEqualTo("t1dUDJ62ANtmebE8drFg7g2MWYwXHQ6Xu3F")
        assertThat(addresses[0].receivers.sapling).isEqualTo("zs16uhd4mux24se6wkm74vld0ec63d4dxt3d7m80l5xytreplkkllrrf9c7fj859mhp8tkcq9hxfvj")
        assertThat(addresses[0].receivers.orchard_exists).isEqualTo(true)
    }
}
