package org.ZingoLabs.Zingo

enum class Constants(val value: String) {
    // wallet files
    WalletFileName("wallet.dat"),
    WalletBackupFileName("wallet.backup.dat"),
    // Marker file for Audit Issue P (b) — only present mid-swap during
    // the retained-wallet restore of older builds. Its existence at app
    // startup signals
    // an interrupted swap that must be completed. The retained wallet
    // itself is deleted at startup.
    WalletTempSwapFileName("wallet.swap.tmp"),

    BackgroundFileName("background.json"),
    ErrorPrefix("error"),
    SyncPrefix("sync task"),
}