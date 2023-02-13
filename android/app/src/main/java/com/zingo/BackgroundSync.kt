package org.ZingoLabs.Zingo

import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

 class BackgroundSync : HeadlessJsTaskService() {
    override fun getTaskConfig(intent: Intent): HeadlessJsTaskConfig? {
        return intent.extras?.let {
            HeadlessJsTaskConfig(
                "BackgroundSync",
                Arguments.fromBundle(it),
                0, // timeout for the task
                true // optional: defines whether or not the task is allowed in foreground.
                // Default is false
            )
        }
    }
}

