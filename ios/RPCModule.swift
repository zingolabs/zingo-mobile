//
//  RPCModule.swift
//  Zingo
//
//  Created by Juan Carlos Carmona Calvo on 4/2/24.
//

import Foundation
import React
import ZingoFfi

/// The outcome of a host call, settled on the main queue as a resolved value or a rejection.
enum HostOutcome {
  case resolved(Any?)
  case rejected(code: String, message: String, error: Error)

  /// A LoadError rejects under its case name with its detail, and any other error rejects under "Host".
  static func classify(_ error: Error) -> (code: String, message: String) {
    guard let load = error as? LoadError else {
      return ("Host", String(describing: error))
    }
    switch load {
    case .Unreadable(let detail): return ("Unreadable", detail)
    case .InvalidInput(let detail): return ("InvalidInput", detail)
    case .Save(let detail): return ("Save", detail)
    case .Panic(let detail): return ("Panic", detail)
    case .Poisoned(let detail): return ("Poisoned", detail)
    case .Busy(let detail): return ("Busy", detail)
    case .Internal(let detail): return ("Internal", detail)
    }
  }

  static func of(_ call: () async throws -> Any?) async -> HostOutcome {
    do {
      return .resolved(try await call())
    } catch {
      let (code, message) = classify(error)
      return .rejected(code: code, message: message, error: error)
    }
  }

  func settle(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      switch self {
      case .resolved(let value):
        resolve(value)
      case .rejected(let code, let message, let error):
        NSLog("[Native] host call rejected \(code). \(message)")
        reject(code, message, error)
      }
    }
  }
}

/// A host failure with no wallet-file cause.
enum HostError: Error, CustomStringConvertible {
  case noOpenWallet

  var description: String {
    switch self {
    case .noOpenWallet: return "no wallet is open"
    }
  }
}

extension Chain {
  init(hint: String) throws {
    switch hint {
    case "main": self = .main
    case "test": self = .test
    case "regtest": self = .regtest
    default: throw LoadError.InvalidInput(detail: "unknown chain \"\(hint)\"")
    }
  }
}

extension PerformanceLevel {
  init(hint: String) throws {
    switch hint.lowercased() {
    case "low": self = .low
    case "medium": self = .medium
    case "high": self = .high
    case "maximum": self = .maximum
    default: throw LoadError.InvalidInput(detail: "unknown performance level \"\(hint)\"")
    }
  }
}

extension Connection {
  /// The connection a host call describes, where an empty server means offline and "regtest:<schedule>" carries the node's activation schedule.
  init(serverUri: String, chain: String, performanceLevel: String, minConfirmations: UInt32) throws {
    let parts = chain.split(separator: ":", maxSplits: 1, omittingEmptySubsequences: false).map(String.init)
    self.init(
      serverUri: serverUri.isEmpty ? nil : serverUri,
      chain: try Chain(hint: parts[0]),
      regtestSchedule: parts.count == 2 ? parts[1] : nil,
      performance: try PerformanceLevel(hint: performanceLevel),
      minConfirmations: minConfirmations
    )
  }
}

/// The plain wallet format on disk: raw zingolib bytes whose first field
/// is a little-endian u64 version.
enum WalletFileFormat {
  static func looksLikePlainWallet(_ bytes: Data) -> Bool {
    guard bytes.count >= 8 else { return false }
    var version: UInt64 = 0
    for (offset, byte) in bytes.prefix(8).enumerated() {
      version |= UInt64(byte) << (8 * UInt64(offset))
    }
    return version <= 1000
  }

  /// The bytes of a legacy base64 text file, trimmed to the last whole
  /// quantum so a truncated file still decodes.
  static func decodeLegacyText(_ bytes: Data) -> Data? {
    guard let text = String(data: bytes, encoding: .utf8) else { return nil }
    let trimmed = String(text.prefix(text.count - text.count % 4))
    return Data(base64Encoded: trimmed)
  }
}

/// The wallet-file recovery report in the shape the JS side reads.
private struct RecoveryReport: Encodable {
  let seed_phrase: String
  let birthday: UInt32
  let no_of_accounts: UInt32
}

@objc(RPCModule)
class RPCModule: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool {
      return true
  }

  enum FileError: Error, CustomStringConvertible {
    case documentsDirectoryNotFoundError(String)
    case readWalletError(String)
    case saveFileError(String)
    case writeFileError(String)
    case deleteFileError(String)

    var description: String {
      switch self {
      case .documentsDirectoryNotFoundError(let detail),
           .readWalletError(let detail),
           .saveFileError(let detail),
           .writeFileError(let detail),
           .deleteFileError(let detail):
        return detail
      }
    }
  }

  func getDocumentsDirectory() throws -> String {
    let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
    guard let pathsFirst = paths.first else {
      throw FileError.documentsDirectoryNotFoundError("Error: [Native] Documents directory could not be located.")
    }
    return pathsFirst
  }

  // Set by delete and restore, cleared by the next successful wallet
  // open: a stray save of the in-memory wallet must not resurrect a file
  // the user replaced.
  static var walletFileClosed = false
  static let walletFileHold = NSLock()

  func reopenWalletFile() {
    RPCModule.walletFileHold.lock()
    RPCModule.walletFileClosed = false
    RPCModule.walletFileHold.unlock()
  }

  func getFileName(_ file: String) throws -> String {
    let documentsDirectory = try getDocumentsDirectory()
    let fileName = "\(documentsDirectory)/\(file)"
    return fileName
  }

  func fileExists(_ fileName: String) throws -> Bool {
    let exists = try FileManager.default.fileExists(atPath: getFileName(fileName))
    NSLog("[Native] File \(fileName) exists: \(exists)")
    return exists
  }

  func readFile(_ fileName: String) throws -> String {
    return try String(contentsOfFile: getFileName(fileName), encoding: .utf8)
  }

  // Wallet files rest under OS protection alone: hardware encryption at
  // rest (class C, key available after the first post-boot unlock, so
  // background sync can save while the screen is locked), the app
  // sandbox, and backup exclusion. Class `complete` locked the file
  // seconds after screen lock and broke background saves. Backup
  // exclusion is the guard against restoring a stale wallet over a
  // newer one and must never regress.
  func writeFile(_ fileName: String, walletBytes: Data) throws {
    let filePath = try getFileName(fileName)
    try walletBytes.write(to: URL(fileURLWithPath: filePath), options: .atomic)
    var fileURL = URL(fileURLWithPath: filePath)
    var resourceValues = URLResourceValues()
    resourceValues.isExcludedFromBackup = true
    try? fileURL.setResourceValues(resourceValues)
    try? FileManager.default.setAttributes(
      [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication],
      ofItemAtPath: filePath
    )
  }

  func deleteFile(_ fileName: String) throws {
    try FileManager.default.removeItem(atPath: getFileName(fileName))
  }

  // Moves existing wallet files to the resting protection this build
  // writes: class C plus backup exclusion. Old builds wrote class A, and
  // a synced wallet can open without a save.
  func applyWalletFileProtection() {
    let fm = FileManager.default
    for name in [Constants.WalletFileName.rawValue, Constants.WalletBackupFileName.rawValue] {
      guard let path = try? getFileName(name), fm.fileExists(atPath: path) else { continue }
      var fileURL = URL(fileURLWithPath: path)
      var resourceValues = URLResourceValues()
      resourceValues.isExcludedFromBackup = true
      try? fileURL.setResourceValues(resourceValues)
      try? fm.setAttributes(
        [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication],
        ofItemAtPath: path
      )
    }
  }

  // `restoreWalletBackup` swaps with three atomic renames:
  //   (1) main → temp
  //   (2) backup → main
  //   (3) temp → backup
  // A crash between them leaves the temp file on disk. This finishes the
  // swap from whichever window it stopped in, and is a no-op otherwise.
  //   between (1)–(2): main is missing → complete (2) then (3)
  //   between (2)–(3): backup is missing → complete (3)
  //   all three present: a save landed between the renames. The temp is
  //   the pre-swap main, and content comparison picks the window, as on
  //   Android.
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
      if !fm.fileExists(atPath: mainPath) {
        if fm.fileExists(atPath: backupPath) {
          try fm.moveItem(atPath: backupPath, toPath: mainPath)
        }
        try fm.moveItem(atPath: tempPath, toPath: backupPath)
      } else if !fm.fileExists(atPath: backupPath) {
        try fm.moveItem(atPath: tempPath, toPath: backupPath)
      } else {
        let tempData = try Data(contentsOf: URL(fileURLWithPath: tempPath))
        let mainData = try Data(contentsOf: URL(fileURLWithPath: mainPath))
        if mainData == tempData {
          try fm.removeItem(atPath: mainPath)
          try fm.moveItem(atPath: backupPath, toPath: mainPath)
          try fm.moveItem(atPath: tempPath, toPath: backupPath)
        } else if try Data(contentsOf: URL(fileURLWithPath: backupPath)) == tempData {
          try fm.removeItem(atPath: tempPath)
        } else {
          // Three distinct contents: no window matches, and any pick could
          // destroy a wallet. Everything holds its place for diagnosis.
          NSLog("[Native] completePendingSwap: three distinct wallet files, left untouched")
          return
        }
      }
      NSLog("[Native] completePendingSwap: interrupted swap recovered")
    } catch {
      NSLog("Error: [Native] completePendingSwap failed: \(error.localizedDescription)")
    }
  }

  @objc(walletExists:reject:)
  func walletExists(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    completePendingSwap()
    applyWalletFileProtection()
    Task {
      await HostOutcome.of {
        try self.fileExists(Constants.WalletFileName.rawValue)
      }.settle(resolve: resolve, reject: reject)
    }
  }

  @objc(walletBackupExists:reject:)
  func walletBackupExists(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    completePendingSwap()
    applyWalletFileProtection()
    Task {
      await HostOutcome.of {
        try self.fileExists(Constants.WalletBackupFileName.rawValue)
      }.settle(resolve: resolve, reject: reject)
    }
  }

  func saveWalletFile(_ walletBytes: Data) throws {
    do {
      try writeFile(Constants.WalletFileName.rawValue, walletBytes: walletBytes)
    } catch {
      throw FileError.writeFileError("Error: [Native] writting wallet file error: \(error.localizedDescription)")
    }
  }

  func saveWalletBackupFile(_ walletBytes: Data) throws {
    do {
      try writeFile(Constants.WalletBackupFileName.rawValue, walletBytes: walletBytes)
    } catch {
      throw FileError.writeFileError("Error: [Native] writting wallet backup file error: \(error.localizedDescription)")
    }
  }

  // The background sync state is written from BGProcessingTask paths in
  // AppDelegate while the device may be locked. It stays at the iOS
  // default protection class and outside the wallet `writeFile` helper
  // because the sync metadata stored here is not wallet-recovery material
  // and needs no backup exclusion.
  func saveBackgroundFile(_ jsonString: String) throws {
    do {
      try jsonString.write(toFile: getFileName(Constants.BackgroundFileName.rawValue), atomically: true, encoding: .utf8)
    } catch {
      throw FileError.writeFileError("Error: [Native] writting background file error: \(error.localizedDescription)")
    }
  }

  // Raw wallet bytes, migrating a legacy base64 text file in place. The
  // text stays until the validated raw copy replaces it.
  func readWalletFileBytes(_ fileName: String) throws -> Data {
    let path = try getFileName(fileName)
    let stored: Data
    do {
      stored = try Data(contentsOf: URL(fileURLWithPath: path))
    } catch {
      throw FileError.readWalletError("Error: [Native] reading \(fileName) error: \(error.localizedDescription)")
    }
    if WalletFileFormat.looksLikePlainWallet(stored) {
      return stored
    }
    guard let decoded = WalletFileFormat.decodeLegacyText(stored),
          (try? validateWalletBytes(walletBytes: decoded)) != nil else {
      throw FileError.readWalletError("Error: [Native] \(fileName) is not a wallet this build can read")
    }
    do {
      try writeFile(fileName, walletBytes: decoded)
      NSLog("[Native] \(fileName) migrated to raw wallet bytes")
    } catch {
      NSLog("Error: [Native] \(fileName) migration to raw bytes skipped: \(error.localizedDescription)")
    }
    return decoded
  }

  func readWalletBytes() throws -> Data {
    try readWalletFileBytes(Constants.WalletFileName.rawValue)
  }

  func readWalletBackupBytes() throws -> Data {
    try readWalletFileBytes(Constants.WalletBackupFileName.rawValue)
  }

  func fnDeleteExistingWallet() throws {
    completePendingSwap()
    do {
      try deleteFile(Constants.WalletFileName.rawValue)
    } catch {
      throw FileError.deleteFileError("Error: [Native] deleting wallet error: \(error.localizedDescription)")
    }
    RPCModule.walletFileHold.lock()
    RPCModule.walletFileClosed = true
    RPCModule.walletFileHold.unlock()
    if let broken = try? getFileName("\(Constants.WalletFileName.rawValue).broken") {
      try? FileManager.default.removeItem(atPath: broken)
    }
  }

  @objc(deleteExistingWallet:reject:)
  func deleteExistingWallet(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    Task {
      await HostOutcome.of {
        guard try self.fileExists(Constants.WalletFileName.rawValue) else { return false }
        try self.fnDeleteExistingWallet()
        return true
      }.settle(resolve: resolve, reject: reject)
    }
  }

  func fnDeleteExistingWalletBackup() throws {
    completePendingSwap()
    do {
      try deleteFile(Constants.WalletBackupFileName.rawValue)
    } catch {
      throw FileError.deleteFileError("Error: [Native] deleting wallet backup error: \(error.localizedDescription)")
    }
  }

  @objc(deleteExistingWalletBackup:reject:)
  func deleteExistingWalletBackup(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    Task {
      await HostOutcome.of {
        guard try self.fileExists(Constants.WalletBackupFileName.rawValue) else { return false }
        try self.fnDeleteExistingWalletBackup()
        return true
      }.settle(resolve: resolve, reject: reject)
    }
  }

  /// Writes wallet bytes to the wallet file unless a delete or restore closed it.
  func saveWalletInternal(_ walletBytes: Data) throws {
    RPCModule.walletFileHold.lock()
    defer { RPCModule.walletFileHold.unlock() }
    if RPCModule.walletFileClosed {
      NSLog("[Native] wallet file closed, save refused")
      return
    }
    NSLog("[Native] file size: \(walletBytes.count) bytes")
    do {
      try saveWalletFile(walletBytes)
    } catch {
      let detail = "Error: [Native] Couldn't save the wallet. \(error.localizedDescription)"
      NSLog(detail)
      throw FileError.saveFileError(detail)
    }
  }

  /// Saves the wallet to its file when the wallet reports bytes to persist.
  func save(_ wallet: Wallet) async throws {
    guard let walletBytes = try await wallet.saveWalletBytes() else {
      NSLog("[Native] No need to save the wallet.")
      return
    }
    try saveWalletInternal(walletBytes)
  }

  /// Opens the wallet file into the process slot with the connection the arguments describe.
  func openWalletFile(serverUri: String, chain: String, performanceLevel: String, minConfirmations: UInt32) async throws -> Wallet {
    let connection = try Connection(
      serverUri: serverUri, chain: chain, performanceLevel: performanceLevel, minConfirmations: minConfirmations)
    let walletBytes = try readWalletBytes()
    let wallet = try await Wallet.openFromBytes(connection: connection, walletBytes: walletBytes)
    reopenWalletFile()
    return wallet
  }

  @objc(loadExistingWallet:chain:performanceLevel:minConfirmations:resolve:reject:)
  func loadExistingWallet(
    _ serverUri: String,
    chain: String,
    performanceLevel: String,
    minConfirmations: NSNumber,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task {
      await HostOutcome.of {
        _ = try await self.openWalletFile(
          serverUri: serverUri, chain: chain, performanceLevel: performanceLevel,
          minConfirmations: minConfirmations.uint32Value)
        return nil
      }.settle(resolve: resolve, reject: reject)
    }
  }

  @objc(saveWallet:reject:)
  func saveWallet(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    Task {
      await HostOutcome.of {
        guard let wallet = currentWallet() else { throw HostError.noOpenWallet }
        try await self.save(wallet)
        return nil
      }.settle(resolve: resolve, reject: reject)
    }
  }

  @objc(saveWalletBackup:reject:)
  func saveWalletBackup(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    Task {
      await HostOutcome.of {
        try self.saveWalletBackupFile(try self.readWalletBytes())
        return nil
      }.settle(resolve: resolve, reject: reject)
    }
  }

  /// Swaps the backup into place with three atomic renames, or copies it when no wallet file exists.
  func restoreWalletBackup() throws {
    let backupBytes = try readWalletBackupBytes()
    try validateWalletBytes(walletBytes: backupBytes)
    // Closed across the swap; the reload after the restore clears it.
    RPCModule.walletFileHold.lock()
    RPCModule.walletFileClosed = true
    RPCModule.walletFileHold.unlock()
    guard try fileExists(Constants.WalletFileName.rawValue) else {
      // The backup stays in place: a user who then restores a different
      // wallet keeps this one.
      try saveWalletFile(backupBytes)
      return
    }
    // APFS rename is atomic and keeps the protection class and the backup
    // exclusion. A temp left by an interrupted swap is recovered first.
    completePendingSwap()
    let fm = FileManager.default
    let mainPath = try getFileName(Constants.WalletFileName.rawValue)
    let backupPath = try getFileName(Constants.WalletBackupFileName.rawValue)
    let tempPath = try getFileName(Constants.WalletTempSwapFileName.rawValue)
    try fm.moveItem(atPath: mainPath, toPath: tempPath)
    try fm.moveItem(atPath: backupPath, toPath: mainPath)
    try fm.moveItem(atPath: tempPath, toPath: backupPath)
  }

  @objc(restoreExistingWalletBackup:reject:)
  func restoreExistingWalletBackup(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    Task {
      await HostOutcome.of {
        try self.restoreWalletBackup()
        return nil
      }.settle(resolve: resolve, reject: reject)
    }
  }

  /// Salvages the seed and birthday from the wallet file and keeps a ".broken" copy aside.
  func walletFileRecovery() throws -> String {
    let mainPath = try getFileName(Constants.WalletFileName.rawValue)
    let stored = try Data(contentsOf: URL(fileURLWithPath: mainPath))
    let walletBytes = WalletFileFormat.looksLikePlainWallet(stored)
      ? stored
      : WalletFileFormat.decodeLegacyText(stored)
    guard let walletBytes else {
      throw LoadError.Unreadable(detail: "the wallet file is not a wallet this build can read")
    }
    let salvaged = try walletRecoveryInfo(walletBytes: walletBytes)
    let fm = FileManager.default
    let brokenPath = "\(mainPath).broken"
    try? fm.removeItem(atPath: brokenPath)
    try? fm.copyItem(atPath: mainPath, toPath: brokenPath)
    let report = RecoveryReport(
      seed_phrase: salvaged.seedPhrase, birthday: salvaged.birthday, no_of_accounts: salvaged.noOfAccounts)
    return try String(decoding: JSONEncoder().encode(report), as: UTF8.self)
  }

  @objc(walletFileRecoveryInfo:reject:)
  func walletFileRecoveryInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    Task {
      await HostOutcome.of {
        try self.walletFileRecovery()
      }.settle(resolve: resolve, reject: reject)
    }
  }
}
