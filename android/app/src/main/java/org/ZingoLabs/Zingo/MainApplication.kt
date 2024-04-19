package org.ZingoLabs.Zingo

import android.app.Application
import android.content.Context
import com.facebook.react.*
import com.facebook.soloader.SoLoader
import java.lang.ref.WeakReference


class MainApplication : Application(), ReactApplication {

    private val mReactNativeHost: ReactNativeHost = object : ReactNativeHost(this) {
        override fun getUseDeveloperSupport(): Boolean {
            return BuildConfig.DEBUG
        }

        override fun getPackages(): List<ReactPackage> {
            // Packages that cannot be autolinked yet can be added manually here, for example:
            // packages.add(new MyReactNativePackage());
            val packages: MutableList<ReactPackage> = PackageList(this).packages

            packages.add(RPCPackage())
            return packages
        }

        override fun getJSMainModuleName(): String {
            return "index"
        }
    }

    override fun getReactNativeHost(): ReactNativeHost {
        return mReactNativeHost
    }

    override fun onCreate() {
        super.onCreate()
        context = WeakReference(applicationContext)


        SoLoader.init(this, false)
    }

    companion object {
        private var context: WeakReference<Context>? = null
        fun getAppContext(): Context? {
            return context?.get()
        }

        init {
            System.loadLibrary("uniffi_zingo")
        }
    }
}

