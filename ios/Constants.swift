//
//  Constants.swift
//  ZingoMobile
//
//  Created by Juan Carlos Carmona Calvo on 5/13/24.
//

import Foundation

enum Constants: String {
    // old wallet files backup - same content
    case OldWalletDeletedFileName = "wallet.dat.old"
    case OldWalletDeletedBackupFileName = "wallet.backup.dat.old"

    // old wallet files - same content - we need to delete them
    case OldWalletFileName = "wallet.dat"
    case OldWalletBackupFileName = "wallet.backup.dat"

    // NEW wallet files - same content - no changes in Android
    case WalletFileName = "wallet.decoded.dat"
    case WalletBackupFileName = "wallet.backup.decoded.dat"

    case BackgroundFileName = "background.json"
    case ErrorPrefix = "error"
}
