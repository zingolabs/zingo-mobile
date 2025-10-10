package org.ZingoLabs.Zingo

import android.annotation.SuppressLint
import android.app.Application
import android.content.Context
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactInstanceManager
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import java.lang.ref.WeakReference

class MainApplication : Application(), ReactApplication {

    override val reactNativeHost: ReactNativeHost =
        object : DefaultReactNativeHost(this) {
            override fun getPackages(): List<ReactPackage> =
                PackageList(this).packages.apply {
                    add(RPCPackage())
                }

            override fun getJSMainModuleName(): String = "index"

            override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

            override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
            override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
        }

    override val reactHost: ReactHost
        get() = getDefaultReactHost(applicationContext, reactNativeHost)

    override fun onCreate() {
        super.onCreate()
        context = WeakReference(applicationContext)
        loadReactNative(this)
    }

    companion object {
        private var context: WeakReference<Context>? = null

        fun getAppContext(): Context? {
            return context?.get()
        }

        @SuppressLint("VisibleForTests")
        fun getAppReactContext(): ReactApplicationContext? {
            val app = getAppContext() as? MainApplication ?: return null
            val reactInstanceManager: ReactInstanceManager = app.reactNativeHost.reactInstanceManager
            return reactInstanceManager.currentReactContext as? ReactApplicationContext
        }

        init {
            System.loadLibrary("uniffi_zingo")
        }
    }
}
