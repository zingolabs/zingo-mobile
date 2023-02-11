package com.zingo

// import android.content.Context
import androidx.test.filters.SmallTest
import com.google.common.truth.Truth.assertThat
import org.junit.Test

@SmallTest
class RPCModule {
    private external fun execute(cmd: String, args: String): String

    @Test
    fun callAddress() {
        val resp = execute("address", "")
        assertThat(resp).isEqualTo(1)
    }
}

