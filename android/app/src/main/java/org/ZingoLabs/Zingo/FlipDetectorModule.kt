package org.ZingoLabs.Zingo

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class FlipDetectorModule(private val reactContext: ReactApplicationContext) :
        ReactContextBaseJavaModule(reactContext), SensorEventListener {

    private val sensors =
            reactContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private val accelerometer = sensors.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
    private var listening = false
    private var lastDown: Boolean? = null

    override fun getName(): String = "FlipDetector"

    @ReactMethod
    fun isAvailable(promise: Promise) {
        promise.resolve(accelerometer != null)
    }

    @ReactMethod
    fun start() {
        if (listening || accelerometer == null) {
            return
        }
        sensors.registerListener(this, accelerometer, SensorManager.SENSOR_DELAY_UI)
        listening = true
    }

    @ReactMethod
    fun stop() {
        if (!listening) {
            return
        }
        sensors.unregisterListener(this)
        listening = false
        lastDown = null
    }

    @ReactMethod
    fun addListener(@Suppress("UNUSED_PARAMETER") eventName: String) {}

    @ReactMethod
    fun removeListeners(@Suppress("UNUSED_PARAMETER") count: Double) {}

    override fun onSensorChanged(event: SensorEvent) {
        val down = event.values[2] < -SensorManager.GRAVITY_EARTH * 0.8f
        if (down == lastDown) {
            return
        }
        lastDown = down
        val sample = Arguments.createMap()
        sample.putBoolean("down", down)
        reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("faceDown", sample)
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    override fun invalidate() {
        stop()
        super.invalidate()
    }
}
