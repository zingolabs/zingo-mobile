package org.ZingoLabs.Zingo

import org.junit.Assert.assertEquals
import org.junit.Test

class NotifeeResidueTest {
    @Test
    fun theMigrationChannelAndNotifeesWorkAreRemovedWhenAnUpgradedInstallStarts() {
        val channels = mutableListOf<String>()
        val tags = mutableListOf<String>()
        NotifeeResidue.purge({ channels.add(it) }, { tags.add(it) })
        assertEquals(listOf("ironwood-migration"), channels)
        assertEquals(
            listOf(
                "app.notifee.core.NotificationManager.TRIGGER",
                "app.notifee.core.BlockStateBroadcastReceiver.WORKER",
            ),
            tags,
        )
    }
}
