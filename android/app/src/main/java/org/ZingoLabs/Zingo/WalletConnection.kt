package org.ZingoLabs.Zingo

import uniffi.zingo.Chain
import uniffi.zingo.Connection
import uniffi.zingo.PerformanceLevel

/** Builds a Connection from the bridge's string arguments, where an empty server URI means offline and "regtest:<schedule>" carries the activation schedule. */
fun walletConnection(serverUri: String, chain: String, performanceLevel: String, minConfirmations: UInt): Connection {
    val parts = chain.split(":", limit = 2)
    return Connection(
        serverUri = serverUri.ifEmpty { null },
        chain = when (parts[0]) {
            "main" -> Chain.MAIN
            "test" -> Chain.TEST
            "regtest" -> Chain.REGTEST
            else -> throw IllegalArgumentException("unknown chain \"$chain\"")
        },
        regtestSchedule = parts.getOrNull(1),
        performance = PerformanceLevel.valueOf(performanceLevel.uppercase()),
        minConfirmations = minConfirmations,
    )
}
