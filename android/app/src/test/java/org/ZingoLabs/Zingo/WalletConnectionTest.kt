package org.ZingoLabs.Zingo

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test
import uniffi.zingo.Chain
import uniffi.zingo.Connection
import uniffi.zingo.PerformanceLevel

class WalletConnectionTest {
    /** Tests that the connection is offline when the server URI is empty. */
    @Test
    fun emptyServerUriMeansOffline() {
        assertEquals(
            Connection(null, Chain.MAIN, null, PerformanceLevel.MEDIUM, 1u),
            walletConnection("", "main", "Medium", 1u),
        )
    }

    /** Tests that a regtest hint carries its activation schedule when the hint has a schedule suffix. */
    @Test
    fun regtestHintCarriesItsSchedule() {
        assertEquals(
            Connection("http://10.0.2.2:20000", Chain.REGTEST, "nu5=1:nu6=2", PerformanceLevel.HIGH, 3u),
            walletConnection("http://10.0.2.2:20000", "regtest:nu5=1:nu6=2", "High", 3u),
        )
    }

    /** Tests that a bare regtest hint has no schedule when the hint has no suffix. */
    @Test
    fun bareRegtestHintHasNoSchedule() {
        assertEquals(
            Connection("http://10.0.2.2:20000", Chain.REGTEST, null, PerformanceLevel.LOW, 1u),
            walletConnection("http://10.0.2.2:20000", "regtest", "low", 1u),
        )
    }

    /** Tests that an unknown chain name throws when the hint names no supported chain. */
    @Test
    fun unknownChainThrows() {
        assertThrows(IllegalArgumentException::class.java) {
            walletConnection("", "signet", "Medium", 1u)
        }
    }
}
