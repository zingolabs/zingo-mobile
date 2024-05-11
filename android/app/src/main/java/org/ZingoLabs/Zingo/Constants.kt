package org.ZingoLabs.Zingo

enum class Constants(val value: String) {
    // old wallet files - same content - no changes in Android
    oldWalletFileName ("wallet.dat"),
    oldWalletBackupFileName("wallet.backup.dat"),

    // NEW wallet files - same content - no changes in Android
    walletFileName("wallet.decoded.dat"),
    walletBackupFileName("wallet.backup.decoded.dat"),

    backgroundFileName("background.json"),
    errorPrefix("error"),
}