package com.zingo

import android.util.Base64
import java.io.InputStream

//test dependencies
import com.google.common.truth.Truth.assertThat
import org.junit.Test

class RPCModule {
    private external fun execute(cmd: String, args: String): String
    private external fun initfromseed(serveruri: String, seed: String, birthday: String, saplingOutputb64: String, saplingSpendb64: String, datadir: String): String

    @Test
    fun callAddress() {  
        val server = "https://mainnet.lightwalletd.com:9067"
        val seed = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art"
        val birthday = "1"
        val datadir = MainApplication.getAppContext()!!.getFilesDir().getPath()
        
        val saplingSpendFile: InputStream = MainApplication.getAppContext()?.resources?.openRawResource(R.raw.saplingspend)!!
        var saplingSpend = saplingSpendFile.readBytes()
        saplingSpendFile.close()

        val middle0 =        0
        val middle1 =  6000000 // 6_000_000 - 8 pieces
        val middle2 = 12000000
        val middle3 = 18000000
        val middle4 = 24000000
        val middle5 = 30000000
        val middle6 = 36000000
        val middle7 = 42000000
        val middle8: Int = saplingSpend.size
        var saplingSpendEncoded = StringBuilder(Base64.encodeToString(saplingSpend, middle0, middle1 - middle0, Base64.NO_WRAP))
        saplingSpendEncoded = saplingSpendEncoded.append(Base64.encodeToString(
            saplingSpend,
            middle1,
            middle2 - middle1,
            Base64.NO_WRAP
        ))
        saplingSpendEncoded = saplingSpendEncoded.append(Base64.encodeToString(
            saplingSpend,
            middle2,
            middle3 - middle2,
            Base64.NO_WRAP
        ))
        saplingSpendEncoded = saplingSpendEncoded.append(Base64.encodeToString(
            saplingSpend,
            middle3,
            middle4 - middle3,
            Base64.NO_WRAP
        ))
        saplingSpendEncoded = saplingSpendEncoded.append(Base64.encodeToString(
            saplingSpend,
            middle4,
            middle5 - middle4,
            Base64.NO_WRAP
        ))
        saplingSpendEncoded = saplingSpendEncoded.append(Base64.encodeToString(
            saplingSpend,
            middle5,
            middle6 - middle5,
            Base64.NO_WRAP
        ))
        saplingSpendEncoded = saplingSpendEncoded.append(Base64.encodeToString(
            saplingSpend,
            middle6,
            middle7 - middle6,
            Base64.NO_WRAP
        ))
        saplingSpendEncoded = saplingSpendEncoded.append(Base64.encodeToString(
            saplingSpend,
            middle7,
            middle8 - middle7,
            Base64.NO_WRAP
        ))

        saplingSpend = ByteArray(0)

        val saplingOutputFile: InputStream = MainApplication.getAppContext()?.resources?.openRawResource(R.raw.saplingoutput)!!
        var saplingOutput = saplingOutputFile.readBytes()
        saplingOutputFile.close()

        val saplingOutputEncoded = StringBuilder(Base64.encodeToString(saplingOutput, Base64.NO_WRAP))

        saplingOutput = ByteArray(0)

        val rseed = initfromseed(server, seed, birthday,
            saplingOutputEncoded.toString(),
            saplingSpendEncoded.toString(),
            datadir)
    
        val resp = execute("addresses", "")
        assertThat(resp).isEqualTo(1)
    }
}

