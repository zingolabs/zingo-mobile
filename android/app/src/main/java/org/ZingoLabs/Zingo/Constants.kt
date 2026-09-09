package org.ZingoLabs.Zingo

enum class Constants(val value: String) {
    // wallet files
    WalletFileName("wallet.dat"),
    WalletBackupFileName("wallet.backup.dat"),
    // Marker file for Audit Issue P (b) — only present mid-swap during
    // restoreExistingWalletBackup. Its existence at app startup signals
    // an interrupted swap that must be completed.
    WalletTempSwapFileName("wallet.swap.tmp"),

    BackgroundFileName("background.json"),
    ErrorPrefix("error"),
    SyncPrefix("sync task"),
}