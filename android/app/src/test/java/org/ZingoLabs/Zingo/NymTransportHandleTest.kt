package org.ZingoLabs.Zingo

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * The handle-identity contract for proxy death reports (zingo-mobile#1227):
 * a death may clear only the handle it was observed for. Without identity,
 * a dying predecessor's late report wipes a fresh replacement, leaving the
 * replacement orphaned with its port bound and stop a no-op.
 */
class NymTransportHandleTest {
    @Test
    fun aDeathReportClearsTheHandleItWatched() {
        val proxy = Any()
        assertEquals(
            HandleDeathVerdict.ClearStored,
            verdictOnDeath(stored = proxy, watched = proxy),
        )
    }

    @Test
    fun aLateDeathOfAReplacedProxyRetainsTheReplacement() {
        val predecessor = Any()
        val replacement = Any()
        assertEquals(
            HandleDeathVerdict.RetainStored,
            verdictOnDeath(stored = replacement, watched = predecessor),
        )
    }

    @Test
    fun aDeathWithNothingStoredRetainsNothing() {
        assertEquals(
            HandleDeathVerdict.RetainStored,
            verdictOnDeath(stored = null, watched = Any()),
        )
    }

    @Test
    fun anObserverThatNeverSawItsStartRetains() {
        assertEquals(
            HandleDeathVerdict.RetainStored,
            verdictOnDeath(stored = Any(), watched = null),
        )
    }
}
