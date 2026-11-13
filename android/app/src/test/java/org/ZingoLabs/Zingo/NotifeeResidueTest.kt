package org.ZingoLabs.Zingo

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class NotifeeResidueTest {
    private val events = mutableListOf<String>()

    private val hooks = NotifeeResidue.Hooks(
        deleteChannel = { events.add("channel:$it") },
        cancelWork = { events.add("work:$it") },
        deleteDatabase = { events.add("database:$it") },
    )

    @Test
    fun theChannelTheWorkAndTheDatabaseAreRemovedThenTheLedgerIsMarkedWhenNoPurgeIsRecorded() {
        val purged = NotifeeResidue.purgeOnce(purged = false, markPurged = { events.add("marked") }, hooks = hooks)
        assertTrue(purged)
        assertEquals(
            listOf(
                "channel:ironwood-migration",
                "work:app.notifee.core.NotificationManager.TRIGGER",
                "work:app.notifee.core.BlockStateBroadcastReceiver.WORKER",
                "database:notifee_core_database",
                "marked",
            ),
            events,
        )
    }

    @Test
    fun nothingIsTouchedWhenTheLedgerRecordsAnEarlierPurge() {
        val purged = NotifeeResidue.purgeOnce(purged = true, markPurged = { events.add("marked") }, hooks = hooks)
        assertFalse(purged)
        assertEquals(emptyList<String>(), events)
    }
}
