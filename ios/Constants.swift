//
//  Constants.swift
//  Zingo
//
//  Created by Juan Carlos Carmona Calvo on 7/17/24.
//

import Foundation

enum Constants: String {
    // wallet files
    case WalletFileName = "wallet.dat.txt"
    case WalletBackupFileName = "wallet.backup.dat.txt"
    // Marker file for Audit Issue P (b) — only present mid-swap during
    // restoreExistingWalletBackup. Its existence at app startup signals
    // an interrupted swap that must be completed.
    case WalletTempSwapFileName = "wallet.swap.tmp"

    case BackgroundFileName = "background.json"
    case ErrorPrefix = "error"
    case SyncPrefix = "sync task"
}
