package org.ZingoLabs.Zingo

import org.junit.Assert.assertEquals
import org.junit.Test
import uniffi.zingo.IndexerChoice

/**
 * Tests that the bridge maps a server uri to Offline when the uri is empty
 * and to Named with that uri otherwise.
 */
class IndexerChoiceTest {
    @Test
    fun offlineWhenTheUriIsEmpty() {
        assertEquals(IndexerChoice.Offline, indexerChoice(""))
    }

    @Test
    fun namedWhenTheUriIsSet() {
        assertEquals(IndexerChoice.Named(uri = "https://zec.rocks:443"), indexerChoice("https://zec.rocks:443"))
    }
}
