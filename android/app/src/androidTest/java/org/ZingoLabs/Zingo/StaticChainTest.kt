package org.ZingoLabs.Zingo

/** Marks an instrumented test class that only reads a chain that exists before the test starts. */
@Retention(AnnotationRetention.RUNTIME)
@Target(AnnotationTarget.CLASS)
annotation class StaticChainTest
