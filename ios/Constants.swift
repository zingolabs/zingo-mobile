//
//  Constants.swift
//  ZingoMobile
//
//  Created by Juan Carlos Carmona Calvo on 5/13/24.
//

import Foundation

enum Constants: String {
    // old wallet files backup - same content
    case OldWalletDeletedFileName = "wallet.dat.txt.old"
    case OldWalletDeletedBackupFileName = "wallet.backup.dat.txt.old"

    // old wallet files - same content - we need to delete them
    case OldWalletFileName = "wallet.dat.txt"
    case OldWalletBackupFileName = "wallet.backup.dat.txt"

    // NEW wallet files - same content - no changes in Android
    case WalletFileName = "wallet.decoded.dat.txt"
    case WalletBackupFileName = "wallet.backup.decoded.dat.txt"

    case BackgroundFileName = "background.json"
    case ErrorPrefix = "error"
}
