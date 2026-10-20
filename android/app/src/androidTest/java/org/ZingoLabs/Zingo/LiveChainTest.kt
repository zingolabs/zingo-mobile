package org.ZingoLabs.Zingo

/** Marks an instrumented test class that broadcasts a transaction or needs a block mined while it runs. */
@Retention(AnnotationRetention.RUNTIME)
@Target(AnnotationTarget.CLASS)
annotation class LiveChainTest
