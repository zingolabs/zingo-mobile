package org.ZingoLabs.Zingo

import android.app.Application
import android.content.Context
import android.content.Intent
import com.facebook.react.*
import com.facebook.react.bridge.*
import com.facebook.react.jstasks.HeadlessJsTaskConfig
import com.facebook.soloader.SoLoader
import java.lang.reflect.InvocationTargetException


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
        MainApplication.context = getApplicationContext()


        SoLoader.init(this, false)
        // initializeFlipper(this, reactNativeHost.reactInstanceManager)
    }



    companion object {
        /**
         * Loads Flipper in React Native templates. Call this in the onCreate method with something like
         * initializeFlipper(this, getReactNativeHost().getReactInstanceManager());
         *
         * @param context
         * @param reactInstanceManager
         */
        private fun initializeFlipper(
                context: Context, reactInstanceManager: ReactInstanceManager) {
            if (BuildConfig.DEBUG) {
                try { /*
                         We use reflection here to pick up the class that initializes Flipper,
                         since Flipper library is not available in release mode
                      */
                    val aClass = Class.forName("org.ZingoLabs.Zingo.ReactNativeFlipper")
                    aClass
                            .getMethod("initializeFlipper", Context::class.java, ReactInstanceManager::class.java)
                            .invoke(null, context, reactInstanceManager)
                } catch (e: ClassNotFoundException) {
                    e.printStackTrace()
                } catch (e: NoSuchMethodException) {
                    e.printStackTrace()
                } catch (e: IllegalAccessException) {
                    e.printStackTrace()
                } catch (e: InvocationTargetException) {
                    e.printStackTrace()
                }
            }
        }

        private var context: Context? = null
        fun getAppContext(): Context? {
            return context
        }

        init {
            System.loadLibrary("rust")
        }
    }
}

