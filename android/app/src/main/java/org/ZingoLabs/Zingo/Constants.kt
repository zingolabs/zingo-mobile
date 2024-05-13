package org.ZingoLabs.Zingo

enum class Constants(val value: String) {
    // old wallet files backup - same content
    OldWalletDeletedFileName ("wallet.dat.old"),
    OldWalletDeletedBackupFileName("wallet.backup.dat.old"),

    // old wallet files - same content - we need to delete them
    OldWalletFileName ("wallet.dat"),
    OldWalletBackupFileName("wallet.backup.dat"),

    // NEW wallet files - same content - no changes in Android
    WalletFileName("wallet.decoded.dat"),
    WalletBackupFileName("wallet.backup.decoded.dat"),

    BackgroundFileName("background.json"),
    ErrorPrefix("error"),
}