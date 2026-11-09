package org.ZingoLabs.Zingo

import org.junit.Assert.assertThrows
import org.junit.Test

class ListenableFutureProviderTest {
    @Test
    fun listenableFutureLoadsWhenWorkManagerFuturesAreConsumed() {
        Class.forName("com.google.common.util.concurrent.ListenableFuture")
    }

    @Test
    fun theRestOfGuavaIsAbsentWhenOnlyListenableFutureIsNeeded() {
        assertThrows(ClassNotFoundException::class.java) {
            Class.forName("com.google.common.collect.ImmutableList")
        }
    }
}
