package org.ZingoLabs.Zingo

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.experimental.categories.Category

@Category(IntegrationTest::class)
class BobaTest {

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
    fun BobaTest() {  
        val server = "https://testnet.lightwalletd.com:9067"
        val seed = "very airport kite ordinary pelican there like spider kitchen top meat zone subway web recycle original merge key depth popular broom snack gaze stumble"
        val birthday = "2311722"
        val datadir = MainApplication.getAppContext()!!.filesDir.path

        RustFFI.initfromseed(server, seed, birthday, datadir)

        var balance = RustFFI.execute("balance", "")
        System.out.println("Balance:")
        System.out.println(balance)

        var sync_info = RustFFI.execute("sync", "")
        System.out.println("Sync info:")
        System.out.println(sync_info)
        
        var sync_status = RustFFI.execute("syncstatus", "")
        System.out.println("Sync status:")
        System.out.println(sync_status)

        balance = RustFFI.execute("balance", "")
        System.out.println("Balance:")
        System.out.println(balance)
        
        RustFFI.execute("send", "utest16d8e0rz3g5nqem3kkz0hz4tv86m0yfvuzz6mapfvc4zsftq9t6req0grd5jnph7ftwftrhvdjkcly9spqrpa2rqx4strfcyuw8x4sxm9p5ww3xyl3s3dv9pyhsp3tqu0hnjuthc940cg5sf972wxx79pqzlv9mve66hkf9y559kk4ne9c5cecn22h4p4cnu06wfmkewz5xe9cjmdjga 10000")

        var send_prog = RustFFI.execute("sendprogress", "")
        System.out.println("Send progress after send:")
        System.out.println(send_prog)
        
        sync_info = RustFFI.execute("sync", "")
        System.out.println("Sync info:")
        System.out.println(sync_info)

        sync_status = RustFFI.execute("syncstatus", "")
        System.out.println("Sync status:")
        System.out.println(sync_status)

        balance = RustFFI.execute("balance", "")
        System.out.println("Balance:")
        System.out.println(balance)
        
        assertThat(balance).isEqualTo("")
    }
}
