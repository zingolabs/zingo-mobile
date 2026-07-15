//
//  RPCModule.swift
//  Zingo
//
//  Created by Juan Carlos Carmona Calvo on 4/2/24.
//

import Foundation
import React

/// A pure base64 well-formedness check — no I/O, no logging, no platform
/// dependencies — so it runs under plain XCTest unit tests.
///
/// The FFI no longer returns base64 (the save path crosses as bytes, so a
/// malformed export is unrepresentable). This guard's one remaining role is
/// validating wallet-file content read back from disk before
/// `restoreExistingWalletBackup` swaps it into place.
enum WalletExport {
  static func isValidBase64(_ s: String) -> Bool {
    let bytes = s.utf8
    if bytes.isEmpty || bytes.count % 4 != 0 { return false }
    var padCount = 0
    for b in bytes {
      if b == 0x3D { // '='
        padCount += 1
        if padCount > 2 { return false }
      } else if padCount > 0 {
        return false
      } else if !((0x41...0x5A).contains(b) ||  // 'A'-'Z'
                  (0x61...0x7A).contains(b) ||  // 'a'-'z'
                  (0x30...0x39).contains(b) ||  // '0'-'9'
                  b == 0x2B || b == 0x2F) {     // '+', '/'
        return false
      }
    }
    return true
  }
}

/// The outcome of an FFI call, classified by channel alone
/// (zingo-mobile#1151): the value a call returns is resolved verbatim —
/// never inspected for an error sentinel — and a thrown error is rejected
/// under the FFI's name. Classification (`of`) is pure — no I/O, no
/// logging, no platform dependencies — so it runs under plain XCTest unit
/// tests. Settling touches only the promise blocks.
enum FfiOutcome {
  case resolved(String)
  case rejected(code: String, error: Error)

  static func of(_ code: String, _ call: () throws -> String) -> FfiOutcome {
    do {
      return .resolved(try call())
    } catch {
      return .rejected(code: code, error: error)
    }
  }

  func settle(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    switch self {
    case .resolved(let value):
      DispatchQueue.main.async {
        resolve(value)
      }
    case .rejected(let code, let error):
      NSLog("Error: [Native] \(code). \(String(describing: error))")
      DispatchQueue.main.async {
        reject(code, String(describing: error), error)
      }
    }
  }
}

@objc(RPCModule)
class RPCModule: NSObject {
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
      return true
  }
  
  enum FileError: Error {
    case documentsDirectoryNotFoundError(String)
    case readWalletError(String)
    case saveFileError(String)
    case writeFileError(String)
    case deleteFileError(String)
  }
  
  func getDocumentsDirectory() throws -> String {
    let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
    guard let pathsFirst = paths.first else {
      throw FileError.documentsDirectoryNotFoundError("Error: [Native] Documents directory could not be located.")
    }
    return pathsFirst
  }
  
  func getFileName(_ file: String) throws -> String {
    let documentsDirectory = try getDocumentsDirectory()
    let fileName = "\(documentsDirectory)/\(file)"
    return fileName
  }
  
  func fileExists(_ fileName: String) throws -> String {
    let fileExists = try FileManager.default.fileExists(atPath: getFileName(fileName))
    if fileExists {
      NSLog("[Native] File exists \(fileName)")
      return "true"
    } else {
      NSLog("[Native] File DOES not exists \(fileName)")
      return "false"
    }
  }
  
  func readFile(_ fileName: String) throws -> String {
    return try String(contentsOfFile: getFileName(fileName), encoding: .utf8)
  }

  // Audit Issue N — wallet files at rest. We write with the `complete`
  // file-protection class and exclude the file from iCloud / device
  // backups. The per-file encryption key is derived from the user's
  // passcode and held in the Secure Enclave (the same hardware that
  // backs Keychain Services), so the file is unreadable while the
  // device is locked and cannot be lifted from a backup. This is the
  // iOS counterpart to Android's Jetpack Security `EncryptedFile`
  // envelope used in `RPCModule.kt`: different mechanism, equivalent
  // guarantee. The audit's recommendation ("encrypted with a key
  // stored in the device's keychain") is satisfied because the Secure
  // Enclave IS keychain-tier custody.
  //
  // `saveBackgroundFile` deliberately does NOT route through this
  // helper — see its own comment for the BGAppRefreshTask rationale.
  func writeFile(_ fileName: String, fileBase64EncodedString: String) throws {
    let filePath = try getFileName(fileName)
    try fileBase64EncodedString.write(toFile: filePath, atomically: true, encoding: .utf8)
    var fileURL = URL(fileURLWithPath: filePath)
    var resourceValues = URLResourceValues()
    resourceValues.isExcludedFromBackup = true
    try? fileURL.setResourceValues(resourceValues)
    try? FileManager.default.setAttributes(
      [.protectionKey: FileProtectionType.complete],
      ofItemAtPath: filePath
    )
  }

  func deleteFile(_ fileName: String) throws {
    try FileManager.default.removeItem(atPath: getFileName(fileName))
  }

  // Audit Issue P (b) — wallet ↔ backup swap recovery.
  //
  // `restoreExistingWalletBackup` does its swap as three atomic renames:
  //   (1) main → temp
  //   (2) backup → main
  //   (3) temp → backup
  // A crash between (1)–(2) or (2)–(3) leaves the temp file on disk.
  // Calling this helper at startup detects that and finishes the swap.
  //
  // Possible interrupted states (temp exists, by construction):
  //   between (1)–(2): main does NOT exist, backup exists → complete (2) then (3)
  //   between (2)–(3): main exists,         backup does NOT → complete (3)
  // Both branches end at the intended final state. Idempotent — when no
  // temp file is present this is a near-zero-cost no-op.
  func completePendingSwap() {
    let fm = FileManager.default
    guard let tempPath = try? getFileName(Constants.WalletTempSwapFileName.rawValue),
          fm.fileExists(atPath: tempPath) else { return }
    guard let mainPath = try? getFileName(Constants.WalletFileName.rawValue),
          let backupPath = try? getFileName(Constants.WalletBackupFileName.rawValue) else {
      NSLog("Error: [Native] completePendingSwap: could not resolve wallet paths")
      return
    }
    do {
      if fm.fileExists(atPath: backupPath) {
        // Crash between (1) and (2): backup still in original position.
        try fm.moveItem(atPath: backupPath, toPath: mainPath)
      }
      // Crash between (2) and (3): main now holds the former backup;
      // only (3) is left.
      try fm.moveItem(atPath: tempPath, toPath: backupPath)
      NSLog("[Native] completePendingSwap: interrupted swap recovered")
    } catch {
      NSLog("Error: [Native] completePendingSwap failed: \(error.localizedDescription)")
    }
  }
  
  @objc(walletExists:reject:)
  func walletExists(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    completePendingSwap()
    do {
      let result = try fileExists(Constants.WalletFileName.rawValue)
      DispatchQueue.main.async {
        resolve(result)
      }
    } catch {
      NSLog("Error: [Native] wallet exists error: \(error.localizedDescription)")
      DispatchQueue.main.async {
        resolve("false")
      }
    }
  }

  @objc(walletBackupExists:reject:)
  func walletBackupExists(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    completePendingSwap()
    do {
      let result = try fileExists(Constants.WalletBackupFileName.rawValue)
      DispatchQueue.main.async {
        resolve(result)
      }
    } catch {
      NSLog("Error: [Native] wallet backup exists error: \(error.localizedDescription)")
      DispatchQueue.main.async {
        resolve("false")
      }
    }
  }

  func saveWalletFile(_ base64EncodedString: String) throws {
    do {
      try writeFile(Constants.WalletFileName.rawValue, fileBase64EncodedString: base64EncodedString)
    } catch {
      throw FileError.writeFileError("Error: [Native] writting wallet file error: \(error.localizedDescription)")
    }
  }
  
  func saveWalletBackupFile(_ base64EncodedString: String) throws {
    do {
      try writeFile(Constants.WalletBackupFileName.rawValue, fileBase64EncodedString: base64EncodedString)
    } catch {
      throw FileError.writeFileError("Error: [Native] writting wallet backup file error: \(error.localizedDescription)")
    }
  }

  // The background sync state is written from BGAppRefreshTask paths in
  // AppDelegate while the device may be locked. The wallet `writeFile`
  // helper sets `FileProtectionType.complete`, which would make the
  // file inaccessible in that locked state and break background sync.
  // So this path stays at the iOS default protection class
  // (`completeUntilFirstUserAuthentication` since iOS 7): still
  // encrypted at rest, key available after the first post-boot unlock,
  // accessible to background tasks afterwards. The sync metadata
  // stored here is not wallet-recovery material.
  func saveBackgroundFile(_ jsonString: String) throws {
    do {
      // the content of this JSON can be represented safely in utf8.
      try jsonString.write(toFile: getFileName(Constants.BackgroundFileName.rawValue), atomically: true, encoding: .utf8)
    } catch {
      throw FileError.writeFileError("Error: [Native] writting background file error: \(error.localizedDescription)")
    }
  }

  func readWalletUtf8String() throws -> String {
    do {
      return try readFile(Constants.WalletFileName.rawValue)
    } catch {
      throw FileError.readWalletError("Error: [Native] reading wallet format error: \(error.localizedDescription)")
    }
  }

  func readWalletBackup() throws -> String {
    do {
      return try readFile(Constants.WalletBackupFileName.rawValue)
    } catch {
      throw FileError.readWalletError("Error: [Native] reading wallet backup format error: \(error.localizedDescription)")
    }
  }

  func fnDeleteExistingWallet() throws {
    do {
      try deleteFile(Constants.WalletFileName.rawValue)
    } catch {
      throw FileError.deleteFileError("Error: [Native] deleting wallet error: \(error.localizedDescription)")
    }
  }

  @objc(deleteExistingWallet:reject:)
  func deleteExistingWallet(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      if try fileExists(Constants.WalletFileName.rawValue) == "true" {
        try self.fnDeleteExistingWallet()
        DispatchQueue.main.async {
          resolve("true")
        }
      } else {
        DispatchQueue.main.async {
          resolve("false")
        }
      }
    } catch {
      NSLog("Error: [Native] deleting wallet \(error.localizedDescription)")
      DispatchQueue.main.async {
        resolve("false")
      }
    }
  }
  
  func fnDeleteExistingWalletBackup() throws {
    do {
      try deleteFile(Constants.WalletBackupFileName.rawValue)
    } catch {
      throw FileError.deleteFileError("Error: [Native] deleting wallet backup error: \(error.localizedDescription)")
    }
  }

  @objc(deleteExistingWalletBackup:reject:)
  func deleteExistingWalletBackup(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      if try fileExists(Constants.WalletBackupFileName.rawValue) == "true" {
        try self.fnDeleteExistingWalletBackup()
        DispatchQueue.main.async {
          resolve("true")
        }
      } else {
        DispatchQueue.main.async {
          resolve("false")
        }
      }
    } catch {
      NSLog("Error: [Native] deleting wallet backup\(error.localizedDescription)")
      DispatchQueue.main.async {
        resolve("false")
      }
    }
  }

  // The FFI contract is structural (zingo-mobile#1151; audit Issue Q):
  // nil means no save was needed, bytes are the wallet export, and failure
  // throws. Nothing here classifies content — a malformed export is
  // unrepresentable, so no validator exists to disagree with the file
  // format, which stays base64 and is encoded only at this write site.
  func saveWalletInternal() throws {
    // Each failure is logged and wrapped exactly once. FileError does not
    // conform to LocalizedError, so re-catching our own throw would replace
    // the message with the generic localizedDescription.
    func saveFailure(_ detail: String) -> FileError {
      let err = "Error: [Native] Couldn't save the wallet. \(detail)"
      NSLog(err)
      return FileError.saveFileError(err)
    }

    let walletBytes: Data?
    do {
      walletBytes = try saveWalletBytes()
    } catch {
      throw saveFailure(String(describing: error))
    }

    guard let walletBytes = walletBytes else {
      NSLog("[Native] No need to save the wallet.")
      return
    }

    NSLog("[Native] file size: \(walletBytes.count) bytes")
    do {
      try self.saveWalletFile(walletBytes.base64EncodedString())
    } catch {
      throw saveFailure(error.localizedDescription)
    }
  }

  func saveWalletBackupInternal() throws {
    let walletString = try readWalletUtf8String()
    try self.saveWalletBackupFile(walletString)
  }

  func fnCreateNewWallet(
    serveruri: String, 
    chainhint: String, 
    performancelevel: String, 
    minconfirmations: String
  ) throws -> String {
    // initNew throws on failure, so reaching the save implies the wallet exists.
    let seed = try initNew(serveruri: serveruri, chainhint: chainhint, performancelevel: performancelevel, minconfirmations: UInt32(minconfirmations) ?? 0)
    let seedStr = String(seed)
    try self.saveWalletInternal()
    return seedStr
  }

  @objc(createNewWallet:chainhint:performancelevel:minconfirmations:resolve:reject:)
  func createNewWallet(
    _ serveruri: String, 
    chainhint: String, 
    performancelevel: String, 
    minconfirmations: String, 
    resolve: @escaping RCTPromiseResolveBlock, 
    reject: @escaping RCTPromiseRejectBlock
  ) {
    FfiOutcome.of("init_new") {
      try self.fnCreateNewWallet(serveruri: serveruri, chainhint: chainhint, performancelevel: performancelevel, minconfirmations: minconfirmations)
    }.settle(resolve: resolve, reject: reject)
  }
  
  func fnRestoreWalletFromSeed(
    restoreSeed: String, 
    birthday: String, 
    serveruri: String, 
    chainhint: String, 
    performancelevel: String, 
    minconfirmations: String
  ) throws -> String {
    // initFromSeed throws on failure, so reaching the save implies the wallet exists.
    let seed = try initFromSeed(seed: restoreSeed, birthday: UInt32(birthday) ?? 0, serveruri: serveruri, chainhint: chainhint, performancelevel: performancelevel, minconfirmations: UInt32(minconfirmations) ?? 0)
    let seedStr = String(seed)
    try self.saveWalletInternal()
    return seedStr
  }

  @objc(restoreWalletFromSeed:birthday:serveruri:chainhint:performancelevel:minconfirmations:resolve:reject:)
  func restoreWalletFromSeed(
    _ restoreSeed: String, 
    birthday: String, 
    serveruri: String, 
    chainhint: String, 
    performancelevel: String,
    minconfirmations: String,
    resolve: @escaping RCTPromiseResolveBlock, 
    reject: @escaping RCTPromiseRejectBlock
  ) {
    FfiOutcome.of("init_from_seed") {
      try self.fnRestoreWalletFromSeed(restoreSeed: restoreSeed, birthday: birthday, serveruri: serveruri, chainhint: chainhint, performancelevel: performancelevel, minconfirmations: minconfirmations)
    }.settle(resolve: resolve, reject: reject)
  }
  
  func fnRestoreWalletFromUfvk(
    restoreUfvk: String, 
    birthday: String,
    serveruri: String, 
    chainhint: String, 
    performancelevel: String, 
    minconfirmations: String
  ) throws -> String {
    // initFromUfvk throws on failure, so reaching the save implies the wallet exists.
    let ufvk = try initFromUfvk(ufvk: restoreUfvk, birthday: UInt32(birthday) ?? 0, serveruri: serveruri, chainhint: chainhint, performancelevel: performancelevel, minconfirmations: UInt32(minconfirmations) ?? 0)
    let ufvkStr = String(ufvk)
    try self.saveWalletInternal()
    return ufvkStr
  }

  @objc(restoreWalletFromUfvk:birthday:serveruri:chainhint:performancelevel:minconfirmations:resolve:reject:)
  func restoreWalletFromUfvk(
    _ restoreUfvk: String, 
    birthday: String, 
    serveruri: String, 
    chainhint: String, 
    performancelevel: String,
    minconfirmations: String,
    resolve: @escaping RCTPromiseResolveBlock, 
    reject: @escaping RCTPromiseRejectBlock
  ) {
    FfiOutcome.of("init_from_ufvk") {
      try self.fnRestoreWalletFromUfvk(restoreUfvk: restoreUfvk, birthday: birthday, serveruri: serveruri, chainhint: chainhint, performancelevel: performancelevel, minconfirmations: minconfirmations)
    }.settle(resolve: resolve, reject: reject)
  }

  func fnLoadExistingWallet(
    serveruri: String, 
    chainhint: String,
    performancelevel: String, 
    minconfirmations: String
  ) throws -> String {
    let seed = try initFromB64(datab64: try self.readWalletUtf8String(), serveruri: serveruri, chainhint: chainhint, performancelevel: performancelevel, minconfirmations: UInt32(minconfirmations) ?? 0)
    let seedStr = String(seed)
    return seedStr
  }

  @objc(loadExistingWallet:chainhint:performancelevel:minconfirmations:resolve:reject:)
  func loadExistingWallet(
    _ serveruri: String, 
    chainhint: String, 
    performancelevel: String, 
    minconfirmations: String,
    resolve: @escaping RCTPromiseResolveBlock, 
    reject: @escaping RCTPromiseRejectBlock
  ) {
    FfiOutcome.of("init_from_b64") {
      try self.fnLoadExistingWallet(serveruri: serveruri, chainhint: chainhint, performancelevel: performancelevel, minconfirmations: minconfirmations)
    }.settle(resolve: resolve, reject: reject)
  }

  @objc(restoreExistingWalletBackup:reject:)
  func restoreExistingWalletBackup(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      let backupEncodedData = try self.readWalletBackup()
      // check if the content is correct. Stored Encoded.
      if WalletExport.isValidBase64(backupEncodedData) {
        if try fileExists(Constants.WalletFileName.rawValue) == "true" {
          // Audit Issue P (b) — atomic swap via three renames. APFS
          // rename is atomic AND preserves the file's protection class
          // and isExcludedFromBackup attribute, so this is strictly
          // safer than the previous read-into-memory + two writes
          // pattern, which lost the original main wallet on a crash
          // between writes. `completePendingSwap` (called early on
          // walletExists/walletBackupExists) finishes the swap if a
          // crash interrupts these three steps.
          // Belt-and-braces: if a previous swap left a temp behind and
          // `completePendingSwap` was never called (e.g. JS jumped
          // straight into restore without checking walletExists first),
          // recover it before starting a new swap — deleting the temp
          // would lose the orphaned original-main content.
          self.completePendingSwap()
          let fm = FileManager.default
          let mainPath   = try getFileName(Constants.WalletFileName.rawValue)
          let backupPath = try getFileName(Constants.WalletBackupFileName.rawValue)
          let tempPath   = try getFileName(Constants.WalletTempSwapFileName.rawValue)
          try fm.moveItem(atPath: mainPath,   toPath: tempPath)   // (1) main → temp
          try fm.moveItem(atPath: backupPath, toPath: mainPath)   // (2) backup → main
          try fm.moveItem(atPath: tempPath,   toPath: backupPath) // (3) temp → backup
        } else {
          // No wallet exists: restore backup as wallet and delete backup
          try self.saveWalletFile(backupEncodedData)
          try self.deleteFile(Constants.WalletBackupFileName.rawValue)
        }
        DispatchQueue.main.async {
          resolve("true")
        }
      } else {
        // Audit Issue A — redact the payload. Mirrors the saveExistingWallet
        // path at L240: log only the size, never the encoded wallet bytes.
        NSLog("Error: [Native] Couldn't save the wallet backup. The Encoded content is incorrect. Size: \(backupEncodedData.count)")
        DispatchQueue.main.async {
          resolve("false")
        }
      }
    } catch {
      NSLog("Error: [Native] Restoring existing wallet backup error: \(error.localizedDescription)")
      DispatchQueue.main.async {
        resolve("false")
      }
    }
  }

  func fnDoSave(_ dict: [AnyHashable: Any]) {
    if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
      do {
        try self.saveWalletInternal()
        DispatchQueue.main.async {
          resolve("true")
        }
      } catch {
        NSLog("Error: [Native] Saving wallet error: \(error.localizedDescription)")
        DispatchQueue.main.async {
          resolve("false")
        }
      }
    } else {
      let err = "Error: [Native] Save wallet. Argument problem."
      NSLog(err)
    }
  }

  @objc(doSave:reject:)
  func doSave(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    let dict: [String: Any] = ["resolve": resolve]
    DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
            self.fnDoSave(dict)
        }
    }
  }

  func fndoSaveBackup(_ dict: [AnyHashable: Any]) {
    if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
      do {
        try self.saveWalletBackupInternal()
        DispatchQueue.main.async {
          resolve("true")
        }
      } catch {
        NSLog("Error: [Native] Saving wallet backup error: \(error.localizedDescription)")
        DispatchQueue.main.async {
          resolve("false")
        }
      }
    } else {
      let err = "Error: [Native] Save wallet backup. Argument problem."
      NSLog(err)
    }
  }

  @objc(doSaveBackup:reject:)
  func doSaveBackup(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    let dict: [String: Any] = ["resolve": resolve]
    DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
            self.fndoSaveBackup(dict)
        }
    }
  }

  func fnGetLatestBlockServerInfo(_ dict: [AnyHashable: Any]) {
    if let serveruri = dict["serveruri"] as? String,
       let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
      do {
        let resp = try getLatestBlockServer(serveruri: serveruri)
        let respStr = String(resp)
        DispatchQueue.main.async {
          resolve(respStr)
        }
      } catch {
        let err = "Error: [Native] Get server latest block. \(error.localizedDescription)"
        NSLog(err)
        DispatchQueue.main.async {
          resolve(err)
        }
      }
    } else {
      let err = "Error: [Native] Get server latest block. Argument problem."
      NSLog(err)
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          DispatchQueue.main.async {
            resolve(err)
          }
      }
    }
  }
  
  @objc(getLatestBlockServerInfo:resolve:reject:)
  func getLatestBlockServerInfo(_ serveruri: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["serveruri": serveruri, "resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
          if let self = self {
              self.fnGetLatestBlockServerInfo(dict)
          }
      }
  }

  func fnGetLatestBlockWalletInfo(_ dict: [AnyHashable: Any]) {
    if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try getLatestBlockWallet()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] Get wallet latest block. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
    } else {
      let err = "Error: [Native] Get wallet latest block. Argument problem."
      NSLog(err)
    }
  }
  
  @objc(getLatestBlockWalletInfo:reject:)
  func getLatestBlockWalletInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
          if let self = self {
              self.fnGetLatestBlockWalletInfo(dict)
          }
      }
  }

  func fnGetDonationAddress(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try getDeveloperDonationAddress()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] Get developer donation address. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
        let err = "Error: [Native] Get developer donation address. Command arguments problem."
        NSLog(err)
      }
  }
  
  @objc(getDonationAddress:reject:)
  func getDonationAddress(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
          if let self = self {
              self.fnGetDonationAddress(dict)
          }
      }
  }

  func fnGetZenniesDonationAddress(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try getZenniesForZingoDonationAddress()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] Get zennies donation address. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
        let err = "Error: [Native] Get zennies donation address. Command arguments problem."
        NSLog(err)
      }
  }
  
  @objc(getZenniesDonationAddress:reject:)
  func getZenniesDonationAddress(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
          if let self = self {
              self.fnGetZenniesDonationAddress(dict)
          }
      }
  }

  func fnGetValueTransfersList(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          do {
            let resp = try getValueTransfers()
            let respStr = String(resp)
            DispatchQueue.main.async {
              resolve(respStr)
            }
          } catch {
            let err = "Error: [Native] Get value transfers. \(error.localizedDescription)"
            NSLog(err)
            DispatchQueue.main.async {
              resolve(err)
            }          
          }
      } else {
          let err = "Error: [Native] Get value transfers. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(getValueTransfersList:reject:)
  func getValueTransfersList(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
          if let self = self {
              self.fnGetValueTransfersList(dict)
          }
      }
  }

  func fnSetCryptoDefaultProvider(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try setCryptoDefaultProviderToRing()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] Setting the crypto provider to ring by default. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] Setting the crypto provider to ring by default. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(setCryptoDefaultProvider:reject:)
  func setCryptoDefaultProvider(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnSetCryptoDefaultProvider(dict)
        }
      }
  }

  @objc(pollSyncInfo:reject:)
  func pollSyncInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of("poll_sync") {
          try pollSync()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(runSyncProcess:reject:)
  func runSyncProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        // Persistence is owned by JS (SyncCoordinator → doSave when
        // getWalletSaveRequired returns true). Auto-saving here was
        // racing against that doSave on the same wallet.dat — two
        // background queues writing in parallel. Single source of truth
        // for save decisions = JS, matching the Android side.
        FfiOutcome.of("run_sync") {
          try runSync()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(pauseSyncProcess:reject:)
  func pauseSyncProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of("pause_sync") {
          try pauseSync()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(statusSyncInfo:reject:)
  func statusSyncInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of("status_sync") {
          try statusSync()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(runRescanProcess:reject:)
  func runRescanProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of("run_rescan") {
          try runRescan()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  func fnInfoServerInfo(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          do {
            let resp = try infoServer()
            let respStr = String(resp)
            DispatchQueue.main.async {
              resolve(respStr)
            }
          } catch {
            let err = "Error: [Native] info server. \(error.localizedDescription)"
            NSLog(err)
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      } else {
          let err = "Error: [Native] info server. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(infoServerInfo:reject:)
  func infoServerInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnInfoServerInfo(dict)
        }
      }
  }

  func fnGetSeedInfo(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try getSeed()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] seed. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] seed. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(getSeedInfo:reject:)
  func getSeedInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnGetSeedInfo(dict)
        }
      }
  }

  func fnGetUfvkInfo(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try getUfvk()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] ufvk. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] ufvk. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(getUfvkInfo:reject:)
  func getUfvkInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnGetUfvkInfo(dict)
        }
      }
  }

  func fnChangeServerProcess(_ dict: [AnyHashable: Any]) {
      if let serveruri = dict["serveruri"] as? String,
          let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try changeServer(serveruri: serveruri)
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] change server. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] change server. Command arguments problem."
          NSLog(err)
          if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      }
  }

  @objc(changeServerProcess:resolve:reject:)
  func changeServerProcess(_ serveruri: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["serveruri": serveruri, "resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnChangeServerProcess(dict)
        }
      }
  }

  func fnWalletKindInfo(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try walletKind()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] wallet kind. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] wallet kind. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(walletKindInfo:reject:)
  func walletKindInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnWalletKindInfo(dict)
        }
      }
  }

  func fnParseAddressInfo(_ dict: [AnyHashable: Any]) {
      if let address = dict["address"] as? String,
          let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try parseAddress(address: address)
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] parse address. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] parse address. Command arguments problem."
          NSLog(err)
          if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      }
  }

  @objc(parseAddressInfo:resolve:reject:)
  func parseAddressInfo(_ address: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["address": address, "resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnParseAddressInfo(dict)
        }
      }
  }

  func fnParseUfvkInfo(_ dict: [AnyHashable: Any]) {
      if let ufvk = dict["ufvk"] as? String,
          let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try parseUfvk(ufvk: ufvk)
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] parse ufvk. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] parse ufvk. Command arguments problem."
          NSLog(err)
          if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      }
  }

  @objc(parseUfvkInfo:resolve:reject:)
  func parseUfvkInfo(_ ufvk: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["ufvk": ufvk, "resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnParseUfvkInfo(dict)
        }
      }
  }

  func fnGetVersionInfo(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          do {
            let resp = try getVersion()
            let respStr = String(resp)
            DispatchQueue.main.async {
              resolve(respStr)
            }
          } catch {
            let err = "Error: [Native] version. \(error.localizedDescription)"
            NSLog(err)
            DispatchQueue.main.async {
              resolve(err)
            }          
          }
      } else {
          let err = "Error: [Native] version. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(getVersionInfo:reject:)
  func getVersionInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnGetVersionInfo(dict)
        }
      }
  }

  func fnGetMessagesInfo(_ dict: [AnyHashable: Any]) {
      if let address = dict["address"] as? String,
          let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          do {
            let resp = try getMessages(address: address)
            let respStr = String(resp)
            DispatchQueue.main.async {
              resolve(respStr)
            }
          } catch {
            let err = "Error: [Native] messages. \(error.localizedDescription)"
            NSLog(err)
            DispatchQueue.main.async {
              resolve(err)
            }          
          }
      } else {
          let err = "Error: [Native] messages. Command arguments problem."
          NSLog(err)
          if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      }
  }

  @objc(getMessagesInfo:resolve:reject:)
  func getMessagesInfo(_ address: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["address": address, "resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnGetMessagesInfo(dict)
        }
      }
  }

func fnGetBalanceInfo(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          do {
            let resp = try getBalance()
            let respStr = String(resp)
            DispatchQueue.main.async {
              resolve(respStr)
            }
          } catch {
            let err = "Error: [Native] balance. \(error.localizedDescription)"
            NSLog(err)
            DispatchQueue.main.async {
              resolve(err)
            }          
          }
      } else {
          let err = "Error: [Native] balance. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(getBalanceInfo:reject:)
  func getBalanceInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnGetBalanceInfo(dict)
        }
      }
  }

  func fnGetTotalMemobytesToAddressInfo(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try getTotalMemobytesToAddress()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] memobytes to address. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] memobytes to address. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(getTotalMemobytesToAddressInfo:reject:)
  func getTotalMemobytesToAddressInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnGetTotalMemobytesToAddressInfo(dict)
        }
      }
  }

  func fnGetTotalValueToAddressInfo(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try getTotalValueToAddress()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] value to address. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] value to address. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(getTotalValueToAddressInfo:reject:)
  func getTotalValueToAddressInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnGetTotalValueToAddressInfo(dict)
        }
      }
  }

  func fnGetTotalSpendsToAddressInfo(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try getTotalSpendsToAddress()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] spends to address. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] spends to address. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(getTotalSpendsToAddressInfo:reject:)
  func getTotalSpendsToAddressInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnGetTotalSpendsToAddressInfo(dict)
        }
      }
  }

  func fnZecPriceInfo(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try zecPrice()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] zec price. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] zec price. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(zecPriceInfo:reject:)
  func zecPriceInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnZecPriceInfo(dict)
        }
      }
  }

  func fnRemoveTransactionProcess(_ dict: [AnyHashable: Any]) {
      if let txid = dict["txid"] as? String,
          let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try removeTransaction(txid: txid)
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] remove transaction. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] remove transaction. Command arguments problem."
          NSLog(err)
          if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      }
  }

  @objc(removeTransactionProcess:resolve:reject:)
  func removeTransactionProcess(_ txid: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["txid": txid, "resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnRemoveTransactionProcess(dict)
        }
      }
  }

  func fnGetSpendableBalanceWithAddressInfo(_ dict: [AnyHashable: Any]) {
      if let address = dict["address"] as? String,
          let zennies = dict["zennies"] as? String,
          let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try getSpendableBalanceWithAddress(address: address, zennies: zennies)
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] spendable balance address. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] spendable balance address. Command arguments problem."
          NSLog(err)
          if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      }
  }

  @objc(getSpendableBalanceWithAddressInfo:zennies:resolve:reject:)
  func getSpendableBalanceWithAddressInfo(_ address: String, zennies: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["address": address, "zennies": zennies, "resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnGetSpendableBalanceWithAddressInfo(dict)
        }
      }
  }

  func fnGetSpendableBalanceTotalInfo(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          do {
            let resp = try getSpendableBalanceTotal()
            let respStr = String(resp)
            DispatchQueue.main.async {
              resolve(respStr)
            }
          } catch {
            let err = "Error: [Native] spendable balance total. \(error.localizedDescription)"
            NSLog(err)
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      } else {
          let err = "Error: [Native] spendable balance total. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(getSpendableBalanceTotalInfo:reject:)
  func getSpendableBalanceTotalInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnGetSpendableBalanceTotalInfo(dict)
        }
      }
  }

  func fnGetOptionWalletInfo(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try getOptionWallet()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] get option wallet. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] get option wallet. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(getOptionWalletInfo:reject:)
  func getOptionWalletInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnGetOptionWalletInfo(dict)
        }
      }
  }

  func fnSetOptionWalletProcess(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try setOptionWallet()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] set option wallet. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] set option wallet. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(setOptionWalletProcess:reject:)
  func setOptionWalletProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnSetOptionWalletProcess(dict)
        }
      }
  }

  func fnGetUnifiedAddressesInfo(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          do {
            let resp = try getUnifiedAddresses()
            let respStr = String(resp)
            DispatchQueue.main.async {
              resolve(respStr)
            }
          } catch {
            let err = "Error: [Native] unified addresses. \(error.localizedDescription)"
            NSLog(err)
            DispatchQueue.main.async {
              resolve(err)
            }          
          }
      } else {
          let err = "Error: [Native] unified addresses. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(getUnifiedAddressesInfo:reject:)
  func getUnifiedAddressesInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnGetUnifiedAddressesInfo(dict)
        }
      }
  }

  func fnGetTransparentAddressesInfo(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          do {
            let resp = try getTransparentAddresses()
            let respStr = String(resp)
            DispatchQueue.main.async {
              resolve(respStr)
            }
          } catch {
            let err = "Error: [Native] transparent addresses. \(error.localizedDescription)"
            NSLog(err)
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      } else {
          let err = "Error: [Native] transparent addresses. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(getTransparentAddressesInfo:reject:)
  func getTransparentAddressesInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnGetTransparentAddressesInfo(dict)
        }
      }
  }

  func fnCreateNewUnifiedAddressProcess(_ dict: [AnyHashable: Any]) {
      if let receivers = dict["receivers"] as? String,
          let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try createNewUnifiedAddress(receivers: receivers)
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] create new unified address. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] create new unified address. Command arguments problem."
          NSLog(err)
          if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      }
  }

  @objc(createNewUnifiedAddressProcess:resolve:reject:)
  func createNewUnifiedAddressProcess(_ receivers: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["receivers": receivers, "resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnCreateNewUnifiedAddressProcess(dict)
        }
      }
  }

  func fnCreateNewTransparentAddressProcess(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try createNewTransparentAddress()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] create new transparent address. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] create new transparent address. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(createNewTransparentAddressProcess:reject:)
  func createNewTransparentAddressProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnCreateNewTransparentAddressProcess(dict)
        }
      }
  }

  func fnReserveEphemeralAddressProcess(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try reserveEphemeralAddress()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] reserve ephemeral address. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] reserve ephemeral address. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(reserveEphemeralAddressProcess:reject:)
  func reserveEphemeralAddressProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnReserveEphemeralAddressProcess(dict)
        }
      }
  }

  func fnCheckMyAddressInfo(_ dict: [AnyHashable: Any]) {
      if let address = dict["address"] as? String,
          let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try checkMyAddress(address: address)
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] check address. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] check address. Command arguments problem."
          NSLog(err)
          if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      }
  }

  @objc(checkMyAddressInfo:resolve:reject:)
  func checkMyAddressInfo(_ address: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["address": address, "resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnCheckMyAddressInfo(dict)
        }
      }
  }

  func fnGetWalletSaveRequiredInfo(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try getWalletSaveRequired()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] get wallet save required. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }          
        }
      } else {
          let err = "Error: [Native] get wallet save required. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(getWalletSaveRequiredInfo:reject:)
  func getWalletSaveRequiredInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnGetWalletSaveRequiredInfo(dict)
        }
      }
  }

  func fnSetConfigWalletToProdProcess(_ dict: [AnyHashable: Any]) {
      if let performancelevel = dict["performancelevel"] as? String,
          let minconfirmations = dict["minconfirmations"] as? String,
          let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try setConfigWalletToProd(performancelevel: performancelevel, minconfirmations: UInt32(minconfirmations) ?? 0)
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] set wallet config prod. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] set wallet config prod. Command arguments problem."
          NSLog(err)
          if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      }
  }

  @objc(setConfigWalletToProdProcess:minconfirmations:resolve:reject:)
  func setConfigWalletToProdProcess(_ performancelevel: String, minconfirmations: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["performancelevel": performancelevel, "minconfirmations": minconfirmations, "resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnSetConfigWalletToProdProcess(dict)
        }
      }
  }

  func fnGetConfigWalletPerformanceInfo(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          do {
            let resp = try getConfigWalletPerformance()
            let respStr = String(resp)
            DispatchQueue.main.async {
              resolve(respStr)
            }
          } catch {
            let err = "Error: [Native] get wallet config performance level. \(error.localizedDescription)"
            NSLog(err)
            DispatchQueue.main.async {
              resolve(err)
            }          
          }
      } else {
          let err = "Error: [Native] get wallet config performance level. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(getConfigWalletPerformanceInfo:reject:)
  func getConfigWalletPerformanceInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnGetConfigWalletPerformanceInfo(dict)
        }
      }
  }

  func fnGetWalletVersionInfo(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          do {
            let resp = try getWalletVersion()
            let respStr = String(resp)
            DispatchQueue.main.async {
              resolve(respStr)
            }
          } catch {
            let err = "Error: [Native] get wallet version. \(error.localizedDescription)"
            NSLog(err)
            DispatchQueue.main.async {
              resolve(err)
            }          
          }
      } else {
          let err = "Error: [Native] get wallet version. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(getWalletVersionInfo:reject:)
  func getWalletVersionInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnGetWalletVersionInfo(dict)
        }
      }
  }

  func fnSendProcess(_ dict: [AnyHashable: Any]) {
    if let send_json = dict["send_json"] as? String,
        let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
      do {
        let resp = try send(sendJson: send_json)
        let respStr = String(resp)
        DispatchQueue.main.async {
          resolve(respStr)
        }
      } catch {
        let err = "Error: [Native] send. \(error.localizedDescription)"
        NSLog(err)
        DispatchQueue.main.async {
          resolve(err)
        }
      }
    } else {
        let err = "Error: [Native] send. Command arguments problem."
        NSLog(err)
        if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          DispatchQueue.main.async {
            resolve(err)
          }
        }
    }
  }

  @objc(sendProcess:resolve:reject:)
  func sendProcess(_ send_json: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["send_json": send_json, "resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnSendProcess(dict)
        }
      }
  }

  func fnShieldProcess(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try shield()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] shield. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] shield. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(shieldProcess:reject:)
  func shieldProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnShieldProcess(dict)
        }
      }
  }

  func fnConfirmProcess(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        do {
          let resp = try confirm()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
        } catch {
          let err = "Error: [Native] confirm. \(error.localizedDescription)"
          NSLog(err)
          DispatchQueue.main.async {
            resolve(err)
          }
        }
      } else {
          let err = "Error: [Native] confirm. Command arguments problem."
          NSLog(err)
      }
  }

  @objc(confirmProcess:reject:)
  func confirmProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnConfirmProcess(dict)
        }
      }
  }

}
