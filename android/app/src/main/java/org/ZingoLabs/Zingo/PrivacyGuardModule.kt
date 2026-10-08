package org.ZingoLabs.Zingo

import android.content.ClipData
import android.content.ClipDescription
import android.content.ClipboardManager
import android.content.Context
import android.os.Build
import android.os.PersistableBundle
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil

/** Copies text to the clipboard flagged as sensitive, kept out of clipboard previews. */
class PrivacyGuardModule(private val reactContext: ReactApplicationContext) :
        ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "PrivacyGuard"

    @ReactMethod
    fun copySensitive(text: String, @Suppress("UNUSED_PARAMETER") seconds: Double, promise: Promise) {
        UiThreadUtil.runOnUiThread {
            val clipboard =
                    reactContext.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            val clip = ClipData.newPlainText("", text)
            clip.description.extras =
                    PersistableBundle().apply {
                        putBoolean(
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU)
                                        ClipDescription.EXTRA_IS_SENSITIVE
                                else "android.content.extra.IS_SENSITIVE",
                                true
                        )
                    }
            clipboard.setPrimaryClip(clip)
            promise.resolve(true)
        }
    }
}
