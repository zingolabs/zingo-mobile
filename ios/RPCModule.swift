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
  
  @objc(walletExists:rejecter:)
  func walletExists(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
      guard let documentsDirectory = paths.first else {
          //reject("1", "Error: directory not found", nil)
          return
      }

      let fileName = "\(documentsDirectory)/wallet.dat.txt"
      let fileExists = FileManager.default.fileExists(atPath: fileName)
      
      if fileExists {
          resolve("true")
      } else {
          resolve("false")
      }
  }

  @objc(walletBackupExists:rejecter:)
  func walletBackupExists(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
      guard let documentsDirectory = paths.first else {
          //reject("1", "No se pudo encontrar el directorio de documentos", nil)
          return
      }

      let fileName = "\(documentsDirectory)/wallet.backup.dat.txt"
      let fileExists = FileManager.default.fileExists(atPath: fileName)
      
      if fileExists {
          resolve("true")
      } else {
          resolve("false")
      }
  }

  func saveWalletFile(_ data: String) {
      let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
      guard let documentsDirectory = paths.first else {
          print("No se pudo encontrar el directorio de documentos")
          return
      }

      let fileName = "\(documentsDirectory)/wallet.dat.txt"
      do {
          try data.write(toFile: fileName, atomically: true, encoding: .utf8)
      } catch {
          print("Error al guardar la billetera:", error.localizedDescription)
      }
  }

  func saveWalletBackupFile(_ data: String) {
      let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
      guard let documentsDirectory = paths.first else {
          print("No se pudo encontrar el directorio de documentos")
          return
      }

      let fileName = "\(documentsDirectory)/wallet.backup.dat.txt"
      do {
          try data.write(toFile: fileName, atomically: true, encoding: .utf8)
      } catch {
          print("Error al guardar la copia de seguridad de la billetera:", error.localizedDescription)
      }
  }

  func saveBackgroundFile(_ data: String) {
      let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
      guard let documentsDirectory = paths.first else {
          print("Couldn't find the documents directory")
          return
      }

      let fileName = "\(documentsDirectory)/background.json"
      do {
          try data.write(toFile: fileName, atomically: true, encoding: .utf8)
      } catch {
          print("Couldn't save the file:", error.localizedDescription)
      }
  }

  func readWallet() -> String? {
      let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
      guard let documentsDirectory = paths.first else {
          print("Couldn't find the documents directory")
          return nil
      }

      let fileName = "\(documentsDirectory)/wallet.dat.txt"
      do {
          let content = try String(contentsOfFile: fileName, encoding: .utf8)
          return content
      } catch {
          print("Error reading file:", error.localizedDescription)
          return nil
      }
  }

  func readWalletBackup() -> String? {
      let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
      guard let documentsDirectory = paths.first else {
          print("Couldn't find the documents directory")
          return nil
      }

      let fileName = "\(documentsDirectory)/wallet.backup.dat.txt"
      do {
          let content = try String(contentsOfFile: fileName, encoding: .utf8)
          return content
      } catch {
          print("Error reading file:", error.localizedDescription)
          return nil
      }
  }

  func deleteExistingWallet() -> Bool {
      let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
      guard let documentsDirectory = paths.first else {
          print("Couldn't find the documents directory")
          return false
      }

      let fileName = "\(documentsDirectory)/wallet.dat.txt"
      do {
          try FileManager.default.removeItem(atPath: fileName)
          return true
      } catch {
          print("Error deleting wallet:", error.localizedDescription)
          return false
      }
  }

  @objc(deleteExistingWallet:rejecter:)
  func deleteExistingWallet(resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
      if deleteExistingWallet() {
          resolve("true")
      } else {
          resolve("false")
      }
  }

  @objc(deleteExistingWalletBackup:rejecter:)
  func deleteExistingWalletBackup(resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
      let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
      guard let documentsDirectory = paths.first else {
          print("Couldn't find the documents directory")
          resolve("false")
          return
      }

      let fileName = "\(documentsDirectory)/wallet.backup.dat.txt"
      do {
          try FileManager.default.removeItem(atPath: fileName)
          resolve("true")
      } catch {
          print("Error deleting backup wallet:", error.localizedDescription)
          resolve("false")
      }
  }

  func saveWalletInternal() {
      let walletDataStr = saveToB64()
      //rust_free(walletDat)
      saveWalletFile(walletDataStr)
  }

  func saveWalletBackupInternal() {
      if let walletDataStr = readWallet() {
          saveWalletBackupFile(walletDataStr)
      } else {
          print("Error: Unable to read wallet for backup")
      }
  }

  func createNewWallet(server: String, chainhint: String) -> String {
      autoreleasepool {
          let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
          guard let documentsDirectory = paths.first else {
              print("Couldn't find the documents directory")
              return "Error: Couldn't find documents directory"
          }

          let seed = initNew(serveruri: server, datadir: documentsDirectory, chainhint: chainhint, monitorMempool: true)
          let seedStr = String(seed)
          //rust_free(seed)

          if !seedStr.hasPrefix("Error") {
              saveWalletInternal()
          }

          return seedStr
      }
  }

  @objc(createNewWallet:chainhinter:resolver:rejecter:)
  func createNewWallet(server: String, chainhint: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global().async {
        let seedStr = self.createNewWallet(server: server, chainhint: chainhint)
          resolve(seedStr)
      }
  }

  @objc(restoreWalletFromSeed:birthdayer:chainhinter:serverer:resolver:rejecter:)
  func restoreWalletFromSeed(restoreSeed: String, birthday: String, server: String, chainhint: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global().async {
          let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
          guard let documentsDirectory = paths.first else {
              print("Couldn't find the documents directory")
              resolve("Error: Couldn't find documents directory")
              return
          }

        let seed = initFromSeed(serveruri: server, seed: restoreSeed, birthday: UInt64(birthday) ?? 0, datadir: documentsDirectory, chainhint: chainhint, monitorMempool: true)
          let seedStr = String(seed)
          //rust_free(seed)

          if !seedStr.hasPrefix("Error") {
            self.saveWalletInternal()
          }

          resolve(seedStr)
      }
  }

  @objc(restoreWalletFromUfvk:birthdayer:serverer:chainhinter:resolver:rejecter:)
  func restoreWalletFromUfvk(restoreUfvk: String, birthday: String, server: String, chainhint: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global().async {
          let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
          guard let documentsDirectory = paths.first else {
              print("Couldn't find the documents directory")
              resolve("Error: Couldn't find documents directory")
              return
          }

          let ufvk = initFromUfvk(serveruri: server, ufvk: restoreUfvk, birthday: UInt64(birthday) ?? 0, datadir: documentsDirectory, chainhint: chainhint, monitorMempool: true)
          let ufvkStr = String(ufvk)
          //rust_free(ufvk)

          if !ufvkStr.hasPrefix("Error") {
            self.saveWalletInternal()
          }

          resolve(ufvkStr)
      }
  }

  func loadExistingWallet(server: String, chainhint: String) -> String {
      autoreleasepool {
          // RCTLogInfo(@"loadExistingWallet called");
          let walletDataStr = readWallet()

          let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
          let documentsDirectory = paths[0]
          let seed = initFromB64(serveruri: server, datab64: walletDataStr!, datadir: documentsDirectory, chainhint: chainhint, monitorMempool: true)
          let seedStr = String(seed)
          //rust_free(seed)

          // RCTLogInfo(@"Seed: %@", seedStr);

          return seedStr
      }
  }

  @objc(loadExistingWallet:chainhinter:resolver:rejecter:)
  func loadExistingWallet(server: String, chainhint: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
      autoreleasepool {
          let seedStr = self.loadExistingWallet(server: server, chainhint: chainhint)
          resolve(seedStr)
      }
  }

  @objc(restoreExistingWalletBackup:rejecter:)
  func restoreExistingWalletBackup(resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
      autoreleasepool {
          // RCTLogInfo(@"rstoreExistingWallet backup called");
          let backupDataStr = self.readWalletBackup()
          let walletDataStr = self.readWallet()

          self.saveWalletFile(backupDataStr!)
          self.saveWalletBackupFile(walletDataStr!)

          resolve("true")
      }
  }

  @objc(doSave:rejecter:)
  func doSave(resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
      saveWalletInternal()
      resolve("true")
  }

  @objc(doSaveBackup:rejecter:)
  func doSaveBackup(resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
      saveWalletBackupInternal()
      resolve("true")
  }

  func doExecuteOnThread(_ dict: [String: Any]) {
      autoreleasepool {
          guard let method = dict["method"] as? String,
                let args = dict["args"] as? String,
                let resolve = dict["resolve"] as? RCTPromiseResolveBlock else {
              return
          }

          // RCTLogInfo(@"execute called with %@", method);

        let resp = executeCommand(cmd: method, args: args)
          let respStr = String(resp)
          //rust_free(resp)

          // RCTLogInfo(@"Got resp for execute (%@): %@", method, respStr);

          if method == "sync" && !respStr.hasPrefix("Error") {
              // Also save the wallet after sync
              saveWalletInternal()
          }

          resolve(respStr)
      }
  }

  @objc(execute:argser:resolver:rejecter:)
  func execute(method: String, args: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["method": method, "args": args, "resolve": resolve]
      DispatchQueue.global().async {
          self.doExecuteOnThread(dict)
      }
  }

  @objc(getLatestBlock:resolver:rejecter:)
  func getLatestBlock(server: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["server": server, "resolve": resolve]
      DispatchQueue.global().async {
          self.getLatestBlockAsync(dict)
      }
  }

  func getLatestBlockAsync(_ dict: [AnyHashable: Any]) {
      guard let server = dict["server"] as? String,
            let resolve = dict["resolve"] as? RCTPromiseResolveBlock else {
          return
      }

      let resp = getLatestBlockServer(serveruri: server)
      let respStr = String(resp)
      //rust_free(resp)

      resolve(respStr)
  }

}
