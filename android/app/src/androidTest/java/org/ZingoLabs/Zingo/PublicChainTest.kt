package org.ZingoLabs.Zingo

/** Marks an instrumented test class that reads a chain the project does not control, such as mainnet or testnet. */
@Retention(AnnotationRetention.RUNTIME)
@Target(AnnotationTarget.CLASS)
annotation class PublicChainTest
