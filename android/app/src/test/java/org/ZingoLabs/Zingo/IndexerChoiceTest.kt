package org.ZingoLabs.Zingo

import org.junit.Assert.assertEquals
import org.junit.Test
import uniffi.zingo.IndexerChoice

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
