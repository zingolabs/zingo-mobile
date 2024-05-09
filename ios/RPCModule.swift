//
//  RPCModule.swift
//  ZingoMobile
//
//  Created by Juan Carlos Carmona Calvo on 4/2/24.
//

import Foundation
import React

@objc(RPCModule)
class RPCModule: NSObject {
  
  private let walletFileName = "wallet.dat.txt"
  private let walletBackupFileName = "wallet.backup.dat.txt"
  private let backgroundFileName = "background.json"
  private let errorPrefix = "error"
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
      return true
  }
  
  enum FileError: Error {
    case documentsDirectoryNotFoundError(String)
    case readWalletUtf8StringError(String)
    case readWalletDecodedDataError(String)
    case saveFileDecodingError(String)
    case saveFileError(String)
    case writeFileError(String)
    case deleteFileError(String)
  }
  
  func getDocumentsDirectory() throws -> String {
    let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
    guard let pathsFirst = paths.first else {
      throw FileError.documentsDirectoryNotFoundError("Documents directory could not be located.")
    }
    return pathsFirst
  }
  
  func getFileName(_ file: String) throws -> String {
    let documentsDirectory = try getDocumentsDirectory()
    let fileName = "\(documentsDirectory)/\(file)"
    return fileName
  }
  
  func fileExists(_ fileName: String) -> String {
    let fileExists = FileManager.default.fileExists(atPath: fileName)
    if fileExists {
      return "true"
    } else {
      return "false"
    }
  }
  
  @objc(walletExists:reject:)
  func walletExists(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      let fileName = try getFileName(walletFileName)
      resolve(fileExists(fileName))
    } catch {
      NSLog("wallet exists error: \(error.localizedDescription)")
      resolve("false")
    }
  }

  @objc(walletBackupExists:reject:)
  func walletBackupExists(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      let fileName = try getFileName(walletBackupFileName)
      resolve(fileExists(fileName))
    } catch {
      NSLog("wallet backup exists error: \(error.localizedDescription)")
      resolve("false")
    }
  }

  func saveWalletFile(_ base64EncodedString: String) throws {
    let fileName = try getFileName(walletFileName)
    do {
      try base64EncodedString.write(toFile: fileName, atomically: true, encoding: .utf8)
    } catch {
      throw FileError.writeFileError("Error writting wallet file error: \(error.localizedDescription)")
    }
  }
  
  func saveWalletBackupFile(_ base64EncodedString: String) throws {
    let fileName = try getFileName(walletBackupFileName)
    do {
      try base64EncodedString.write(toFile: fileName, atomically: true, encoding: .utf8)
    } catch {
      throw FileError.writeFileError("Error writting wallet backup file error: \(error.localizedDescription)")
    }
  }

  func saveBackgroundFile(_ data: String) throws {
    let fileName = try getFileName(backgroundFileName)
    do {
      try data.write(toFile: fileName, atomically: true, encoding: .utf8)
    } catch {
      throw FileError.writeFileError("Error writting background file error: \(error.localizedDescription)")
    }
  }

  func readWalletUtf8String() throws -> String {
    let fileName = try getFileName(walletFileName)
    do {
      let content = try String(contentsOfFile: fileName, encoding: .utf8)
      return content
    } catch {
      throw FileError.readWalletUtf8StringError("Error reading old wallet format error: \(error.localizedDescription)")
    }
  }

  func readWalletBackup() throws -> String {
    let fileName = try getFileName(walletBackupFileName)
    do {
      let content = try String(contentsOfFile: fileName, encoding: .utf8)
      return content
    } catch {
      throw FileError.readWalletDecodedDataError("Error reading new wallet backup format error: \(error.localizedDescription)")
    }
  }

  func deleteExistingWallet() throws {
    let fileName = try getFileName(walletFileName)
    do {
      try FileManager.default.removeItem(atPath: fileName)
    } catch {
      throw FileError.deleteFileError("Error deleting wallet error: \(error.localizedDescription)")
    }
  }

  @objc(deleteExistingWallet:reject:)
  func deleteExistingWallet(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      try self.deleteExistingWallet()
      resolve("true")
    } catch {
      NSLog("\(error.localizedDescription)")
      resolve("false")
    }
  }
  
  func deleteExistingWalletBackup() throws {
    let fileName = try getFileName(walletBackupFileName)
    do {
      try FileManager.default.removeItem(atPath: fileName)
    } catch {
      throw FileError.deleteFileError("Error deleting wallet backup error: \(error.localizedDescription)")
    }
  }

  @objc(deleteExistingWalletBackup:reject:)
  func deleteExistingWalletBackup(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      try self.deleteExistingWalletBackup()
      resolve("true")
    } catch {
      NSLog("\(error.localizedDescription)")
      resolve("false")
    }
  }

  func saveWalletInternal() throws {
    let walletEncodedString = saveToB64()
    if (!walletEncodedString.lowercased().hasPrefix(errorPrefix)) {
      try self.saveWalletFile(walletEncodedString)
    } else {
      throw FileError.saveFileError("Error saving wallet error: \(walletEncodedString)")
    }
  }

  func saveWalletBackupInternal() throws {
    let walletData = try readWalletUtf8String()
    try self.saveWalletBackupFile(walletData)
  }

  func createNewWallet(server: String, chainhint: String) throws -> String {
    let documentsDirectory = try getDocumentsDirectory()
    let seed = initNew(serveruri: server, datadir: documentsDirectory, chainhint: chainhint, monitorMempool: true)
    let seedStr = String(seed)
    if !seedStr.lowercased().hasPrefix(errorPrefix) {
      try self.saveWalletInternal()
    }
    return seedStr
  }

  @objc(createNewWallet:chainhint:resolve:reject:)
  func createNewWallet(_ server: String, chainhint: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      let seedStr = try self.createNewWallet(server: server, chainhint: chainhint)
      resolve(seedStr)
    } catch {
      let err = "Error: [Native] Creating a new wallet. \(error.localizedDescription)"
      NSLog(err)
      resolve(err)
    }
  }
  
  func restoreWalletFromSeed(server: String, chainhint: String, restoreSeed: String, birthday: String) throws -> String {
    let documentsDirectory = try getDocumentsDirectory()
    let seed = initFromSeed(serveruri: server, seed: restoreSeed, birthday: UInt64(birthday) ?? 0, datadir: documentsDirectory, chainhint: chainhint, monitorMempool: true)
    let seedStr = String(seed)
    if !seedStr.lowercased().hasPrefix(errorPrefix) {
      try self.saveWalletInternal()
    }
    return seedStr
  }

  @objc(restoreWalletFromSeed:birthday:server:chainhint:resolve:reject:)
  func restoreWalletFromSeed(_ restoreSeed: String, birthday: String, server: String, chainhint: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      let seedStr = try self.restoreWalletFromSeed(server: server, chainhint: chainhint, restoreSeed: restoreSeed, birthday: birthday)
      resolve(seedStr)
    } catch {
      let err = "Error: [Native] Restoring a wallet with seed. \(error.localizedDescription)"
      NSLog(err)
      resolve(err)
    }
  }
  
  func restoreWalletFromUfvk(server: String, chainhint: String, restoreUfvk: String, birthday: String) throws -> String {
    let documentsDirectory = try getDocumentsDirectory()
    let ufvk = initFromUfvk(serveruri: server, ufvk: restoreUfvk, birthday: UInt64(birthday) ?? 0, datadir: documentsDirectory, chainhint: chainhint, monitorMempool: true)
    let ufvkStr = String(ufvk)
    if !ufvkStr.lowercased().hasPrefix(errorPrefix) {
      try self.saveWalletInternal()
    }
    return ufvkStr
  }

  @objc(restoreWalletFromUfvk:birthday:server:chainhint:resolve:reject:)
  func restoreWalletFromUfvk(_ restoreUfvk: String, birthday: String, server: String, chainhint: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      let ufvkStr = try self.restoreWalletFromUfvk(server: server, chainhint: chainhint, restoreUfvk: restoreUfvk, birthday: birthday)
      resolve(ufvkStr)
    } catch {
      let err = "Error: [Native] Restoring a wallet with ufvk. \(error.localizedDescription)"
      NSLog(err)
      resolve(err)
    }
  }

  func loadExistingWallet(server: String, chainhint: String) throws -> String {
    let documentsDirectory = try getDocumentsDirectory()
    let walletEncodedUtf8String = try self.readWalletUtf8String()
    let seed = initFromB64(serveruri: server, datab64: walletEncodedUtf8String, datadir: documentsDirectory, chainhint: chainhint, monitorMempool: true)
    let seedStr = String(seed)
    return seedStr
  }

  @objc(loadExistingWallet:chainhint:resolve:reject:)
  func loadExistingWallet(_ server: String, chainhint: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      let seedStr = try self.loadExistingWallet(server: server, chainhint: chainhint)
      resolve(seedStr)
    } catch {
      let err = "Error: [Native] Loading existing wallet. \(error.localizedDescription)"
      NSLog(err)
      resolve(err)
    }
  }

  @objc(restoreExistingWalletBackup:reject:)
  func restoreExistingWalletBackup(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      let backupData = try self.readWalletBackup()
      let walletData = try self.readWalletUtf8String()
      try self.saveWalletFile(backupData)
      try self.saveWalletBackupFile(walletData)
      resolve("true")
    } catch {
      NSLog("Restoring existing wallet backup error: \(error.localizedDescription)")
      resolve("false")
    }
  }

  @objc(doSave:reject:)
  func doSave(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      try self.saveWalletInternal()
      resolve("true")
    } catch {
      NSLog("Saving wallet error: \(error.localizedDescription)")
      resolve("false")
    }
  }

  @objc(doSaveBackup:reject:)
  func doSaveBackup(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      try self.saveWalletBackupInternal()
      resolve("true")
    } catch {
      NSLog("Saving wallet backup error: \(error.localizedDescription)")
      resolve("false")
    }
  }

  func doExecuteOnThread(_ dict: [String: Any]) {
    if let method = dict["method"] as? String,
       let args = dict["args"] as? String,
       let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
      let resp = executeCommand(cmd: method, args: args)
      let respStr = String(resp)
      if method == "sync" && !respStr.lowercased().hasPrefix(errorPrefix) {
        // Also save the wallet after sync
        do {
          try self.saveWalletInternal()
        } catch {
          NSLog("Executing a command error: \(error.localizedDescription)")
          resolve("Error: [Native] Executing command. \(error.localizedDescription)")
        }
      }
      resolve(respStr)
    } else {
      NSLog("Error executing a command. Command argument problem.")
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        resolve("Error: [Native] Executing command. Command argument problem.")
      }
    }
  }

  @objc(execute:args:resolve:reject:)
  func execute(_ method: String, args: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["method": method, "args": args, "resolve": resolve]
      DispatchQueue.global().async { [weak self] in
          if let self = self {
              self.doExecuteOnThread(dict)
          }
      }
  }

  @objc(getLatestBlock:resolve:reject:)
  func getLatestBlock(_ server: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["server": server, "resolve": resolve]
      self.getLatestBlockAsync(dict)
  }

  func getLatestBlockAsync(_ dict: [AnyHashable: Any]) {
    if let server = dict["server"] as? String,
       let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
      let resp = getLatestBlockServer(serveruri: server)
      let respStr = String(resp)
      resolve(respStr)
    } else {
      NSLog("Error getting latest block server. Argument problem")
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          resolve("Error: [Native] Getting server latest block. Argument problem.")
      }
    }
  }

}
