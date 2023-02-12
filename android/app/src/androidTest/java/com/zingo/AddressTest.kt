package com.zingo

import androidx.test.filters.SmallTest
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import kotlin.concurrent.thread

@SmallTest
class RPCModule {
    private external fun execute(cmd: String, args: String): String

    @Test
    fun callAddress() {
        val resp = execute("addresses", "")
        assertThat(resp).isEqualTo(1)
    }
}

