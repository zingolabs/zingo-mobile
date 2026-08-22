//
//  RPCModule.swift
//  Zingo
//
//  Created by Juan Carlos Carmona Calvo on 4/2/24.
//

import Foundation
import React

/// A pure canonical-base64 check — no I/O, no logging, no platform
/// dependencies — so it runs under plain XCTest unit tests.
///
/// The FFI no longer returns base64 (the save path crosses as bytes, so a
/// malformed export is unrepresentable). This guard's one remaining role is
/// validating wallet-file content read back from disk before
/// `restoreExistingWalletBackup` swaps it into place.
enum WalletExport {
  // Canonical: exactly the strings the encoder emits and the Rust
  // STANDARD engine accepts, checked by decode/re-encode round-trip.
  // (Foundation's decoder alone tolerates non-zero trailing padding
  // bits, which Rust rejects at init_from_b64.)
  static func isValidBase64(_ s: String) -> Bool {
    guard !s.isEmpty, let decoded = Data(base64Encoded: s) else { return false }
    return decoded.base64EncodedString() == s
  }
}

/// The outcome of an FFI call, classified by channel alone
/// (zingo-mobile#1151): the value a call returns is resolved verbatim —
/// never inspected for an error sentinel — and a thrown ZingolibError is
/// rejected under its variant's name, the stable rejection code shared by
/// every bridge (Kotlin, Swift, TS). Any other thrown error rejects as
/// "Unknown". Classification (`of`) is pure — no I/O, no logging, no
/// platform dependencies — so it runs under plain XCTest unit tests.
/// Settling touches only the promise blocks.
enum FfiOutcome {
  case resolved(String)
  case rejected(code: String, message: String, error: Error)

  /// The one variant→(code, message) mapping. Exhaustive on purpose —
  /// no default — so when the generated ZingolibError gains a variant
  /// this switch fails compilation instead of silently degrading the
  /// new variant to "Unknown".
  static func classify(_ error: ZingolibError) -> (code: String, message: String) {
    switch error {
    case .LightclientNotInitialized(let message): return ("LightclientNotInitialized", message)
    case .LightclientLockPoisoned(let message): return ("LightclientLockPoisoned", message)
    case .Panic(let message): return ("Panic", message)
    case .Save(let message): return ("Save", message)
    case .Init(let message): return ("Init", message)
    case .Sync(let message): return ("Sync", message)
    case .Rescan(let message): return ("Rescan", message)
    case .Read(let message): return ("Read", message)
    case .Send(let message): return ("Send", message)
    case .Shield(let message): return ("Shield", message)
    case .InvalidInput(let message): return ("InvalidInput", message)
    case .Wallet(let message): return ("Wallet", message)
    case .Indexer(let message): return ("Indexer", message)
    case .Offline(let message): return ("Offline", message)
    case .SideChannelPoisoned(let message): return ("SideChannelPoisoned", message)
    case .MigrationNotInProgress(let message): return ("MigrationNotInProgress", message)
    case .MigrationAlreadyInProgress(let message): return ("MigrationAlreadyInProgress", message)
    case .MigrationConsentStale(let message): return ("MigrationConsentStale", message)
    case .MigrationCadenceFixed(let message): return ("MigrationCadenceFixed", message)
    case .MigrationSplit(let message): return ("MigrationSplit", message)
    case .Migration(let message): return ("Migration", message)
    case .Mixnet(let message): return ("Mixnet", message)
    }
  }

  static func of(_ call: () throws -> String) -> FfiOutcome {
    do {
      return .resolved(try call())
    } catch let error as ZingolibError {
      let (code, message) = FfiOutcome.classify(error)
      return .rejected(code: code, message: message, error: error)
    } catch {
      return .rejected(code: "Unknown", message: String(describing: error), error: error)
    }
  }

  func settle(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    switch self {
    case .resolved(let value):
      DispatchQueue.main.async {
        resolve(value)
      }
    case .rejected(let code, let message, let error):
      NSLog("[Native] FFI rejected \(code). \(message)")
      DispatchQueue.main.async {
        reject(code, message, error)
      }
    }
  }
}

/// Pure parsers for the bridge's string-crossing numeric arguments. A
/// malformed or overflowing value throws the typed InvalidInput — the same
/// code and message shape the Android bridge rejects with — never a silent
/// default and never an unsettled promise. Pure — no I/O, no platform
/// dependencies — so the parsers run under plain XCTest unit tests.
enum FfiArgs {
  static func requiredU32(_ raw: String, name: String) throws -> UInt32 {
    guard let parsed = UInt32(raw) else {
      throw ZingolibError.InvalidInput(message: "\(name) must be a u32: \"\(raw)\"")
    }
    return parsed
  }

  /// Empty means absent — the module's "keep the default" convention.
  static func optionalU32(_ raw: String, name: String) throws -> UInt32? {
    raw.isEmpty ? nil : try requiredU32(raw, name: name)
  }

  static func requiredU64(_ raw: String, name: String) throws -> UInt64 {
    guard let parsed = UInt64(raw) else {
      throw ZingolibError.InvalidInput(message: "\(name) must be a u64: \"\(raw)\"")
    }
    return parsed
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
      // Logged here, rethrown unwrapped: the FFI's typed error must reach
      // the bridge intact so it rejects under its own variant name, not
      // wrapped into a FileError that would reject as "Unknown".
      NSLog("Error: [Native] Couldn't save the wallet. \(String(describing: error))")
      throw error
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
    birthday: String,
    chainhint: String,
    performancelevel: String,
    minconfirmations: String
  ) throws -> String {
    // initNew throws on failure, so reaching the save implies the wallet
    // exists. Offline (empty serveruri) uses `birthday` in place of the
    // chain tip; online it is ignored (pass "0").
    let seed = try initNew(serveruri: serveruri, birthday: UInt32(birthday) ?? 0, chainhint: chainhint, performancelevel: performancelevel, minconfirmations: UInt32(minconfirmations) ?? 0)
    let seedStr = String(seed)
    try self.saveWalletInternal()
    return seedStr
  }

  @objc(createNewWallet:birthday:chainhint:performancelevel:minconfirmations:resolve:reject:)
  func createNewWallet(
    _ serveruri: String,
    birthday: String,
    chainhint: String,
    performancelevel: String,
    minconfirmations: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    FfiOutcome.of {
      try self.fnCreateNewWallet(serveruri: serveruri, birthday: birthday, chainhint: chainhint, performancelevel: performancelevel, minconfirmations: minconfirmations)
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
    FfiOutcome.of {
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
    FfiOutcome.of {
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
    FfiOutcome.of {
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
          // No wallet exists: restore backup as wallet, but KEEP the backup
          // file. Deleting it here left the user with no backup right after a
          // restore, so if they then created/restored a different wallet the
          // just-restored one was gone. Keeping a duplicate copy as backup is
          // far safer than none.
          try self.saveWalletFile(backupEncodedData)
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

  // The save internals throw on failure, so success is the only value the
  // data channel carries ("true", kept for the JS seam's shape matrix);
  // failure rejects with the thrown error — never as prose or a sentinel
  // "false" in the success channel (zingo-mobile#1151 ask 4).
  @objc(doSave:reject:)
  func doSave(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.global(qos: .userInitiated).async {
      FfiOutcome.of {
        try self.saveWalletInternal()
        return "true"
      }.settle(resolve: resolve, reject: reject)
    }
  }

  @objc(doSaveBackup:reject:)
  func doSaveBackup(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.global(qos: .userInitiated).async {
      FfiOutcome.of {
        try self.saveWalletBackupInternal()
        return "true"
      }.settle(resolve: resolve, reject: reject)
    }
  }

  @objc(getLatestBlockServerInfo:resolve:reject:)
  func getLatestBlockServerInfo(_ serveruri: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getLatestBlockServer(serveruri: serveruri)
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(getLatestBlockWalletInfo:reject:)
  func getLatestBlockWalletInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getLatestBlockWallet()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(getDonationAddress:reject:)
  func getDonationAddress(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getDeveloperDonationAddress()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(getZenniesDonationAddress:reject:)
  func getZenniesDonationAddress(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getZenniesForZingoDonationAddress()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(getValueTransfersList:reject:)
  func getValueTransfersList(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getValueTransfers()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(setCryptoDefaultProvider:reject:)
  func setCryptoDefaultProvider(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try setCryptoDefaultProviderToRing()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  // The app-supplied migration broadcast candidate pool (its indexer
  // registry); zingolib embeds no default set.
  @objc(setBroadcastCandidates:resolve:reject:)
  func setBroadcastCandidates(_ candidatesJson: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try setBroadcastCandidates(candidatesJson: candidatesJson)
        }.settle(resolve: resolve, reject: reject)
      }
  }

  // Mixnet Mode (send-over-nym). The wallet-side FFI seam, bridged on both
  // platforms; the local proxy is hosted separately by NymTransportModule.
  @objc(attachMixnet:exitNode:resolve:reject:)
  func attachMixnet(_ socks5Addr: String, exitNode: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try attachMixnet(socks5Addr: socks5Addr, exitNode: exitNode)
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(enableMixnet:resolve:reject:)
  func enableMixnet(_ proxyPath: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try enableMixnet(proxyPath: proxyPath)
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(disableMixnet:reject:)
  func disableMixnet(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try disableMixnet()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(mixnetIndicatorInfo:reject:)
  func mixnetIndicatorInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try mixnetIndicator()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(mixnetBootstrapDetailInfo:reject:)
  func mixnetBootstrapDetailInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try mixnetBootstrapDetail()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(pollSyncInfo:reject:)
  func pollSyncInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
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
        FfiOutcome.of {
          try runSync()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(pauseSyncProcess:reject:)
  func pauseSyncProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try pauseSync()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(statusSyncInfo:reject:)
  func statusSyncInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try statusSync()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(runRescanProcess:reject:)
  func runRescanProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try runRescan()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(infoServerInfo:reject:)
  func infoServerInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try infoServer()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(getSeedInfo:reject:)
  func getSeedInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getSeed()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(getUfvkInfo:reject:)
  func getUfvkInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getUfvk()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(changeServerProcess:resolve:reject:)
  func changeServerProcess(_ serveruri: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try changeServer(serveruri: serveruri)
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(walletKindInfo:reject:)
  func walletKindInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try walletKind()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(parseAddressInfo:resolve:reject:)
  func parseAddressInfo(_ address: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try parseAddress(address: address)
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(parseUfvkInfo:resolve:reject:)
  func parseUfvkInfo(_ ufvk: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try parseUfvk(ufvk: ufvk)
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(getVersionInfo:reject:)
  func getVersionInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getVersion()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(getMessagesInfo:resolve:reject:)
  func getMessagesInfo(_ address: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getMessages(address: address)
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(getBalanceInfo:reject:)
  func getBalanceInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getBalance()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(getTotalMemobytesToAddressInfo:reject:)
  func getTotalMemobytesToAddressInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getTotalMemobytesToAddress()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(getTotalValueToAddressInfo:reject:)
  func getTotalValueToAddressInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getTotalValueToAddress()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(getTotalSpendsToAddressInfo:reject:)
  func getTotalSpendsToAddressInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getTotalSpendsToAddress()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(zecPriceInfo:reject:)
  func zecPriceInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try zecPrice()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(removeTransactionProcess:resolve:reject:)
  func removeTransactionProcess(_ txid: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try removeTransaction(txid: txid)
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(getSpendableBalanceWithAddressInfo:zennies:resolve:reject:)
  func getSpendableBalanceWithAddressInfo(_ address: String, zennies: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getSpendableBalanceWithAddress(address: address, zennies: zennies)
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(getSpendableBalanceTotalInfo:reject:)
  func getSpendableBalanceTotalInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getSpendableBalanceTotal()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(getOptionWalletInfo:reject:)
  func getOptionWalletInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getOptionWallet()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(setOptionWalletProcess:reject:)
  func setOptionWalletProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try setOptionWallet()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(getUnifiedAddressesInfo:reject:)
  func getUnifiedAddressesInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getUnifiedAddresses()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(getTransparentAddressesInfo:reject:)
  func getTransparentAddressesInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getTransparentAddresses()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(createNewUnifiedAddressProcess:resolve:reject:)
  func createNewUnifiedAddressProcess(_ receivers: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try createNewUnifiedAddress(receivers: receivers)
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(createNewTransparentAddressProcess:reject:)
  func createNewTransparentAddressProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try createNewTransparentAddress()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(checkMyAddressInfo:resolve:reject:)
  func checkMyAddressInfo(_ address: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try checkMyAddress(address: address)
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(getWalletSaveRequiredInfo:reject:)
  func getWalletSaveRequiredInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getWalletSaveRequired()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(setConfigWalletToProdProcess:minconfirmations:resolve:reject:)
  func setConfigWalletToProdProcess(_ performancelevel: String, minconfirmations: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try setConfigWalletToProd(performancelevel: performancelevel, minconfirmations: UInt32(minconfirmations) ?? 0)
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(getConfigWalletPerformanceInfo:reject:)
  func getConfigWalletPerformanceInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getConfigWalletPerformance()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(getWalletVersionInfo:reject:)
  func getWalletVersionInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getWalletVersion()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(sendProcess:resolve:reject:)
  func sendProcess(_ send_json: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try send(sendJson: send_json)
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(shieldProcess:reject:)
  func shieldProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try shield()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(confirmProcess:reject:)
  func confirmProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try confirm()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(planOrchardDrainProcess:reject:)
  func planOrchardDrainProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try planOrchardDrain()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(drainOrchardProcess:reject:)
  func drainOrchardProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try drainOrchardToIronwood()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  // Polled concurrently while `drainOrchardProcess` runs. Dispatched on the
  // global concurrent queue so it does not queue behind the in-flight drain;
  // the native `drainStatus()` reads a side channel, never the lightclient lock
  // the drain holds, so the poll returns immediately.
  @objc(drainStatusProcess:reject:)
  func drainStatusProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try drainStatus()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(planIronwoodMigrationProcess:reject:)
  func planIronwoodMigrationProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try planIronwoodMigration()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(startIronwoodMigrationProcess:perBucket:resolve:reject:)
  func startIronwoodMigrationProcess(_ plan_hash_hex: String, perBucket per_bucket: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          // Empty string means "keep zingolib's default cadence" (the
          // module's numeric-arg-as-string convention); anything else must
          // parse as a u32 — a malformed value rejects as InvalidInput
          // instead of silently keeping the default.
          try startIronwoodMigration(
            planHashHex: plan_hash_hex,
            perBucket: FfiArgs.optionalU32(per_bucket, name: "per_bucket"))
        }.settle(resolve: resolve, reject: reject)
      }
  }

  // Proves and broadcasts one splitting round, so like the drain it runs
  // long; the global concurrent queue keeps it off the main thread.
  @objc(continueNoteSplittingProcess:reject:)
  func continueNoteSplittingProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try continueNoteSplitting()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  // Proves and broadcasts one Phase 1 splitting round (ADR 0016), so like the
  // drain it runs long; the global concurrent queue keeps it off the main
  // thread.
  @objc(quickSplitProcess:reject:)
  func quickSplitProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try quickSplit()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  // Polled concurrently while `quickSplitProcess` runs; the native
  // `splitStatus()` reads a side channel, never the lightclient lock the round
  // holds, so the poll returns immediately.
  @objc(splitStatusProcess:reject:)
  func splitStatusProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try splitStatus()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(reschedulePartsProcess:resolve:reject:)
  func reschedulePartsProcess(_ per_bucket: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          // `per_bucket` crosses as a string (numeric-arg convention); a
          // malformed value rejects as InvalidInput — never an unsettled
          // promise.
          try rescheduleParts(perBucket: FfiArgs.requiredU32(per_bucket, name: "per_bucket"))
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(migrationStatusProcess:reject:)
  func migrationStatusProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try migrationStatus()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(windowTimelineProcess:reject:)
  func windowTimelineProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try windowTimeline()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(reconcileMigrationProcess:reject:)
  func reconcileMigrationProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try reconcileMigration()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  // Phase-2 execute tap: proves and broadcasts the scheduled migration's due
  // batch, so like the drain it runs long; the global concurrent queue keeps it
  // off the main thread. `spacing_ms` crosses as a string (numeric-arg
  // convention) — the delay sequenced between the batch's sends.
  @objc(executeDuePartsProcess:resolve:reject:)
  func executeDuePartsProcess(_ spacing_ms: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          // A malformed spacing rejects as InvalidInput — never an
          // unsettled promise.
          try executeDueParts(spacingMs: FfiArgs.requiredU64(spacing_ms, name: "spacing_ms"))
        }.settle(resolve: resolve, reject: reject)
      }
  }

  // Polled concurrently while `executeDuePartsProcess` runs; the native
  // `executeDuePartsStatus()` reads a side channel, never the lightclient lock
  // the batch holds, so the poll returns immediately.
  @objc(executeDuePartsStatusProcess:reject:)
  func executeDuePartsStatusProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try executeDuePartsStatus()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(cancelIronwoodMigrationProcess:reject:)
  func cancelIronwoodMigrationProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try cancelIronwoodMigration()
        }.settle(resolve: resolve, reject: reject)
      }
  }

}
