package org.ZingoLabs.Zingo

/** Marks an instrumented test class that runs with an empty server URI and reads no chain. */
@Retention(AnnotationRetention.RUNTIME)
@Target(AnnotationTarget.CLASS)
annotation class OfflineDeviceTest
