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
      throw FileError.documentsDirectoryNotFoundError("Documents directory could not be located.")
    }
    return pathsFirst
  }
  
  func getFileName(_ file: String) throws -> String {
    let documentsDirectory = try getDocumentsDirectory()
    let fileName = "\(documentsDirectory)/\(file)"
    //NSLog("get file name \(fileName)")
    return fileName
  }
  
  func fileExists(_ fileName: String) throws -> String {
    let fileExists = try FileManager.default.fileExists(atPath: getFileName(fileName))
    if fileExists {
      NSLog("File exists \(fileName)")
      return "true"
    } else {
      NSLog("File DOES not exists \(fileName)")
      return "false"
    }
  }
  
  func readFile(_ fileName: String) throws -> String {
    return try String(contentsOfFile: getFileName(fileName), encoding: .utf8)
  }

  func writeFile(_ fileName: String, fileBase64EncodedString: String) throws {
    try fileBase64EncodedString.write(toFile: getFileName(fileName), atomically: true, encoding: .utf8)
  }

  func deleteFile(_ fileName: String) throws {
    try FileManager.default.removeItem(atPath: getFileName(fileName))
  }
  
  @objc(walletExists:reject:)
  func walletExists(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      resolve(try fileExists(Constants.WalletFileName.rawValue))
    } catch {
      NSLog("wallet exists error: \(error.localizedDescription)")
      resolve("false")
    }
  }

  @objc(walletBackupExists:reject:)
  func walletBackupExists(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      resolve(try fileExists(Constants.WalletBackupFileName.rawValue))
    } catch {
      NSLog("wallet backup exists error: \(error.localizedDescription)")
      resolve("false")
    }
  }

  func saveWalletFile(_ base64EncodedString: String) throws {
    do {
      try writeFile(Constants.WalletFileName.rawValue, fileBase64EncodedString: base64EncodedString)
    } catch {
      throw FileError.writeFileError("Error writting wallet file error: \(error.localizedDescription)")
    }
  }
  
  func saveWalletBackupFile(_ base64EncodedString: String) throws {
    do {
      try writeFile(Constants.WalletBackupFileName.rawValue, fileBase64EncodedString: base64EncodedString)
    } catch {
      throw FileError.writeFileError("Error writting wallet backup file error: \(error.localizedDescription)")
    }
  }

  func saveBackgroundFile(_ jsonString: String) throws {
    do {
      // the content of this JSON can be represented safely in utf8.
      try jsonString.write(toFile: getFileName(Constants.BackgroundFileName.rawValue), atomically: true, encoding: .utf8)
    } catch {
      throw FileError.writeFileError("Error writting background file error: \(error.localizedDescription)")
    }
  }

  func readWalletUtf8String() throws -> String {
    do {
      return try readFile(Constants.WalletFileName.rawValue)
    } catch {
      throw FileError.readWalletError("Error reading wallet format error: \(error.localizedDescription)")
    }
  }

  func readWalletBackup() throws -> String {
    do {
      return try readFile(Constants.WalletBackupFileName.rawValue)
    } catch {
      throw FileError.readWalletError("Error reading wallet backup format error: \(error.localizedDescription)")
    }
  }

  func fnDeleteExistingWallet() throws {
    do {
      try deleteFile(Constants.WalletFileName.rawValue)
    } catch {
      throw FileError.deleteFileError("Error deleting wallet error: \(error.localizedDescription)")
    }
  }

  @objc(deleteExistingWallet:reject:)
  func deleteExistingWallet(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      if try fileExists(Constants.WalletFileName.rawValue) == "true" {
        try self.fnDeleteExistingWallet()
        resolve("true")
      } else {
        resolve("false")
      }
    } catch {
      NSLog("\(error.localizedDescription)")
      resolve("false")
    }
  }
  
  func fnDeleteExistingWalletBackup() throws {
    do {
      try deleteFile(Constants.WalletBackupFileName.rawValue)
    } catch {
      throw FileError.deleteFileError("Error deleting wallet backup error: \(error.localizedDescription)")
    }
  }

  @objc(deleteExistingWalletBackup:reject:)
  func deleteExistingWalletBackup(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      if try fileExists(Constants.WalletBackupFileName.rawValue) == "true" {
        try self.fnDeleteExistingWalletBackup()
        resolve("true")
      } else {
        resolve("false")
      }
    } catch {
      NSLog("\(error.localizedDescription)")
      resolve("false")
    }
  }

  func saveWalletInternal() throws {
    let walletEncodedString = saveToB64()
    if !walletEncodedString.lowercased().hasPrefix(Constants.ErrorPrefix.rawValue) {
      try self.saveWalletFile(walletEncodedString)
    } else {
      throw FileError.saveFileError("Error saving wallet error: \(walletEncodedString)")
    }
  }

  func saveWalletBackupInternal() throws {
    let walletString = try readWalletUtf8String()
    try self.saveWalletBackupFile(walletString)
  }

  func fnCreateNewWallet(server: String, chainhint: String) throws -> String {
    let seed = initNew(serveruri: server, datadir: try getDocumentsDirectory(), chainhint: chainhint, monitorMempool: true)
    let seedStr = String(seed)
    if !seedStr.lowercased().hasPrefix(Constants.ErrorPrefix.rawValue) {
      try self.saveWalletInternal()
    }
    return seedStr
  }

  @objc(createNewWallet:chainhint:resolve:reject:)
  func createNewWallet(_ server: String, chainhint: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      let seedStr = try self.fnCreateNewWallet(server: server, chainhint: chainhint)
      resolve(seedStr)
    } catch {
      let err = "Error: [Native] Creating a new wallet. \(error.localizedDescription)"
      NSLog(err)
      resolve(err)
    }
  }
  
  func fnRestoreWalletFromSeed(server: String, chainhint: String, restoreSeed: String, birthday: String) throws -> String {
    let seed = initFromSeed(serveruri: server, seed: restoreSeed, birthday: UInt64(birthday) ?? 0, datadir: try getDocumentsDirectory(), chainhint: chainhint, monitorMempool: true)
    let seedStr = String(seed)
    if !seedStr.lowercased().hasPrefix(Constants.ErrorPrefix.rawValue) {
      try self.saveWalletInternal()
    }
    return seedStr
  }

  @objc(restoreWalletFromSeed:birthday:server:chainhint:resolve:reject:)
  func restoreWalletFromSeed(_ restoreSeed: String, birthday: String, server: String, chainhint: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      let seedStr = try self.fnRestoreWalletFromSeed(server: server, chainhint: chainhint, restoreSeed: restoreSeed, birthday: birthday)
      resolve(seedStr)
    } catch {
      let err = "Error: [Native] Restoring a wallet with seed. \(error.localizedDescription)"
      NSLog(err)
      resolve(err)
    }
  }
  
  func fnRestoreWalletFromUfvk(server: String, chainhint: String, restoreUfvk: String, birthday: String) throws -> String {
    let ufvk = initFromUfvk(serveruri: server, ufvk: restoreUfvk, birthday: UInt64(birthday) ?? 0, datadir: try getDocumentsDirectory(), chainhint: chainhint, monitorMempool: true)
    let ufvkStr = String(ufvk)
    if !ufvkStr.lowercased().hasPrefix(Constants.ErrorPrefix.rawValue) {
      try self.saveWalletInternal()
    }
    return ufvkStr
  }

  @objc(restoreWalletFromUfvk:birthday:server:chainhint:resolve:reject:)
  func restoreWalletFromUfvk(_ restoreUfvk: String, birthday: String, server: String, chainhint: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      let ufvkStr = try self.fnRestoreWalletFromUfvk(server: server, chainhint: chainhint, restoreUfvk: restoreUfvk, birthday: birthday)
      resolve(ufvkStr)
    } catch {
      let err = "Error: [Native] Restoring a wallet with ufvk. \(error.localizedDescription)"
      NSLog(err)
      resolve(err)
    }
  }

  func fnLoadExistingWallet(server: String, chainhint: String) throws -> String {
    let seed = initFromB64(serveruri: server, datab64: try self.readWalletUtf8String(), datadir: try getDocumentsDirectory(), chainhint: chainhint, monitorMempool: true)
    let seedStr = String(seed)
    return seedStr
  }

  @objc(loadExistingWallet:chainhint:resolve:reject:)
  func loadExistingWallet(_ server: String, chainhint: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      let seedStr = try self.fnLoadExistingWallet(server: server, chainhint: chainhint)
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
      if method == "sync" && !respStr.lowercased().hasPrefix(Constants.ErrorPrefix.rawValue) {
        // Also save the wallet after sync
        do {
          try self.saveWalletInternal()
        } catch {
          let err = "Error: [Native] Executing command. Saving wallet. \(error.localizedDescription)"
          NSLog(err)
          resolve(err)
        }
      }
      resolve(respStr)
    } else {
      let err = "Error: [Native] Executing command. Command argument problem."
      NSLog(err)
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        resolve(err)
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

  func fnGetLatestBlock(_ dict: [AnyHashable: Any]) {
    if let server = dict["server"] as? String,
       let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
      let resp = getLatestBlockServer(serveruri: server)
      let respStr = String(resp)
      resolve(respStr)
    } else {
      let err = "Error: [Native] Getting server latest block. Argument problem."
      NSLog(err)
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          resolve(err)
      }
    }
  }
  
  @objc(getLatestBlock:resolve:reject:)
  func getLatestBlock(_ server: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["server": server, "resolve": resolve]
       DispatchQueue.global().async { [weak self] in
          if let self = self {
              self.fnGetLatestBlock(dict)
          }
      }
  }

  func fnGetDonationAddress(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          let resp = getDeveloperDonationAddress()
          let respStr = String(resp)
          resolve(respStr)
      } else {
        let err = "Error: [Native] Getting developer donation address. Command arguments problem."
        NSLog(err)
        if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
              resolve(err)
          }
      }
  }
  
  @objc(getDonationAddress:reject:)
  func getDonationAddress(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      self.fnGetDonationAddress(dict)
  }

  func fnGetZenniesDonationAddress(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          let resp = getZenniesForZingoDonationAddress()
          let respStr = String(resp)
          resolve(respStr)
      } else {
        let err = "Error: [Native] Getting zennies donation address. Command arguments problem."
        NSLog(err)
        if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
              resolve(err)
          }
      }
  }
  
  @objc(getZenniesDonationAddress:reject:)
  func getZenniesDonationAddress(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      self.fnGetZenniesDonationAddress(dict)
  }

  @objc(getValueTransfersList:reject:)
  func getValueTransfersList(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      self.fnGetValueTransfersList(dict)
  }

  func fnGetValueTransfersList(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          let resp = getValueTransfers()
          let respStr = String(resp)
          resolve(respStr)
      } else {
          let err = "Error: [Native] Getting value transfers. Command arguments problem."
          NSLog(err)
          if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
              resolve(err)
          }
      }
  }

  @objc(getTransactionSummariesList:reject:)
  func getTransactionSummariesList(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      self.fnGetTransactionSummariesList(dict)
  }

  func fnGetTransactionSummariesList(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          let resp = getTransactionSummaries()
          let respStr = String(resp)
          resolve(respStr)
      } else {
          let err = "Error: [Native] Getting transaction summaries list. Command arguments problem."
          NSLog(err)
          if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
              resolve(err)
          }
      }
  }


}
