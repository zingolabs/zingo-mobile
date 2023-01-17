package com.zingo

import android.app.Application
import android.content.Context
import android.content.Intent
import android.util.Log
import android.view.View
import androidx.work.*
import com.facebook.react.*
import com.facebook.react.bridge.*
import com.facebook.react.jstasks.HeadlessJsTaskConfig
import com.facebook.react.uimanager.ReactShadowNode
import com.facebook.react.uimanager.ReactShadowNodeImpl
import com.facebook.react.uimanager.ViewManager
import com.facebook.soloader.SoLoader
import java.lang.reflect.InvocationTargetException
import java.util.*
import java.util.concurrent.TimeUnit
import javax.annotation.Nonnull
import kotlin.collections.ArrayList


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
            packages.add(BackgroundPackage())
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
                    val aClass = Class.forName("com.zingo.ReactNativeFlipper")
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

class BackgroundSync : HeadlessJsTaskService() {
    override fun getTaskConfig(intent: Intent): HeadlessJsTaskConfig? {
        return intent.extras?.let {
            HeadlessJsTaskConfig(
                    "BackgroundSync",
                    Arguments.fromBundle(it),
                    5000, // timeout for the task
                    false // optional: defines whether or not the task is allowed in foreground.
                    // Default is false
            )
        }
    }
}

class BackgroundWorker(private val context: Context, workerParams: WorkerParameters?) : Worker(context, workerParams!!) {
    override fun doWork(): Result {

        // background work will take place here
        Log.w("bg", "Worker do work")
        return Result.success()
    }
}

class BackgroundModule internal constructor(@Nonnull reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private val mContext: Context
    private val workRequest: PeriodicWorkRequest

    init {
        mContext = reactContext
        workRequest = PeriodicWorkRequest.Builder(BackgroundWorker::class.java, 20, TimeUnit.MINUTES).build()
    }

    @ReactMethod
    fun startBackgroundWork() {
        WorkManager.getInstance(mContext).enqueueUniquePeriodicWork("testWork", ExistingPeriodicWorkPolicy.KEEP, workRequest)
    }

    @ReactMethod
    fun stopBackgroundWork() {
        WorkManager.getInstance(mContext).cancelUniqueWork("testWork")
    }

    @Nonnull
    override fun getName(): String {
        return MODULE_NAME
    }

    companion object {
        private const val MODULE_NAME = "BackgroundWorkManager"
    }
}

class BackgroundPackage : ReactPackage {
    @Nonnull
    override fun createNativeModules(@Nonnull reactContext: ReactApplicationContext): List<NativeModule> {
        val modules: MutableList<NativeModule> = ArrayList()
        modules.add(BackgroundModule(reactContext))
        return modules
    }

    @Nonnull
    override fun createViewManagers(@Nonnull reactContext: ReactApplicationContext): List<ViewManager<View, ReactShadowNodeImpl>> {
        return Collections.emptyList()
    }
}

